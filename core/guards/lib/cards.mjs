// Checks a card against the workflow's rules, so they're enforced by code and not only asked for.
// Used by `groundwork check`, `groundwork doctor` and the commit gate in run.mjs. Plain JavaScript
// with no imports beyond Node, because it runs inside a project's .groundwork/guards/ too.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

export const STATUSES = ["todo", "testing", "implementing", "built", "review", "awaiting-approval", "done", "rejected"];

// Cards are reread by every role, so they have a size budget. About four characters per token, the
// same estimate `groundwork doctor` uses; a test ties the two together so they can't drift.
export const CARD_TOKEN_LIMIT = 1500;
export const estimateCardTokens = (md) => Math.ceil(md.length / 4);

// What /gw-approve adds to History: the status line, "approved by human" and the human-checks line,
// about 150 characters. A card waiting for review or approval is measured with this room set aside,
// so one that passes `check` before the human approves still passes the commit gate after.
export const APPROVAL_RESERVE = 50;

// The one size rule, shared by `check`, `doctor` and the commit gate. Returns the problem, or undefined.
export function cardSizeProblem(md) {
  const status = frontmatter(md).status;
  const reserve = status === "review" || status === "awaiting-approval" ? APPROVAL_RESERVE : 0;
  const tokens = estimateCardTokens(md) + reserve;
  if (tokens <= CARD_TOKEN_LIMIT) return undefined;
  const counted = reserve > 0 ? ` counting the ≈${reserve} the approval lines will add` : "";
  return (
    `it's ≈${tokens} tokens${counted}, over ${CARD_TOKEN_LIMIT}: every role rereads it. Shorten each History and call: line to ` +
    "one sentence and move longer reasoning into an evidence file linked under Evidence; keep every call. The details belong in the evidence files"
  );
}

// The allowed status changes; .groundwork/reference/statuses.md documents each one.
export const TRANSITIONS = [
  ["todo", "testing"],
  ["testing", "implementing"],
  ["implementing", "review"],
  ["implementing", "testing"],
  ["review", "implementing"],
  ["review", "awaiting-approval"],
  ["review", "done"],
  ["awaiting-approval", "done"],
  ["awaiting-approval", "rejected"],
  ["done", "rejected"],
  ["rejected", "implementing"],
  // at-end mode: the runner builds each card itself, then one review covers them all.
  ["todo", "implementing"],
  ["implementing", "built"],
  ["built", "awaiting-approval"],
  ["built", "implementing"],
];

export function frontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2").trim();
  }
  return fields;
}

const withoutComments = (md) => md.replace(/<!--[\s\S]*?-->/g, "");

// A one-time migration record for cards that predate the approval rule. The hash is a snapshot of
// the card at migration time, so later edits lose the exemption. New cards are never exempt.
export const LEGACY = ".groundwork/.legacy-cards.json";
export const legacyFingerprint = (md) =>
  createHash("sha256").update(md.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")).digest("hex");

export function readLegacy(projectDir) {
  const path = resolve(projectDir, LEGACY);
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && parsed.version === 1 && parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {};
  } catch {
    return {};
  }
}

export function section(md, heading) {
  const start = md.search(new RegExp(`^## ${heading}\\s*$`, "m"));
  if (start === -1) return "";
  const bodyStart = md.indexOf("\n", start) + 1;
  const next = md.indexOf("\n## ", bodyStart);
  return withoutComments(md.slice(bodyStart, next === -1 ? undefined : next)).trim();
}

// Status changes recorded in History as "YYYY-MM-DD <from> → <to>: ...". Other lines are ignored.
export function historyMoves(md) {
  return [...section(md, "History").matchAll(/^- ?\d{4}-\d{2}-\d{2} ([\w-]+) (?:→|->) ([\w-]+)\b/gm)]
    .map((m) => [m[1], m[2]])
    .filter(([from, to]) => STATUSES.includes(from) && STATUSES.includes(to));
}

// Evidence files a card links to: .groundwork/evidence/... from the project, or ../evidence/... from the card.
export function evidenceLinks(md) {
  const links = [...section(md, "Evidence").matchAll(/(\.groundwork\/evidence\/|\.\.\/evidence\/)([^\s)\]`'"<>]+)/g)];
  return [...new Set(links.map((m) => `.groundwork/evidence/${m[2].replace(/[.,;:]+$/, "")}`))];
}

// Human checks: things only a person can see or judge (a Tab walk, a focus ring, narrow widths). The
// reviewer writes them as "- [ ] <what to open, do and see>"; confirmed ones are ticked with the
// date. Open items never block a commit or fail `groundwork check`: per-phase and at-end commit cards
// before the human has seen them.
export function humanChecks(md) {
  return section(md, "Human checks")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^- \[[ xX]\]\s*\S/.test(line))
    .map((line) => ({ text: line.replace(/^- \[[ xX]\]\s*/, "").trim(), checked: /^- \[[xX]\]/.test(line) }));
}

// Problems with one card, as plain sentences. `projectDir` is the folder that holds .groundwork/.
// `cardSize: false` skips the size problem when the caller checks size itself (`groundwork doctor`).
export function checkCard(md, { projectDir, approvalMode = "per-card", integration = "local", cardSize = true, legacy = false } = {}) {
  const fm = frontmatter(md);
  if (!fm.id) return ["it has no id in its frontmatter"];
  const problems = [];
  if (!STATUSES.includes(fm.status)) problems.push(`its status "${fm.status ?? ""}" isn't one of ${STATUSES.join(", ")}`);

  const size = cardSize ? cardSizeProblem(md) : undefined;
  if (size) problems.push(size);

  for (const [from, to] of historyMoves(md)) {
    if (!TRANSITIONS.some(([f, t]) => f === from && t === to)) {
      problems.push(`History moves it from ${from} to ${to}, which the workflow doesn't allow`);
    }
  }

  // A built card (at-end mode) has its test output but hasn't been reviewed, so its criteria aren't
  // ticked yet; the end review does that.
  if (fm.status === "built" || fm.status === "awaiting-approval" || fm.status === "done") {
    const evidence = section(md, "Evidence");
    if (evidence === "") problems.push(`it's ${fm.status}, but its Evidence section is empty`);
    for (const link of evidenceLinks(md)) {
      if (/[*?]/.test(link)) problems.push(`Evidence links to ${link}, which is a pattern. Patterns aren't checked: list each file.`);
      else if (!existsSync(resolve(projectDir, link))) problems.push(`Evidence links to ${link}, which doesn't exist`);
      else if (statSync(resolve(projectDir, link)).isFile() && statSync(resolve(projectDir, link)).size === 0)
        problems.push(`Evidence file ${link} is empty`);
    }
  }

  if (fm.status === "awaiting-approval" || fm.status === "done") {
    const criteria = section(md, "Acceptance criteria").split(/\r?\n/).filter((line) => /^- \[[ xX]\]/.test(line.trim()));
    if (criteria.every((line) => line.trim().replace(/^- \[[ xX]\]/, "").trim() === "")) {
      problems.push("it has no acceptance criteria");
    }
    // An unmet criterion is allowed only with the reason after it: "- [ ] ... — why".
    const unmet = criteria.filter((line) => /^- \[ \]\s*\S/.test(line.trim()) && !/ (—|--) \S/.test(line));
    if (unmet.length > 0) {
      problems.push(`${unmet.length} acceptance criteri${unmet.length === 1 ? "on isn't" : "a aren't"} checked, with no reason given after " — "`);
    }
  }

  // per-card and at-end both end with the human approving each card (at-end: all at once).
  // In a team project, PR review is the approval, so the local card line is not required.
  if (fm.status === "done" && approvalMode !== "per-phase" && integration !== "pr" && !legacy && !/^- ?\d{4}-\d{2}-\d{2} approved by human\b/im.test(section(md, "History"))) {
    problems.push('it\'s done, but History has no "approved by human" line');
  }
  return problems;
}

// Done cards committed and unchanged since: the commit gate won't see them again, so the size rule,
// which applies when a card is committed, doesn't either. Without Git, every card counts.
function committedUnchanged(projectDir) {
  const run = (args) => execFileSync("git", args, { cwd: projectDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  try {
    const tracked = run(["ls-files", "-z", "--", ".groundwork/cards"]).split(" ").filter(Boolean);
    const changed = new Set(run(["diff", "--name-only", "-z", "HEAD", "--", ".groundwork/cards"]).split(" ").filter(Boolean));
    const prefix = run(["rev-parse", "--show-prefix"]).trim();
    return new Set(tracked.filter((path) => !changed.has(prefix + path) && !changed.has(path)).map((path) => path.split("/").pop()));
  } catch {
    return new Set();
  }
}

// Every card in the project: [{ file, id, problems, openHumanChecks }].
export function checkCards(projectDir, approvalMode, options = {}) {
  const dir = join(projectDir, ".groundwork", "cards");
  if (!existsSync(dir)) return [];
  const legacy = readLegacy(projectDir);
  const settled = options.cardSize === false ? new Set() : committedUnchanged(projectDir);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const md = readFileSync(join(dir, name), "utf8");
      const id = frontmatter(md).id ?? name;
      return {
        file: name,
        id,
        problems: checkCard(md, {
          projectDir,
          approvalMode,
          ...options,
          cardSize: options.cardSize !== false && !(frontmatter(md).status === "done" && settled.has(name)),
          legacy: legacy[id] === legacyFingerprint(md),
        }),
        openHumanChecks: humanChecks(md).filter((check) => !check.checked).map((check) => check.text),
      };
    });
}

// The project folder for its .groundwork/guards/ folder.
export const projectOf = (guardsDir) => resolve(guardsDir, "..", "..");

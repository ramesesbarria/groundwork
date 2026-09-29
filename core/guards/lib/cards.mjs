// Checks a card against the workflow's rules, so they're enforced by code and not only asked for.
// Used by `groundwork check`, `groundwork doctor` and the commit gate in run.mjs. Plain JavaScript
// with no imports beyond Node, because it runs inside a project's .groundwork/guards/ too.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const STATUSES = ["todo", "testing", "implementing", "built", "review", "awaiting-approval", "done", "rejected"];

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

// Problems with one card, as plain sentences. `projectDir` is the folder that holds .groundwork/.
export function checkCard(md, { projectDir, approvalMode = "per-card" }) {
  const fm = frontmatter(md);
  if (!fm.id) return ["it has no id in its frontmatter"];
  const problems = [];
  if (!STATUSES.includes(fm.status)) problems.push(`its status "${fm.status ?? ""}" isn't one of ${STATUSES.join(", ")}`);

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
      if (!existsSync(resolve(projectDir, link))) problems.push(`Evidence links to ${link}, which doesn't exist`);
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
  if (fm.status === "done" && approvalMode !== "per-phase" && !/^- ?\d{4}-\d{2}-\d{2} approved by human\b/im.test(section(md, "History"))) {
    problems.push('it\'s done, but History has no "approved by human" line');
  }
  return problems;
}

// Every card in the project: [{ file, id, problems }].
export function checkCards(projectDir, approvalMode) {
  const dir = join(projectDir, ".groundwork", "cards");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const md = readFileSync(join(dir, name), "utf8");
      return { file: name, id: frontmatter(md).id ?? name, problems: checkCard(md, { projectDir, approvalMode }) };
    });
}

// The project folder for its .groundwork/guards/ folder.
export const projectOf = (guardsDir) => resolve(guardsDir, "..", "..");

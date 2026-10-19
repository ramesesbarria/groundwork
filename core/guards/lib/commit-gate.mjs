// Built-in check: a card is committed only when the workflow says it's finished and the human has
// explicitly approved the work they were shown.
//
// A card commit names its card in the configured format and must be `done`, pass `groundwork check`,
// and match a human approval record for that card. The record is bound to the reviewed HEAD, code
// diff, card content, evidence, spec, decisions and declared context. A commit with no card ID is
// blocked unless it uses an explicit non-card tag (`[no-card]`, `[quick]`, `[setup]`, `[plan]`,
// `[docs]`), and each tag only covers the kind of change it names. Omitting the ID, or relabelling
// card work with a tag, is therefore not a way around the gate.
//
// In at-end mode a `built` card may be committed as a checkpoint before the end review. Team projects
// (`integration: "pr"`) use PR review and required checks instead; local commits are checkpoints.
// Tools that do not record the human's own messages get the card checks only.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCard, frontmatter } from "./cards.mjs";
import { approvalMatches } from "./approval.mjs";

export const HUMAN_MARKER = ".groundwork/.approvals/last-human.json";

// Tools whose hooks record the human's messages. Claude Code always has its UserPromptSubmit hook.
// OpenCode's plugin writes RECORDER when its prompt hook first fires; a version without that hook
// never writes it, and those projects keep the card checks only rather than blocking every commit.
export const RECORDS_HUMAN = new Set(["claude-code"]);
export const RECORDER = ".groundwork/.approvals/records-human";

export function toolRecordsHuman(tool, project) {
  return RECORDS_HUMAN.has(tool) || (tool === "opencode" && existsSync(join(project, RECORDER)));
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The card ID in a commit message written in `format`, e.g. "[{id}] {title}". "quick" isn't a card.
export function cardIdIn(text, format = "[{id}] {title}") {
  const [before, after = ""] = format.split("{id}");
  // Only the literal text right next to the ID: "[" and "] " in "[{id}] {title}", " (" and ")" in
  // "feat: {title} ({id})". The title can be anything.
  const lead = escape(before.split("{title}").pop()).trimStart();
  const trail = escape(after.split("{title}")[0]);
  const match = text.match(new RegExp(`${lead}(\\d+(?:\\.\\d+)+)${trail}`));
  return match ? match[1] : undefined;
}

// The commit message itself: every -m/--message value plus any -F/--file message file. Scanning the
// whole shell command would let an unrelated word before `git commit` choose the tag or card.
export function commitText(command, cwd) {
  const messages = [];
  for (const match of command.matchAll(/(?:^|\s)(?:-m|--message)(?:\s+|=)(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g)) {
    messages.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  const file = command.match(/(?:^|\s)(?:-F|--file)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
  const path = file && (file[1] ?? file[2] ?? file[3]);
  if (path && path !== "-") {
    const abs = join(cwd, path);
    const target = existsSync(path) ? path : existsSync(abs) ? abs : undefined;
    if (target) {
      try {
        messages.push(readFileSync(target, "utf8"));
      } catch {
        // Unreadable message file: leave it out, so the gate sees no card and blocks.
      }
    }
  }
  return messages.join("\n");
}

const TAG = /\[(no-card|quick|setup|plan|docs)\]/i;

// The tag and the words after it, so [no-card] can require a reason.
export function commitTag(text) {
  const match = TAG.exec(text);
  if (!match) return undefined;
  const reason = text
    .slice(match.index + match[0].length)
    .match(/^\s+([^\r\n"'`]+)/)?.[1]
    ?.trim();
  return { name: match[1].toLowerCase(), reason: reason || "" };
}

// Files this commit would include: staged, unstaged and untracked, as git sees them now. The gate runs
// before the command, so a `git add -A && git commit` still lists its files here. Paths come back
// relative to the project even when it sits in a subdirectory of the repository.
export function changedPaths(project) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: project, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return []; // not a git repository: there is no commit for a tag to bypass
  }
  try {
    const prefix = execFileSync("git", ["rev-parse", "--show-prefix"], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const out = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 20 * 1024 * 1024,
    });
    const relative = (path) => (prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path);
    const entries = out.split("\0");
    const paths = [];
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (!entry) continue;
      const status = entry.slice(0, 2);
      const path = relative(entry.slice(3));
      if (path) paths.push(path);
      if (status.includes("R") || status.includes("C")) {
        const source = relative(entries[i + 1] ?? "");
        if (source) paths.push(source);
        i += 1;
      }
    }
    return [...new Set(paths)];
  } catch {
    return undefined;
  }
}

// A staged path whose working-tree content differs would commit something other than what the gate
// read and the human approved. Tell the runner to stage the reviewed version again.
function stagedMismatch(project) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: project, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return {}; // not a git repository: there is no commit to check
  }
  try {
    const staged = execFileSync("git", ["diff", "--cached", "--name-only", "-z", "--"], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).split("\0").filter(Boolean);
    if (staged.length === 0) return {};
    const unstaged = new Set(
      execFileSync("git", ["diff", "--name-only", "-z", "--"], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split("\0")
        .filter(Boolean),
    );
    return { path: staged.find((path) => unstaged.has(path)) };
  } catch {
    return { error: true };
  }
}

const lower = (path) => path.toLowerCase();
const CARD = /^\.groundwork\/cards\//;
const EVIDENCE = /^\.groundwork\/evidence\//;
const PRIVATE = /^\.groundwork\/private\//;
const KNOWLEDGE = /^(?:\.groundwork\/(?:SPEC\.md|decisions\/|work\/[^/]+\/context\.json$)|SPEC\.md$)/;
const HANDOFF = /^\.groundwork\/(?:HANDOFF\.md|work\/[^/]+\/HANDOFF\.md)$/;
const PLANNING = /^(?:\.groundwork\/(?:cards|decisions|work|SPEC\.md|HANDOFF\.md|JOURNAL\.md|LESSONS\.md)(?:\/|$)|PLAN\.md$|V1\.md$)/;
const SETUP = /^(?:\.groundwork\/|\.claude\/|\.opencode\/|AGENTS\.md$|CLAUDE\.md$|\.gitattributes$|\.gitignore$|\.npmrc$|\.nvmrc$|package(?:-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$|tsconfig\.json$)/;
const DOCS = /^(?:docs\/|site\/|(?:README|CONTRIBUTING|CHANGELOG|LICENSE)(?:\.[^/]*)?$|V1\.md$)/;

const list = (paths, limit = 2) =>
  paths.length <= limit ? paths.join(", ") : `${paths.slice(0, limit).join(", ")} and ${paths.length - limit} more`;

function headStatus(project, path) {
  try {
    const md = execFileSync("git", ["show", `HEAD:./${path}`], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return frontmatter(md).status;
  } catch {
    return undefined;
  }
}

function dependencyPaths(project) {
  const dir = join(project, ".groundwork", "work");
  if (!existsSync(dir)) return new Set();
  const normalize = (path) => path.split("\\").join("/").replace(/^\.\//, "").replace(/\/\.\//g, "/");
  const deps = new Set();
  const add = (path) => {
    const rel = normalize(path);
    if (rel && !rel.startsWith("../") && !rel.includes("/../")) deps.add(rel.toLowerCase());
  };
  for (const name of readdirSync(dir)) {
    const file = join(dir, name, "context.json");
    if (!existsSync(file)) continue;
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      for (const dep of Array.isArray(parsed?.deps) ? parsed.deps : []) {
        if (typeof dep?.path === "string" && dep.path) {
          add(dep.path);
        } else if (typeof dep?.ref === "string" && dep.ref.startsWith("decision:")) {
          const id = dep.ref.slice("decision:".length).trim();
          const match = readdirSync(join(project, ".groundwork", "decisions"))
            .filter((entry) => entry.endsWith(".md") && (entry === `${id}.md` || entry.startsWith(`${id}-`)))
            .sort()[0];
          if (match) add(`.groundwork/decisions/${match}`);
        } else if (typeof dep?.ref === "string" && dep.ref.startsWith("spec:")) {
          const path = dep.ref.slice("spec:".length).trim();
          for (const candidate of [path, `.groundwork/${path}`]) {
            if (existsSync(join(project, candidate))) {
              add(candidate);
              break;
            }
          }
        }
      }
    } catch {
      // `check` reports invalid context; the commit gate still blocks the context file itself.
    }
  }
  return deps;
}

// A non-card tag only bypasses the card gate for the kind of commit it names. [quick] may change code
// and docs, but not a card, its evidence, or the knowledge a card depends on: that is card work and
// must name its card. [no-card] needs a reason, and in at-end mode alone may carry the one commit that
// marks approved cards done.
function tagProblem(tag, project, config, tool) {
  const paths = changedPaths(project);
  if (paths === undefined) {
    return `Groundwork couldn't read the changed files, so [${tag.name}] can't be checked. Stage or commit from inside the repository.`;
  }
  if (paths.length === 0) {
    if (tag.name === "no-card" && !tag.reason) return "[no-card] needs a short reason, e.g. [no-card] housekeeping.";
    return undefined;
  }
  const privateFiles = paths.filter((path) => PRIVATE.test(lower(path)));
  if (privateFiles.length > 0) return `Groundwork's private files must stay out of git (${list(privateFiles)}).`;
  const outside = (allowed) => paths.filter((path) => !path.endsWith("/.gitkeep") && !allowed(lower(path)));
  const cardFiles = paths.filter((path) => CARD.test(lower(path)) && path.toLowerCase().endsWith(".md"));
  const evidenceFiles = paths.filter((path) => EVIDENCE.test(lower(path)) && !path.endsWith("/.gitkeep"));
  const knowledgeFiles = paths.filter((path) => KNOWLEDGE.test(lower(path)) && !path.endsWith("/.gitkeep"));
  const dependencies = dependencyPaths(project);
  const dependencyFiles = paths.filter((path) => dependencies.has(lower(path)) && !path.endsWith("/.gitkeep"));
  if (tag.name === "docs") {
    const bad = outside((path) => DOCS.test(path) || HANDOFF.test(path));
    if (bad.length > 0) return `[docs] is for documentation, but this commit also changes ${list(bad)}.`;
  }
  if (tag.name === "plan") {
    const bad = outside((path) => PLANNING.test(path) || HANDOFF.test(path));
    if (bad.length > 0) return `[plan] is for planning records, but this commit also changes ${list(bad)}.`;
    for (const path of cardFiles) {
      const abs = join(project, path);
      const md = existsSync(abs) ? readFileSync(abs, "utf8") : "";
      if ((md && frontmatter(md).status === "done") || headStatus(project, path) === "done") {
        return `[plan] can't change a done card (${path}); name the card and commit it as a card.`;
      }
    }
  }
  if (tag.name === "setup") {
    const bad = outside((path) => SETUP.test(path));
    if (bad.length > 0) return `[setup] is for project setup, but this commit also changes ${list(bad)}.`;
    const work = [
      ...cardFiles,
      ...evidenceFiles,
      ...dependencyFiles,
      ...paths.filter((path) => /^\.groundwork\/(?:work|decisions)\//.test(lower(path)) && !path.endsWith("/.gitkeep")),
    ];
    if (work.length > 0) return `[setup] is for setup files, not card, evidence or context work (${list(work)}). Name the card and approve it.`;
  }
  if (tag.name === "quick") {
    const bad = [...cardFiles, ...evidenceFiles, ...knowledgeFiles, ...dependencyFiles];
    if (bad.length > 0) {
      return `[quick] is for small changes without a card, but this commit changes ${list(bad)}. Name the card and approve it, or make a card.`;
    }
  }
  if (tag.name === "no-card") {
    if (!tag.reason) return "[no-card] needs a short reason, e.g. [no-card] housekeeping.";
    if (cardFiles.length > 0) {
      if (config.approvalMode !== "at-end" || !/^approve cards\b/i.test(tag.reason)) {
        return `[no-card] can't change card files (${list(cardFiles)}). Name the card in the commit and approve it.`;
      }
      for (const path of cardFiles) {
        if (!existsSync(join(project, path))) {
          return `[no-card] Approve cards can't delete a card (${path}); name the card and commit it as a card.`;
        }
        const md = readFileSync(join(project, path), "utf8");
        const id = frontmatter(md).id ?? path;
        const problems = checkCard(md, { projectDir: project, approvalMode: "at-end" });
        if (frontmatter(md).status !== "done") problems.unshift(`its status is "${frontmatter(md).status}", not done`);
        if (problems.length > 0) {
          return `[no-card] Approve cards can only carry approved, done cards; ${id}: ${problems.join("; ")}.`;
        }
        if (toolRecordsHuman(tool, project)) {
          const match = approvalMatches(project, id, md);
          if (!match.ok) {
            return `[no-card] Approve cards needs a human batch approval; ${id}: ${match.reason}. Ask the human to run /gw-approve all.`;
          }
        }
      }
    }
    const bad = [...evidenceFiles, ...knowledgeFiles, ...dependencyFiles];
    if (bad.length > 0) return `[no-card] can't change evidence or project knowledge (${list(bad)}). Use the card or a [plan] commit.`;
  }
  return undefined;
}

function findCard(project, id) {
  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return undefined;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const md = readFileSync(join(dir, name), "utf8");
    if (frontmatter(md).id === id) return md;
  }
  return undefined;
}

const WHEN = {
  "per-card": "In per-card mode a card is committed only after the human approves it with /gw-approve.",
  "per-phase": "In per-phase mode a card is committed once review passes and marks it done.",
  "at-end": "In at-end mode a card is committed once it's built with its test output saved, and again after the human approves.",
};

// The runner learns this by trial otherwise: the gate reads the card as it is before the command
// runs, so the status edit and the commit can't share one shell command.
const TWO_STEP = "Change the card first, then commit as a separate step: the gate reads the card as it is before the command runs.";

const NO_CARD =
  "This commit names no card. Use the card format, or an explicit non-card tag such as [no-card] <reason> " +
  "or [quick]. Omitting the card ID must not bypass the approval gate.";

export function commitGate(action, { project, config, tool }) {
  const mismatch = stagedMismatch(project);
  if (mismatch.error) return { block: true, reason: "Groundwork couldn't read Git's index, so the commit can't be checked. Fix the repository and try again." };
  if (mismatch.path) {
    return {
      block: true,
      reason: `The staged copy of ${mismatch.path} differs from the working tree, so the commit would not contain the reviewed version. Stage it again, then commit.`,
    };
  }
  const paths = changedPaths(project);
  if (paths === undefined) return { block: true, reason: "Groundwork couldn't read the changed files, so commits are blocked until the repository can be read." };
  if (paths.some((path) => PRIVATE.test(lower(path)))) {
    return { block: true, reason: "Groundwork's private files must stay out of git. Remove them from the commit." };
  }

  // Team projects use PR review and required checks for integration. Local task-branch commits are
  // checkpoints, so the card gate does not run here; only the general guards do.
  if (config.integration === "pr") return { block: false };

  const text = commitText(action.command, project);
  const id = cardIdIn(text, config.commitFormat);
  if (!id) {
    const tag = commitTag(text);
    if (tag) {
      const problem = tagProblem(tag, project, config, tool);
      return problem ? { block: true, reason: problem } : { block: false };
    }
    return { block: true, reason: NO_CARD };
  }

  const md = findCard(project, id);
  if (!md) return { block: true, reason: `This commit names card ${id}, but no card file has that id.` };

  if (paths) {
    const others = paths.filter((path) => CARD.test(lower(path)) && path.toLowerCase().endsWith(".md")).filter((path) => {
      try {
        return frontmatter(readFileSync(join(project, path), "utf8")).id !== id;
      } catch {
        return true;
      }
    });
    if (others.length > 0) {
      return { block: true, reason: `A card commit may only include card ${id}, but this one also changes ${list(others)}. Commit each card separately.` };
    }
    const otherEvidence = paths.filter(
      (path) => EVIDENCE.test(lower(path)) && !lower(path).startsWith(`.groundwork/evidence/${id.toLowerCase()}/`),
    );
    if (otherEvidence.length > 0) {
      return { block: true, reason: `A card commit may only include card ${id}'s evidence, but this one also changes ${list(otherEvidence)}.` };
    }
  }

  const approvalMode = config.approvalMode ?? "per-card";
  const status = frontmatter(md).status;
  const problems = checkCard(md, { projectDir: project, approvalMode });
  // at-end mode commits each card as a checkpoint once it's built, before the end review.
  const checkpoint = approvalMode === "at-end" && status === "built";
  if (status !== "done" && !checkpoint) {
    problems.unshift(`its status is "${status}", not ${approvalMode === "at-end" ? "built or done" : "done"}`);
  }
  if (problems.length > 0) {
    return { block: true, reason: `Card ${id} isn't ready to commit: ${problems.join("; ")}. ${WHEN[approvalMode] ?? WHEN["per-card"]} ${TWO_STEP}` };
  }

  if (!checkpoint && approvalMode !== "per-phase" && toolRecordsHuman(tool, project)) {
    const match = approvalMatches(project, id, md);
    if (!match.ok) {
      return {
        block: true,
        reason:
          `Card ${id} is ready, but ${match.reason}. Ordinary conversation, a rejection, or an agent-written ` +
          "card line does not count. Ask the human to run /gw-approve for this card.",
      };
    }
  }
  return { block: false };
}

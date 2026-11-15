// `checkpoint`: the CLI writes the facts, the agent writes only what it alone knows.
//
// Facts stamped into the handoff's frontmatter: time, HEAD, branch, uncommitted files, the writing
// tool, model and session when known, a fingerprint of the prose, and fingerprints of the memory it
// was written against. Facts appended to the journal: the commits and files since the last entry.
// The prose (Now, Next, Blockers, …) comes from the caller, or from an edit made to the file.
//
// One writer per handoff. The root handoff belongs to the main checkout's session; every parallel
// worker (a linked worktree, a task branch, a named subagent) gets .groundwork/work/<id>/HANDOFF.md.

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as git from "./git.mjs";
import { memoryDeps, renderDeps } from "./freshness.mjs";
import {
  SCHEMA,
  SECTIONS,
  acquireLock,
  bodyPrint,
  flowEnabled,
  handoffText,
  handoffView,
  isBlank,
  lastJournalHead,
  parseHandoff,
  readConfig,
  readState,
  readText,
  renderFrontmatter,
  renderHandoff,
  splitFrontmatter,
  toSections,
  withoutComments,
  writeAtomic,
  writeDecisionsIndex,
} from "./memory.mjs";

export const WORKER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// What a new install's handoff says under Now. While it does, nothing has been recorded.
export const PRISTINE_NOW = "Nothing recorded yet.";
// Two different sessions stamping the same handoff this close together are probably both alive.
const CONFLICT_WINDOW_MIN = 30;

export const workerSlug = (name) => String(name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[^A-Za-z0-9]+/, "") || "worker";

const workDir = (project) => join(project, ".groundwork", "work");
const workerHandoff = (project, id) => join(workDir(project), id, "HANDOFF.md");

// Which handoff this checkout writes and reads. In order: a named worker; a handoff already kept for
// this branch; a linked worktree (always a worker, so it never writes the root); else the root.
export function resolveHandoff(project, { worker, root = false } = {}) {
  const rootPath = join(project, ".groundwork", "HANDOFF.md");
  if (root) return { path: rootPath, worker: undefined };
  const named = worker ?? process.env.GROUNDWORK_WORKER;
  if (named) {
    if (!WORKER_ID.test(named)) throw new Error(`Worker id ${JSON.stringify(named)} isn't safe: use letters, digits, dots, dashes or underscores.`);
    return { path: workerHandoff(project, named), worker: named };
  }
  const branch = git.branch(project);
  if (branch) {
    const task = branch.match(/^gw\/(.+)$/)?.[1];
    for (const id of [workerSlug(branch), ...(task && WORKER_ID.test(task) ? [task] : [])]) {
      if (existsSync(workerHandoff(project, id))) return { path: workerHandoff(project, id), worker: id };
    }
  }
  const worktree = git.linkedWorktree(project);
  if (worktree) {
    const id = workerSlug(branch ?? worktree);
    return { path: workerHandoff(project, id), worker: id };
  }
  return { path: rootPath, worker: undefined };
}

export const isPristine = (handoff) => !handoff.meta.updated && (handoff.format === "empty" || handoffText(handoff, "Now") === PRISTINE_NOW);

const stampTime = (date) => date.toISOString().replace(/\.\d+Z$/, "Z");
const firstLine = (text, max = 160) => {
  const line = withoutComments(text).split("\n").find((l) => l.trim() !== "")?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

// What happened in git since the journal's last entry, asked once.
function journalDelta(project, from) {
  if (!from) return { kind: "first" };
  if (!git.isAncestor(project, from)) return { kind: "changed" };
  const { list, count } = git.commitsIn(project, `${from}..HEAD`, 20);
  return { kind: "commits", list, count, files: count > 0 ? git.changedFiles(project, from) : [] };
}

function journalEntry({ at, branch, head, tool, from, delta, view, note, repo }) {
  const title = [`${at.slice(0, 16).replace("T", " ")} UTC`, repo ? `${branch ?? "detached"} @ ${git.short(head)}` : "no git", tool].filter(Boolean).join(" · ");
  const lines = [`## ${title}`];
  if (repo && delta?.kind === "commits" && delta.count > 0) {
    lines.push(`- Commits (${delta.count}):`, ...delta.list.map((c) => `  - ${c.sha} ${c.subject}`));
    if (delta.count > delta.list.length) lines.push(`  - … ${delta.count - delta.list.length} more: git log ${git.short(from)}..${git.short(head)}`);
    if (delta.files.length > 0) lines.push(`- Files (${delta.files.length}): ${delta.files.slice(0, 15).join(", ")}${delta.files.length > 15 ? ", …" : ""}`);
  } else if (repo && delta?.kind === "changed") {
    lines.push(`- History changed: the last entry's commit ${git.short(from)} isn't behind this one (rebase, reset or branch switch).`);
  } else if (repo && delta?.kind === "first") {
    lines.push("- First checkpoint: earlier history is in `git log`.");
  }
  if (!isBlank(view.now)) lines.push(`- Now: ${firstLine(view.now)}`);
  if (!isBlank(view.next)) lines.push(`- Next: ${firstLine(view.next)}`);
  if (note) lines.push(`- Note: ${firstLine(note, 300)}`);
  return lines.length > 1 ? lines.join("\n") : undefined;
}

function appendJournal(groundwork, entry) {
  const path = join(groundwork, "JOURNAL.md");
  const current = readText(path) || "# Journal\n";
  writeAtomic(path, `${current.replace(/\r\n/g, "\n").trimEnd()}\n\n${entry}\n`);
}

// Saves the handoff. `sections` maps a section name to its new text; sections left out keep theirs.
// With `auto` (a hook, not a person), nothing is claimed that isn't known: an untouched handoff is
// not restamped at a newer commit, so it shows as behind instead of looking fresh.
export function checkpoint(project, options = {}) {
  const { sections = {}, auto = false, note } = options;
  const groundwork = join(project, ".groundwork");
  if (!existsSync(groundwork)) throw new Error("Groundwork isn't installed here.");
  const at = stampTime(options.now ?? new Date());
  const warnings = [];
  const release = acquireLock(groundwork);
  if (!release) {
    if (auto) return { wrote: false, journal: false, warnings: ["another checkpoint is running"], reason: "locked" };
    warnings.push("Another checkpoint was running and didn't finish in time; this one wrote anyway. Check the handoff.");
  }
  try {
    const config = readConfig(groundwork);
    const flow = flowEnabled(groundwork, config);
    const target = resolveHandoff(project, options);
    const existed = existsSync(target.path);
    const before = parseHandoff(readText(target.path));
    const meta = { ...before.meta };
    const next = toSections(before, { flow });

    const unknown = Object.keys(sections).filter((name) => !SECTIONS.includes(name));
    if (unknown.length > 0) throw new Error(`Unknown handoff section: ${unknown.join(", ")}. Sections: ${SECTIONS.join(", ")}.`);
    for (const [name, text] of Object.entries(sections)) {
      if (text === undefined) continue;
      next.find((s) => s.name === name).body = String(text).trim();
    }
    const gave = Object.values(sections).some((text) => text !== undefined);
    const print = bodyPrint(next);
    const pristine = isPristine(before);
    // A handoff that was never stamped has no fingerprint to compare: only prose given now counts as new.
    const proseChanged = meta.body === undefined ? gave : meta.body !== print;

    const { repo, head, branch, dirty } = git.snapshot(project);
    const moved = Boolean(head && meta.head && head !== meta.head);
    const view = handoffView({ ...before, sections: next, fields: {} });

    if (pristine && !gave) {
      return { wrote: false, journal: false, warnings, path: target.path, worker: target.worker, reason: "pristine", proseChanged: false, moved };
    }

    // Two sessions writing one handoff: say so, and say how to split them.
    // The session-start hook leaves a note of which session this checkout is in, so a checkpoint
    // typed by the agent (which doesn't know its own session id) is still attributed.
    const state = readState(groundwork);
    const recent = Boolean(state.at) && Date.parse(at) - Date.parse(state.at) < 12 * 3_600_000;
    const session = options.session ?? (recent ? state.session : undefined);
    const minutes = (Date.parse(at) - Date.parse(meta.updated ?? "")) / 60_000;
    if (session && meta.session && meta.session !== session && minutes >= 0 && minutes < CONFLICT_WINDOW_MIN) {
      const other = [meta.tool, meta.model].filter(Boolean).join("/") || "another session";
      warnings.push(
        `${other} (session ${meta.session}) stamped this handoff ${Math.round(minutes)} min ago. One writer per handoff: ` +
          "if both sessions are still working, give one its own with `groundwork checkpoint --worker <id>`.",
      );
    }

    let wrote = false;
    const restamp = !auto || proseChanged;
    if (restamp) {
      for (const key of ["tool", "model", "session"]) delete meta[key];
      const known = recent && session && state.session === session ? state : {};
      const stamped = {
        ...meta,
        schema: SCHEMA,
        updated: at,
        head,
        branch,
        dirty: repo ? (dirty?.length ?? 0) : undefined,
        tool: options.tool ?? known.tool,
        model: options.model ?? known.model,
        session,
        worker: target.worker,
        body: print,
        deps: renderDeps(memoryDeps(groundwork)),
      };
      if (target.worker && stamped.state === undefined) stamped.state = "active";
      const text = renderHandoff(stamped, next);
      if (text !== readText(target.path).replace(/\r\n/g, "\n")) {
        writeAtomic(target.path, text);
        wrote = true;
      }
      if (!auto && !proseChanged && moved) {
        warnings.push(
          `Stamped at ${git.short(head)}, but the handoff's text is the same as at ${git.short(meta.head)}. ` +
            "If Now or Next changed, pass --now/--next or edit the file, then checkpoint again.",
        );
      }
    }
    try {
      writeDecisionsIndex(groundwork);
    } catch {
      // the index is checked by doctor; a checkpoint never fails over it
    }

    // The journal has its own cursor, so commits are recorded even while the handoff's prose lags.
    let journal = false;
    if (!target.worker) {
      const from = lastJournalHead(readText(join(groundwork, "JOURNAL.md")));
      // HEAD is where the last entry was written: nothing happened, and git isn't asked.
      const delta = head && !(from && head.startsWith(from)) ? journalDelta(project, from) : undefined;
      const need = Boolean(note) || (!repo && wrote && !auto) || (delta !== undefined && (delta.kind !== "commits" || delta.count > 0));
      const entry = need ? journalEntry({ at, branch, head, tool: options.tool, from, delta, view, note, repo: repo && Boolean(head) }) : undefined;
      if (entry) {
        appendJournal(groundwork, entry);
        journal = true;
      }
    }
    return { wrote, created: wrote && !existed, journal, warnings, path: target.path, worker: target.worker, head, branch, updated: restamp ? at : meta.updated, proseChanged, moved, restamped: restamp && wrote };
  } finally {
    release?.();
  }
}

// ---------------------------------------------------------------- workers

const LEDGER_HEAD = [
  "# Worker ledger",
  "",
  "<!-- One line per event, appended by `groundwork worker`: this file is a log. Each worker's own state is in",
  "     work/<id>/HANDOFF.md, written only by that worker. -->",
  "",
  "| Worker | Date | Event | Detail | Commit |",
  "|---|---|---|---|---|",
  "",
].join("\n");

const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

function ledger(project, id, event, detail) {
  const path = join(workDir(project), "LEDGER.md");
  const current = (readText(path) || LEDGER_HEAD).replace(/\r\n/g, "\n").trimEnd();
  const row = `| ${cell(id)} | ${new Date().toISOString().slice(0, 10)} | ${event} | ${cell(detail)} | ${git.short(git.head(project))} |`;
  writeAtomic(path, `${current}\n${row}\n`);
}

// Rewrites the root handoff's "Workers in flight" section, keeping every other byte of its prose.
function setRootWorkers(project, change) {
  const groundwork = join(project, ".groundwork");
  const path = join(groundwork, "HANDOFF.md");
  const handoff = parseHandoff(readText(path));
  const sections = toSections(handoff, { flow: flowEnabled(groundwork) });
  const section = sections.find((s) => s.name === "Workers in flight");
  const lines = isBlank(section.body) ? [] : section.body.split("\n");
  section.body = change(lines).join("\n");
  writeAtomic(path, renderHandoff(handoff.meta, sections));
}

const workerLine = (id) => new RegExp(`^- \`?${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\`?(?::|\\s|$)`);

function guardRoot(project, id) {
  if (!WORKER_ID.test(id ?? "")) throw new Error("Give the worker an id: letters, digits, dots, dashes or underscores.");
  if (!existsSync(join(project, ".groundwork"))) throw new Error("Groundwork isn't installed here.");
  if (git.linkedWorktree(project)) {
    throw new Error("Workers are recorded from the main checkout, which owns the root handoff. A worker only writes its own: `groundwork checkpoint`.");
  }
}

// Records a worker as in flight: a ledger line, and a line in the root handoff.
export function workerStart(project, id, { goal = "", branch } = {}) {
  guardRoot(project, id);
  const groundwork = join(project, ".groundwork");
  const release = acquireLock(groundwork);
  try {
    mkdirSync(workDir(project), { recursive: true });
    const where = branch ? ` (branch ${branch})` : "";
    setRootWorkers(project, (lines) => [...lines.filter((line) => !workerLine(id).test(line)), `- ${id}: ${goal || "no goal given"}${where}; state in \`.groundwork/work/${id}/HANDOFF.md\``]);
    ledger(project, id, "start", `${goal}${where}`);
  } finally {
    release?.();
  }
}

// Takes a worker out of flight: ledger line, root handoff line removed, its own handoff marked done.
export function workerDone(project, id, { outcome = "" } = {}) {
  guardRoot(project, id);
  const groundwork = join(project, ".groundwork");
  const release = acquireLock(groundwork);
  try {
    mkdirSync(workDir(project), { recursive: true });
    setRootWorkers(project, (lines) => lines.filter((line) => !workerLine(id).test(line)));
    ledger(project, id, "done", outcome);
    const own = workerHandoff(project, id);
    if (existsSync(own)) {
      const { meta, body } = splitFrontmatter(readText(own));
      writeAtomic(own, renderFrontmatter({ ...meta, state: "done" }) + body);
    }
  } finally {
    release?.();
  }
}

// Every worker handoff in this checkout, newest first.
export function listWorkers(project) {
  const dir = workDir(project);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "HANDOFF.md")))
    .map((entry) => {
      const handoff = parseHandoff(readText(join(dir, entry.name, "HANDOFF.md")));
      const view = handoffView(handoff);
      return {
        id: entry.name,
        state: handoff.meta.state === "done" ? "done" : "active",
        updated: handoff.meta.updated,
        branch: handoff.meta.branch,
        head: handoff.meta.head,
        tool: handoff.meta.tool,
        now: firstLine(view.now),
        next: firstLine(view.next),
        path: `.groundwork/work/${entry.name}/HANDOFF.md`,
      };
    })
    .sort((a, b) => String(b.updated ?? "").localeCompare(String(a.updated ?? "")));
}

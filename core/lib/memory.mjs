// Groundwork's project memory: the one place that reads and writes its files. The CLI and the hooks
// both import this module, so the handoff, decisions, lessons and journal have a single parser.
//
// Memory files, all inside .groundwork/:
//   HANDOFF.md          the current state: frontmatter stamped by `checkpoint`, prose sections by the agent
//   MAP.md              where things are in the codebase
//   decisions/*.md      one record per decision; DECISIONS.md is their generated index
//   LESSONS.md          notes and rules learned from mistakes
//   JOURNAL.md          one entry per checkpoint, derived from git
//   work/<id>/HANDOFF.md   one handoff per parallel worker; work/LEDGER.md logs them
//   archive/            what `compact` moved out of the loaded set

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, openSync, closeSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export const SCHEMA = 2;

// The handoff's sections, in the order they're written. "Flow" is only written when the flow is on.
export const SECTIONS = ["Now", "Next", "Blockers", "Failing checks", "Workers in flight", "Notes"];
export const FLOW_SECTION = "Flow";

// Frontmatter keys `checkpoint` stamps, in the order they're written. Unknown keys are kept after them.
export const STAMP_KEYS = ["schema", "updated", "head", "branch", "dirty", "tool", "model", "session", "worker", "state", "body", "deps"];

// Older and hand-rolled handoffs use bullet fields; these are the names each section answers to.
const ALIASES = {
  Now: ["Now", "In progress", "Current item", "Last step"],
  Next: ["Next", "Next step"],
  Blockers: ["Blockers", "Open questions", "Blocked on"],
  "Failing checks": ["Failing checks"],
  "Workers in flight": ["Workers in flight", "Workers"],
  Notes: ["Notes"],
};

// Estimated tokens per file that every resume loads or may load. `doctor` enforces them.
export const DEFAULT_BUDGETS = { brief: 1500, handoff: 600, map: 800, decisions: 600, lessons: 1200, journal: 2500 };
export const DEFAULT_STALE_DAYS = 14;

// About 4 characters per token: a budget guide, not a tokenizer.
export const estimateTokens = (text) => Math.ceil(String(text ?? "").length / 4);

const normalize = (text) => String(text ?? "").replace(/^﻿/, "").replace(/\r\n/g, "\n");
// The same text gives the same fingerprint on every OS: no byte order mark, LF line endings.
export const fingerprint = (text) => createHash("sha256").update(normalize(text)).digest("hex");
export const shortPrint = (text) => fingerprint(text).slice(0, 12);

export const withoutComments = (md) => String(md ?? "").replace(/<!--[\s\S]*?-->/g, "");
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const isEmptyValue = (text) => /^(?:|—|-|none\.?|n\/a|nothing)$/i.test(withoutComments(text).trim());
export const isBlank = isEmptyValue;

export const parseJson = (text) => JSON.parse(String(text).replace(/^﻿/, ""));

// ---------------------------------------------------------------- frontmatter

function unquote(value) {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

const quote = (value) => (/^[\w./@+-][\w ./@+=:-]*$/.test(value) && !/:\s/.test(value) && !/\s$/.test(value) ? value : JSON.stringify(value));

// Flat "key: value" frontmatter, which is all Groundwork's files use. Returns { meta, body }.
export function splitFrontmatter(text) {
  const md = normalize(text);
  const match = md.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { meta: {}, body: md };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) meta[m[1]] = unquote(m[2].trim());
  }
  return { meta, body: md.slice(match[0].length) };
}

export function renderFrontmatter(meta, order = STAMP_KEYS) {
  const keys = [...order.filter((key) => key in meta), ...Object.keys(meta).filter((key) => !order.includes(key))];
  const lines = keys.filter((key) => meta[key] !== undefined && meta[key] !== null && meta[key] !== "").map((key) => `${key}: ${quote(String(meta[key]))}`);
  return ["---", ...lines, "---", ""].join("\n");
}

// ---------------------------------------------------------------- handoff

// A "- **Field:** value" bullet, with any indented lines under it.
function bulletFields(body) {
  const fields = {};
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (!m) continue;
    const value = [m[2]];
    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) value.push(lines[++i]);
    fields[m[1].trim()] = value.join("\n").trim();
  }
  return fields;
}

// Reads a handoff in either format: 2.0 (frontmatter and "## Section" blocks) or the 1.x bullet list.
export function parseHandoff(text) {
  const { meta, body } = splitFrontmatter(text);
  const sections = [];
  let preamble = [];
  let current;
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^(```|~~~)/.test(line)) fence = !fence;
    const heading = fence ? null : line.match(/^## +(.+?)\s*$/);
    if (heading) {
      current = { name: heading[1], lines: [] };
      sections.push(current);
    } else (current ? current.lines : preamble).push(line);
  }
  const fields = bulletFields(body);
  const known = sections.some((s) => SECTIONS.some((name) => name.toLowerCase() === s.name.toLowerCase()));
  const format = withoutComments(body).replace(/^# .*$/m, "").trim() === "" ? "empty" : known ? "sections" : Object.keys(fields).length > 0 ? "bullets" : "prose";
  return {
    meta,
    body,
    preamble: preamble.join("\n").trim(),
    sections: sections.map((s) => ({ name: s.name, body: s.lines.join("\n").trim() })),
    fields,
    format,
  };
}

const sectionOf = (handoff, name) => handoff.sections.find((s) => s.name.toLowerCase() === name.toLowerCase());

// One section's text, wherever this handoff keeps it: a "## Section", or a bullet under an older name.
export function handoffText(handoff, name) {
  const section = sectionOf(handoff, name);
  if (section) return withoutComments(section.body).trim();
  for (const alias of ALIASES[name] ?? [name]) if (handoff.fields[alias] !== undefined) return handoff.fields[alias];
  return "";
}

// The handoff as plain values, for `status`, `brief --json` and the checks.
export function handoffView(handoff) {
  return {
    now: handoffText(handoff, "Now"),
    next: handoffText(handoff, "Next"),
    blockers: handoffText(handoff, "Blockers"),
    failingChecks: handoffText(handoff, "Failing checks"),
    workers: handoffText(handoff, "Workers in flight"),
    notes: handoffText(handoff, "Notes"),
  };
}

const HANDOFF_COMMENT =
  "<!-- The current state, not a log: overwrite it. `groundwork checkpoint` stamps the block above with facts\n" +
  "     from git; you write only what git can't know. A fresh session, in any tool or model, continues from this. -->";

// The handoff in the 2.0 layout. Nothing is dropped: bullets that have no section of their own go
// under Flow (when the flow is on) or Notes, and sections Groundwork doesn't know stay at the end.
export function toSections(handoff, { flow = false } = {}) {
  const known = new Set([...SECTIONS, FLOW_SECTION].map((name) => name.toLowerCase()));
  const extras = handoff.sections.filter((s) => !known.has(s.name.toLowerCase()));
  const flowSection = sectionOf(handoff, FLOW_SECTION);
  const view = Object.fromEntries(SECTIONS.map((name) => [name, ""]));
  const flowLines = flowSection ? [flowSection.body] : [];

  if (handoff.format === "sections") {
    for (const name of SECTIONS) view[name] = sectionOf(handoff, name)?.body ?? "";
  } else if (handoff.format === "bullets") {
    // A 1.x handoff: bullets before the first heading. Each goes to its section; the rest are kept.
    const fields = bulletFields(handoff.preamble);
    const taken = new Set();
    for (const name of SECTIONS) {
      const alias = ALIASES[name].find((a) => fields[a] !== undefined && !taken.has(a));
      if (alias === undefined) continue;
      view[name] = fields[alias];
      taken.add(alias);
    }
    const rest = Object.entries(fields).filter(([name]) => !taken.has(name));
    const bullet = ([name, value]) => `- **${name}:** ${value}`;
    // With the flow on, the bullets left over are its own and go under Flow; otherwise under Notes.
    if (flow) flowLines.push(...rest.map(bullet));
    view.Notes = [view.Notes, ...(flow ? [] : rest.map(bullet))].filter((part) => part !== "").join("\n");
  } else if (handoff.format === "prose") {
    view.Notes = withoutComments(handoff.body).replace(/^# .*$/m, "").trim();
  }

  const out = SECTIONS.map((name) => ({ name, body: view[name] }));
  if (flow || flowSection) out.push({ name: FLOW_SECTION, body: flowLines.filter((part) => part.trim() !== "").join("\n") });
  return [...out, ...(handoff.format === "prose" ? [] : extras)];
}

const FILLED = new Set(SECTIONS.filter((name) => name !== "Notes"));

export function renderHandoff(meta, sections) {
  const blocks = sections.map((s) => `## ${s.name}\n${s.body.trim() === "" && FILLED.has(s.name) ? "none" : s.body.trim()}`.trimEnd());
  const body = ["# Handoff", "", HANDOFF_COMMENT, "", blocks.join("\n\n"), ""].join("\n");
  return renderFrontmatter(meta) + body;
}

// What `checkpoint` compares to tell whether the prose changed since it was last stamped.
export function bodyPrint(sections) {
  return shortPrint(sections.map((s) => `## ${s.name}\n${withoutComments(s.body).trim()}`).join("\n\n"));
}

// Sections Groundwork doesn't define: usually a log that grew inside the handoff.
export function extraSections(handoff) {
  const known = new Set([...SECTIONS, FLOW_SECTION].map((name) => name.toLowerCase()));
  return handoff.sections.filter((s) => !known.has(s.name.toLowerCase()));
}

// Problems with a handoff's shape, for `doctor`. [] means it is a valid 2.0 handoff.
export function validateHandoff(handoff) {
  const problems = [];
  if (handoff.format === "empty") return ["it is empty"];
  if (handoff.format !== "sections") problems.push("it isn't in the 2.0 layout (## Now, ## Next, …)");
  if (String(handoff.meta.schema ?? "") !== String(SCHEMA)) problems.push("it has no `schema: 2` stamp");
  if (!handoff.meta.updated || Number.isNaN(Date.parse(handoff.meta.updated))) problems.push("it has no `updated` time");
  for (const name of ["Now", "Next"]) if (handoff.format === "sections" && !sectionOf(handoff, name)) problems.push(`it has no "## ${name}" section`);
  if (handoff.meta.head !== undefined && !/^[0-9a-f]{7,40}$/.test(handoff.meta.head)) problems.push("its `head` isn't a commit hash");
  return problems;
}

// ---------------------------------------------------------------- config

export function readConfig(groundwork) {
  try {
    return parseJson(read(join(groundwork, "config.json")) || "{}");
  } catch {
    return {};
  }
}

export const budgetsOf = (config) => ({ ...DEFAULT_BUDGETS, ...(config?.budgets && typeof config.budgets === "object" ? config.budgets : {}) });
export const staleDaysOf = (config) => (Number.isFinite(config?.staleAfterDays) ? config.staleAfterDays : DEFAULT_STALE_DAYS);

// Whether the development flow is on. Installs from before 2.0 have no `flow` key and always had it.
export function flowEnabled(groundwork, config = readConfig(groundwork)) {
  if (typeof config.flow === "boolean") return config.flow;
  return existsSync(join(groundwork, "guards", "run.mjs")) || existsSync(join(groundwork, "workflow.md"));
}

// ---------------------------------------------------------------- decisions

export const DECISIONS_INDEX = "DECISIONS.md";
const INDEX_NOTE = "<!-- Generated by `groundwork index` from decisions/*.md. Don't edit: change the record, then run it again. -->";

function decisionsIn(dir, rel) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !/^(template|index|readme)\.md$/i.test(name))
    .sort()
    .map((name) => {
      const { meta } = splitFrontmatter(read(join(dir, name)));
      const id = meta.id ?? name.match(/^(\d+)/)?.[1] ?? name.replace(/\.md$/, "");
      const title = meta.title ?? name.replace(/\.md$/, "").replace(/^\d+-/, "").replace(/-/g, " ");
      const status = /\|/.test(meta.status ?? "") ? "proposed" : (meta.status ?? "proposed");
      return { id: String(id), title, status: status.toLowerCase(), date: meta.date ?? "", file: `${rel}/${name}`, supersededBy: meta.superseded_by };
    });
}

// Live decisions: every record in decisions/. `archived` are the superseded ones `compact` moved out.
export function readDecisions(groundwork) {
  return {
    live: decisionsIn(join(groundwork, "decisions"), "decisions"),
    archived: decisionsIn(join(groundwork, "archive", "decisions"), "archive/decisions"),
  };
}

const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export function renderDecisionsIndex({ live, archived }) {
  const lines = ["# Decisions", "", INDEX_NOTE, ""];
  if (live.length === 0) lines.push("No decisions recorded yet. Add one with `groundwork decide \"<title>\"`.");
  else {
    lines.push("| ID | Decision | Status | Date | Record |", "|---|---|---|---|---|");
    for (const d of live) lines.push(`| ${cell(d.id)} | ${cell(d.title)} | ${cell(d.status)} | ${cell(d.date)} | [${d.file.split("/").pop()}](${d.file}) |`);
  }
  if (archived.length > 0) lines.push("", `${archived.length} superseded decision${archived.length === 1 ? "" : "s"} archived in \`.groundwork/archive/decisions/\`.`);
  return lines.join("\n") + "\n";
}

// Rewrites DECISIONS.md if it differs. Returns whether it changed.
export function writeDecisionsIndex(groundwork) {
  const path = join(groundwork, DECISIONS_INDEX);
  const next = renderDecisionsIndex(readDecisions(groundwork));
  if (normalize(read(path)) === next) return false;
  writeAtomic(path, next);
  return true;
}

export const decisionsIndexInSync = (groundwork) => normalize(read(join(groundwork, DECISIONS_INDEX))) === renderDecisionsIndex(readDecisions(groundwork));

export const nextDecisionId = (groundwork) => {
  const { live, archived } = readDecisions(groundwork);
  const max = Math.max(0, ...[...live, ...archived].map((d) => Number.parseInt(d.id, 10) || 0));
  return String(max + 1).padStart(4, "0");
};

export const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "untitled";

// ---------------------------------------------------------------- lessons

// "### L-001 · Name" entries with their "- Level:" line.
export function readLessons(groundwork) {
  const text = withoutComments(read(join(groundwork, "LESSONS.md")));
  const lessons = [];
  const parts = text.split(/^### +/m).slice(1);
  for (const part of parts) {
    const [head, ...rest] = part.split("\n");
    const m = head.match(/^(L-\d+)\s*[·:–-]?\s*(.*)$/);
    if (!m) continue;
    const level = rest.join("\n").match(/^- Level:\s*(\w+)/m)?.[1]?.toUpperCase() ?? "NOTE";
    lessons.push({ id: m[1], title: m[2].trim(), level });
  }
  return lessons;
}

export const nextLessonId = (groundwork) => {
  const max = Math.max(0, ...readLessons(groundwork).map((l) => Number.parseInt(l.id.slice(2), 10) || 0));
  return `L-${String(max + 1).padStart(3, "0")}`;
};

// ---------------------------------------------------------------- journal

// Splits a journal into its heading text and "## " entries, oldest first.
export function parseJournal(text) {
  const md = normalize(text);
  const first = md.search(/^## /m);
  if (first === -1) return { head: md.trimEnd(), entries: [] };
  const entries = md
    .slice(first)
    .split(/^(?=## )/m)
    .map((entry) => entry.trimEnd())
    .filter((entry) => withoutComments(entry).trim() !== "");
  return { head: md.slice(0, first).trimEnd(), entries };
}

export const renderJournal = ({ head, entries }) => [head, ...entries].filter((part) => part !== "").join("\n\n") + "\n";

// The commit the newest checkpoint entry was written at, so the next entry starts after it.
export function lastJournalHead(text) {
  const { entries } = parseJournal(withoutComments(text));
  for (const entry of [...entries].reverse()) {
    const m = entry.split("\n")[0].match(/@ ([0-9a-f]{7,40})\b/);
    if (m) return m[1];
  }
  return undefined;
}

// ---------------------------------------------------------------- map

// Paths the map names in backticks that no longer exist: the cheapest sign that it has drifted.
export function missingMapPaths(project, mapText) {
  const missing = [];
  for (const m of withoutComments(mapText).matchAll(/`([^`\s]+)`/g)) {
    const path = m[1].replace(/[:,.]$/, "");
    if (!/[/\\]|\.\w{1,5}$/.test(path) || /[<>{}*$|]|^https?:|^\.groundwork\/|^-|^@/.test(path) || /\s/.test(path)) continue;
    if (!existsSync(join(project, path)) && !missing.includes(path)) missing.push(path);
  }
  return missing;
}

export const isTemplate = (text) => /\{\{\w+\}\}/.test(text);

// A map with something in it besides headings and the template's comments.
export const mapFilled = (text) => !isTemplate(text) && withoutComments(text).split("\n").some((line) => line.trim() !== "" && !line.startsWith("#"));

// ---------------------------------------------------------------- files

// Write through a temporary file in the same folder, so a reader never sees half a file.
export function writeAtomic(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  writeFileSync(temp, content);
  try {
    renameSync(temp, path);
  } catch {
    // Windows refuses to rename over a file another process holds open: write in place instead.
    writeFileSync(path, content);
    rmSync(temp, { force: true });
  }
}

// One writer at a time. A lock older than `staleMs` was left by a process that died. Returns a
// release function, or undefined when another writer holds the lock.
export function acquireLock(groundwork, { staleMs = 15_000, waitMs = 2_000 } = {}) {
  const path = join(groundwork, ".lock");
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      const fd = openSync(path, "wx");
      writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      closeSync(fd);
      return () => rmSync(path, { force: true });
    } catch {
      try {
        if (Date.now() - statSync(path).mtimeMs > staleMs) {
          rmSync(path, { force: true });
          continue;
        }
      } catch {
        continue; // the holder just released it
      }
      if (Date.now() > deadline) return undefined;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}

// Local, uncommitted notes between hook runs: which session is writing, and what was already asked.
const STATE = ".state.json";
export function readState(groundwork) {
  try {
    return parseJson(read(join(groundwork, STATE)) || "{}");
  } catch {
    return {};
  }
}
export function writeState(groundwork, state) {
  try {
    writeAtomic(join(groundwork, STATE), JSON.stringify(state, null, 2) + "\n");
  } catch {
    // best effort: state only saves a repeated reminder
  }
}

export const readText = read;

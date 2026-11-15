// `brief`: everything an agent needs to resume, in one text that fits a token budget. Any tool can
// run it; the session-start hook prints it. It reads files and git, and writes nothing.

import { existsSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { assess, describe } from "./freshness.mjs";
import { isPristine, listWorkers, resolveHandoff } from "./checkpoint.mjs";
import {
  budgetsOf,
  estimateTokens,
  flowEnabled,
  handoffView,
  isBlank,
  isTemplate,
  missingMapPaths,
  parseHandoff,
  readConfig,
  readDecisions,
  readLessons,
  readText,
  staleDaysOf,
  withoutComments,
} from "./memory.mjs";

const SAVE = 'npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"';

// Cuts text to a token allowance on a line boundary, and says where the rest is.
export function fit(text, tokens, pointer) {
  const max = Math.max(0, Math.floor(tokens * 4));
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = cut.lastIndexOf("\n");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trimEnd()}\n… (cut to fit; the rest is in ${pointer})`;
}

// The map without its comments and empty headings: what it says, not how it's laid out.
function mapSummary(text) {
  const lines = withoutComments(text).split("\n").map((line) => line.trimEnd());
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^# /.test(line)) continue;
    if (/^#{2,} /.test(line)) {
      const next = lines.slice(i + 1).find((l) => l.trim() !== "");
      if (next === undefined || /^#{2,} /.test(next)) continue; // a heading with nothing under it
    }
    if (line.trim() === "" && (kept.length === 0 || kept.at(-1) === "")) continue;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

// The flow, when it's installed and on, adds its own lines. The file isn't part of the context layer.
async function addOn(groundwork, project, handoff) {
  const file = join(groundwork, "guards", "lib", "orientation.mjs");
  if (!existsSync(file)) return undefined;
  try {
    const { flowBrief } = await import(pathToFileURL(file).href);
    return typeof flowBrief === "function" ? flowBrief(project, handoff) : undefined;
  } catch {
    return undefined;
  }
}

// Returns { text, json }. `text` is "" outside a Groundwork project.
export async function brief(project, options = {}) {
  const groundwork = join(project, ".groundwork");
  if (!existsSync(groundwork)) return { text: "", json: undefined };
  const config = readConfig(groundwork);
  const budgets = budgetsOf(config);
  const budget = Number.isFinite(options.budget) && options.budget > 0 ? options.budget : budgets.brief;
  const flow = flowEnabled(groundwork, config);

  let target;
  try {
    target = resolveHandoff(project, options);
  } catch (error) {
    return { text: `Groundwork: ${error.message}`, json: { error: error.message } };
  }
  const rel = relative(project, target.path).split("\\").join("/");
  const present = existsSync(target.path);
  const handoff = parseHandoff(readText(target.path));
  const view = handoffView(handoff);
  const pristine = !present || isPristine(handoff);
  const freshness = assess(project, handoff, { now: options.now, staleAfterDays: staleDaysOf(config), groundwork });
  const { live, archived } = readDecisions(groundwork);
  const decisions = live.filter((d) => d.status !== "superseded");
  const lessons = readLessons(groundwork);
  const rules = lessons.filter((l) => l.level !== "NOTE");
  const mapText = readText(join(groundwork, "MAP.md"));
  const mapFilled = mapText !== "" && !isTemplate(mapText) && mapSummary(mapText) !== "";
  const missing = mapFilled ? missingMapPaths(project, mapText) : [];
  const workers = target.worker ? [] : listWorkers(project).filter((w) => w.state === "active");
  const extra = flow ? await addOn(groundwork, project, handoff) : undefined;

  const head = [`# Project memory: ${basename(project)}${target.worker ? ` (worker ${target.worker})` : ""}`];
  if (!present) head.push(`Handoff: MISSING: ${rel} doesn't exist, so where things stand is unknown. Write it: ${SAVE}`);
  else if (pristine) head.push(`Handoff: EMPTY: nothing has been recorded in ${rel} yet. When there is something to resume, save it: ${SAVE}`);
  else head.push(...describe(freshness, handoff.meta));
  if (extra?.lines?.length) head.push(...extra.lines);

  // The handoff comes first and gets the largest share; what the other parts don't use isn't spent.
  const parts = [];
  if (present && !pristine) {
    const body =
      handoff.format === "sections"
        ? handoff.sections
            .filter((s) => !isBlank(s.body) || ["Now", "Next"].includes(s.name))
            .map((s) => `${s.name}: ${withoutComments(s.body).trim().includes("\n") ? "\n" : ""}${withoutComments(s.body).trim() || "none"}`)
            .join("\n")
        : withoutComments(handoff.body).replace(/^# .*$/m, "").trim();
    parts.push({ title: `Handoff (${rel})`, text: body, share: 0.45, pointer: rel });
  }
  if (workers.length > 0) {
    const text = workers.map((w) => `- ${w.id}${w.branch ? ` on ${w.branch}` : ""}${w.updated ? `, saved ${w.updated}` : ""}: ${w.next || w.now || "no next step recorded"} (${w.path})`).join("\n");
    parts.push({ title: "Workers in flight (each writes only its own handoff; verify before merging)", text, share: 0.1, pointer: ".groundwork/work/" });
  }
  if (decisions.length > 0) {
    const text = decisions.map((d) => `- ${d.id} ${d.title}${d.status === "accepted" ? "" : ` (${d.status})`}`).join("\n");
    parts.push({ title: "Decisions in force (records in .groundwork/decisions/; don't reopen without the human)", text, share: 0.2, pointer: ".groundwork/DECISIONS.md" });
  }
  if (lessons.length > 0) {
    const shown = rules.length > 0 ? rules : [];
    const notes = lessons.length - shown.length;
    const text = [...shown.map((l) => `- ${l.id} [${l.level}] ${l.title}`), ...(notes > 0 ? [`- ${notes} more note${notes === 1 ? "" : "s"} in .groundwork/LESSONS.md: read before reviewing or repeating a kind of work`] : [])].join("\n");
    parts.push({ title: "Rules and lessons", text, share: 0.15, pointer: ".groundwork/LESSONS.md" });
  }
  if (mapFilled) {
    const drift = missing.length > 0 ? `\n(The map names paths that no longer exist: ${missing.slice(0, 5).join(", ")}. Fix the map when you touch that area.)` : "";
    parts.push({ title: "Map (.groundwork/MAP.md)", text: mapSummary(mapText) + drift, share: 0.3, pointer: ".groundwork/MAP.md" });
  } else {
    parts.push({ title: "Map", text: "`.groundwork/MAP.md` isn't filled in yet. Fill it as you learn where things are: main folders, entry points, where tests live, traps.", share: 0.05, pointer: ".groundwork/MAP.md" });
  }

  const foot = extra?.foot ?? `Memory lives in .groundwork/ (how it works: .groundwork/memory.md). Before you stop or run low on context, save: ${SAVE}`;
  const fixed = estimateTokens([...head, foot].join("\n")) + parts.length * 30; // headings and "cut to fit" lines
  const left = Math.max(0, budget - fixed);
  const totalShare = parts.reduce((sum, p) => sum + p.share, 0) || 1;
  // Two passes: parts that need less than their share give the rest to the ones that need more.
  const need = parts.map((p) => estimateTokens(p.text));
  const grant = parts.map((p, i) => Math.min(need[i], Math.floor((left * p.share) / totalShare)));
  let spare = left - grant.reduce((a, b) => a + b, 0);
  for (let i = 0; i < parts.length && spare > 0; i++) {
    const more = Math.min(spare, need[i] - grant[i]);
    grant[i] += more;
    spare -= more;
  }
  const blocks = parts.map((p, i) => `## ${p.title}\n${fit(p.text, grant[i], p.pointer)}`);
  const text = [head.join("\n"), ...blocks, foot].join("\n\n");

  const json = {
    project: basename(project),
    flow,
    worker: target.worker ?? null,
    handoff: { path: rel, present, pristine, format: handoff.format, meta: handoff.meta, ...view, sections: Object.fromEntries(handoff.sections.map((s) => [s.name, s.body])) },
    freshness,
    decisions: { live: decisions, superseded: live.length - decisions.length, archived: archived.length },
    lessons,
    map: { path: ".groundwork/MAP.md", filled: mapFilled, missingPaths: missing },
    workers,
    ...(extra?.json ? { flowState: extra.json } : {}),
    budget,
    tokens: estimateTokens(text),
    text,
  };
  return { text, json };
}

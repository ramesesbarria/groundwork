// The commands that read and write project memory: brief, checkpoint, compact, index, decide, lesson
// and worker. Each is a thin wrapper: the work is in core/lib/, which the hooks run too.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { briefLib, checkpointLib, compactLib, memoryLib, NOT_INSTALLED, parseOptions } from "./memory.js";
import { locateCore } from "./init.js";
import type { Io, RunResult } from "./index.js";

type Cwd = Pick<Io, "cwd">;

const installed = (cwd: string) => existsSync(join(cwd, ".groundwork"));
const rel = (cwd: string, path: string) => relative(cwd, path).split("\\").join("/");
const fail = (error: unknown): RunResult => ({ code: 1, output: (error as Error).message });

// `groundwork brief [--json] [--budget <tokens>] [--worker <id>] [--root]`
export async function brief(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { values, flags, error } = parseOptions(args, { values: ["budget", "worker"], flags: ["json", "root"] });
  if (error) return { code: 1, output: error };
  const budget = values.budget === undefined ? undefined : Number.parseInt(values.budget, 10);
  if (values.budget !== undefined && !(Number.isFinite(budget) && (budget as number) > 0)) return { code: 1, output: "--budget needs a number of tokens, e.g. --budget 1200." };
  const { text, json } = await (await briefLib()).brief(io.cwd, { budget, worker: values.worker, root: flags.has("root") });
  return { code: 0, output: flags.has("json") ? JSON.stringify(json, null, 2) : text };
}

// The tool, when its shell says so. Claude Code sets CLAUDECODE=1 in the commands it runs.
const toolFromEnv = () => process.env.GROUNDWORK_TOOL ?? (process.env.CLAUDECODE === "1" ? "claude-code" : undefined);

const SECTION_FLAGS: Record<string, string> = {
  now: "Now",
  next: "Next",
  blockers: "Blockers",
  failing: "Failing checks",
  workers: "Workers in flight",
  notes: "Notes",
};

// `groundwork checkpoint [--now …] [--next …] [--blockers …] [--failing …] [--notes …] [--note …]
//    [--worker <id>] [--root] [--tool …] [--model …] [--session …] [--json]`
export async function checkpoint(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { values, flags, error } = parseOptions(args, {
    values: [...Object.keys(SECTION_FLAGS), "note", "worker", "tool", "model", "session"],
    flags: ["json", "root"],
  });
  if (error) return { code: 1, output: `${error}\nUsage: npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>" [--blockers …] [--failing …] [--notes …]` };
  const sections = Object.fromEntries(Object.entries(SECTION_FLAGS).filter(([flag]) => values[flag] !== undefined).map(([flag, name]) => [name, values[flag]]));
  let result;
  try {
    result = (await checkpointLib()).checkpoint(io.cwd, {
      sections,
      note: values.note,
      worker: values.worker,
      root: flags.has("root"),
      tool: values.tool ?? toolFromEnv(),
      model: values.model ?? process.env.GROUNDWORK_MODEL,
      session: values.session ?? process.env.GROUNDWORK_SESSION,
    });
  } catch (error) {
    return fail(error);
  }
  if (flags.has("json")) return { code: result.reason === "pristine" ? 1 : 0, output: JSON.stringify(result, null, 2) };
  if (result.reason === "pristine") {
    return {
      code: 1,
      output: 'Nothing to save yet: the handoff is still empty. Say where things stand: npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"',
    };
  }
  const where = result.head ? ` at ${result.head.slice(0, 7)}${result.branch ? ` on ${result.branch}` : ""}` : "";
  const lines = [
    `${result.wrote ? "Checkpoint saved" : "Checkpoint unchanged"}: ${rel(io.cwd, result.path ?? "")}${where}${result.worker ? ` (worker ${result.worker})` : ""}.`,
    ...(result.journal ? ["Journal: one entry added to .groundwork/JOURNAL.md."] : []),
    ...result.warnings.map((w) => `Warning: ${w}`),
  ];
  return { code: 0, output: lines.join("\n") };
}

// `groundwork compact [--dry-run]`
export async function compact(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { flags, error } = parseOptions(args, { flags: ["dry-run"] });
  if (error) return { code: 1, output: error };
  const dryRun = flags.has("dry-run");
  let lines: string[];
  try {
    lines = (await compactLib()).compact(io.cwd, { dryRun });
  } catch (error) {
    return fail(error);
  }
  if (lines.length === 0) return { code: 0, output: "Nothing to compact: the journal, decisions and handoff are within their budgets." };
  return {
    code: 0,
    output: [dryRun ? "Dry run: compacting would change:" : "Compacted project memory. Nothing was deleted; archived material is in .groundwork/archive/.", ...lines, ...(dryRun ? ["Nothing was written."] : [])].join("\n"),
  };
}

// `groundwork index [--check]`: regenerate .groundwork/DECISIONS.md from decisions/*.md.
export async function index(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { flags, error } = parseOptions(args, { flags: ["check"] });
  if (error) return { code: 1, output: error };
  const lib = await memoryLib();
  const groundwork = join(io.cwd, ".groundwork");
  const { live, archived } = lib.readDecisions(groundwork);
  const count = `${live.length} decision${live.length === 1 ? "" : "s"}${archived.length > 0 ? `, ${archived.length} archived` : ""}`;
  if (flags.has("check")) {
    return lib.decisionsIndexInSync(groundwork)
      ? { code: 0, output: `.groundwork/DECISIONS.md is in step with decisions/ (${count}).` }
      : { code: 1, output: ".groundwork/DECISIONS.md is out of step with decisions/. Run `npx groundwork-ai index`." };
  }
  const changed = lib.writeDecisionsIndex(groundwork);
  return { code: 0, output: `${changed ? "Updated" : "Already up to date:"} .groundwork/DECISIONS.md (${count}).` };
}

const today = () => new Date().toISOString().slice(0, 10);

// `groundwork decide "<title>" [--status proposed|accepted]`: a new numbered decision record.
export async function decide(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { values, rest, error } = parseOptions(args, { values: ["status"] });
  if (error) return { code: 1, output: error };
  const title = rest.join(" ").trim();
  if (title === "") return { code: 1, output: 'Usage: npx groundwork-ai decide "<title>" [--status proposed|accepted]' };
  const status = values.status ?? "proposed";
  if (!["proposed", "accepted", "superseded"].includes(status)) return { code: 1, output: `Unknown status: ${status}. Use proposed, accepted or superseded.` };
  const lib = await memoryLib();
  const groundwork = join(io.cwd, ".groundwork");
  const id = lib.nextDecisionId(groundwork);
  const own = join(groundwork, "templates", "decision.md");
  const template = readFileSync(existsSync(own) ? own : join(locateCore(), "templates", "decision.md"), "utf8");
  const text = template
    .replace(/\{\{id\}\}/g, id)
    .replace(/\{\{title\}\}/g, /[:#"']/.test(title) ? JSON.stringify(title) : title)
    .replace(/\{\{date\}\}/g, today())
    .replace(/^status: .*$/m, `status: ${status}`);
  const path = join(groundwork, "decisions", `${id}-${lib.slug(title)}.md`);
  mkdirSync(join(groundwork, "decisions"), { recursive: true });
  writeFileSync(path, text);
  lib.writeDecisionsIndex(groundwork);
  return {
    code: 0,
    output: `Created ${rel(io.cwd, path)} (${status}) and updated .groundwork/DECISIONS.md.\nFill in its Context, Options, Decision and Consequences${status === "proposed" ? "; set status to accepted once the human has chosen" : ""}.`,
  };
}

// `groundwork lesson "<name>" [--origin "<what went wrong>"] [--level NOTE|RULE]`: a new lesson entry.
export async function lesson(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { values, rest, error } = parseOptions(args, { values: ["origin", "level"] });
  if (error) return { code: 1, output: error };
  const name = rest.join(" ").trim();
  if (name === "") return { code: 1, output: 'Usage: npx groundwork-ai lesson "<short name>" --origin "<what went wrong, where>" [--level NOTE|RULE]' };
  const level = (values.level ?? "NOTE").toUpperCase();
  if (!["NOTE", "RULE", "GUARD"].includes(level)) return { code: 1, output: `Unknown level: ${level}. Use NOTE or RULE.` };
  const lib = await memoryLib();
  const groundwork = join(io.cwd, ".groundwork");
  const path = join(groundwork, "LESSONS.md");
  const id = lib.nextLessonId(groundwork);
  const current = existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n").trimEnd() : "# Lessons";
  const entry = [`### ${id} · ${name}`, `- Level: ${level}`, `- Origin: ${values.origin ?? "(say what went wrong, when and where)"} (${today()})`, `- History: ${level.toLowerCase()} (${today()})`].join("\n");
  lib.writeAtomic(path, `${current}\n\n${entry}\n`);
  return {
    code: 0,
    output: `Added ${id} to .groundwork/LESSONS.md as a ${level}.${level === "RULE" ? ` Copy it under Rules in AGENTS.md with its ID (${id}), so it is always in context.` : ""}`,
  };
}

const WORKER_USAGE = 'Usage: npx groundwork-ai worker start <id> [--goal "<goal>"] [--branch <branch>] | worker done <id> [--outcome "<what happened>"] | worker list [--json]';

// `groundwork worker start|done|list`: the main session's record of parallel workers.
export async function worker(args: string[], io: Cwd): Promise<RunResult> {
  if (!installed(io.cwd)) return { code: 1, output: NOT_INSTALLED };
  const { values, flags, rest, error } = parseOptions(args, { values: ["goal", "branch", "outcome"], flags: ["json"] });
  if (error) return { code: 1, output: `${error}\n${WORKER_USAGE}` };
  const [action, id] = rest;
  const lib = await checkpointLib();
  try {
    if (action === "list" || action === undefined) {
      const workers = lib.listWorkers(io.cwd);
      if (flags.has("json")) return { code: 0, output: JSON.stringify(workers, null, 2) };
      if (workers.length === 0) return { code: 0, output: "No worker handoffs in .groundwork/work/." };
      return {
        code: 0,
        output: workers.map((w) => `${w.id.padEnd(16)} ${w.state.padEnd(6)} ${(w.updated ?? "never saved").padEnd(20)} ${w.branch ?? "-"}  ${w.next || w.now || ""}`.trimEnd()).join("\n"),
      };
    }
    if (action === "start") {
      lib.workerStart(io.cwd, id, { goal: values.goal, branch: values.branch });
      return {
        code: 0,
        output:
          `Worker ${id} recorded: added to Workers in flight in .groundwork/HANDOFF.md and to .groundwork/work/LEDGER.md.\n` +
          `Tell the worker to save its own state with \`npx groundwork-ai checkpoint --worker ${id} --now "…" --next "…"\` (in a linked worktree, --worker isn't needed).`,
      };
    }
    if (action === "done") {
      lib.workerDone(io.cwd, id, { outcome: values.outcome });
      return { code: 0, output: `Worker ${id} closed: taken out of Workers in flight and logged in .groundwork/work/LEDGER.md.` };
    }
  } catch (error) {
    return fail(error);
  }
  return { code: 1, output: WORKER_USAGE };
}

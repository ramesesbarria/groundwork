import { createInterface } from "node:readline/promises";
import { init } from "./init.js";
import { status } from "./status.js";
import { adapter } from "./adapter.js";
import { doctor } from "./doctor.js";
import { check } from "./check.js";
import { mode } from "./mode.js";
import { retro } from "./retro.js";
import { reassess } from "./reassess.js";
import { migrate } from "./migrate.js";
import { upgrade } from "./upgrade.js";
import { uninstall } from "./uninstall.js";
import { flow } from "./flow.js";
import { brief, checkpoint, compact, decide, index, lesson, worker } from "./context-commands.js";
import { VERSION } from "./version.js";

export interface RunResult {
  code: number;
  output: string;
}

// Everything a command needs from the outside world, so tests can supply their own.
export interface Io {
  cwd: string;
  ask(question: string): Promise<string>;
  // Whether someone can answer `ask`. Without a terminal, `ask` returns "" (the default answer).
  interactive: boolean;
}

async function askTerminal(question: string): Promise<string> {
  if (!process.stdin.isTTY) return ""; // not interactive: take the default answer
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

// Project memory: what every install has.
const COMMANDS: Record<string, string> = {
  init: "Install Groundwork into this project: project memory, plus the flow with --flow (--adapter claude-code|opencode|none, --flow, --dry-run)",
  brief: "Print what an agent needs to resume: the handoff, how fresh it is against the repo, decisions, rules and the map, within a token budget (--json, --budget <tokens>, --worker <id>)",
  checkpoint: 'Save the handoff: stamps it with the commit, branch, time and writer, and adds the commits since the last one to the journal (--now "…" --next "…" [--blockers "…"] [--failing "…"] [--notes "…"] [--note "…"] [--worker <id>] [--json])',
  status: "Show where things stand: the handoff, its freshness and workers in flight; with the flow, cards by status and what's ready or blocked",
  decide: 'Create the next numbered decision record and update the index (decide "<title>" [--status proposed|accepted])',
  lesson: 'Add a lesson to LESSONS.md (lesson "<name>" --origin "<what went wrong>" [--level NOTE|RULE])',
  index: "Regenerate .groundwork/DECISIONS.md from the decision records (--check exits 1 when it's out of step)",
  worker: 'Record parallel workers, each with its own handoff (worker start <id> [--goal "…"] [--branch <b>] | worker done <id> [--outcome "…"] | worker list)',
  compact: "Move old journal entries, superseded decisions and logs that grew inside the handoff to .groundwork/archive/; nothing is deleted (--dry-run)",
  doctor: "Check the install, the memory files against their budgets, and the context token budget (exits 1 on problems)",
  upgrade: "Update this project's Groundwork files to this version; your handoff, decisions, lessons, spec, cards and edits stay (--dry-run, --yes)",
  adapter: "Add or refresh an AI tool adapter (adapter add claude-code|opencode)",
  flow: "Show, add or remove the optional development flow on top of project memory (flow [on|off] [--yes])",
  uninstall: "Remove what Groundwork added, keeping anything you changed; asks before deleting .groundwork/ (--dry-run, --keep-state)",
};

// The flow: only useful once it's on (`init --flow` or `flow on`).
const FLOW_COMMANDS: Record<string, string> = {
  mode: "Show or change when you approve: per-card, per-phase or at-end (mode [mode])",
  check: "Check cards against the workflow: evidence, criteria, status moves, approval, and task context (check [card-id...] [--base <ref>] [--task <id>]; exits 1 on problems)",
  reassess: "Record the local and upstream context versions a task has just been checked against (reassess <id> --target <ref> [--dep <ref>] [--drop <ref>])",
  migrate: "Record done cards that Git shows predate the approval rule; new or changed cards stay checked (migrate legacy [--dry-run] [--yes] [--reviewed])",
  retro: "Collect signals of repeated mistakes for a retro, which your agent runs (writes .groundwork/retro.md)",
};

function usage(): string {
  const width = Math.max(...[...Object.keys(COMMANDS), ...Object.keys(FLOW_COMMANDS)].map((c) => c.length));
  const lines = (commands: Record<string, string>) => Object.entries(commands).map(([cmd, desc]) => `  ${cmd.padEnd(width)}  ${desc}`);
  return [
    `groundwork ${VERSION}: project memory for coding agents. Any session, tool or model resumes where the last one stopped.`,
    "",
    "Usage: npx groundwork-ai <command>",
    "",
    "Commands:",
    ...lines(COMMANDS),
    "",
    "With the flow on (cards, roles, approval before each commit):",
    ...lines(FLOW_COMMANDS),
  ].join("\n");
}

export async function run(argv: string[], io: Partial<Io> = {}): Promise<RunResult> {
  const [cmd, ...args] = argv;
  if (cmd === undefined || cmd === "help" || cmd === "--help" || cmd === "-h") {
    return { code: 0, output: usage() };
  }
  if (cmd === "--version" || cmd === "-v") {
    return { code: 0, output: VERSION };
  }
  const fullIo: Io = {
    cwd: io.cwd ?? process.cwd(),
    ask: io.ask ?? askTerminal,
    interactive: io.interactive ?? (io.ask !== undefined || Boolean(process.stdin.isTTY)),
  };
  if (cmd === "init") return init(args, fullIo);
  if (cmd === "brief") return brief(args, fullIo);
  if (cmd === "checkpoint") return checkpoint(args, fullIo);
  if (cmd === "compact") return compact(args, fullIo);
  if (cmd === "index") return index(args, fullIo);
  if (cmd === "decide") return decide(args, fullIo);
  if (cmd === "lesson") return lesson(args, fullIo);
  if (cmd === "worker") return worker(args, fullIo);
  if (cmd === "flow") return flow(args, fullIo);
  if (cmd === "upgrade") return upgrade(args, fullIo);
  if (cmd === "status") return status(fullIo);
  if (cmd === "adapter") return adapter(args, fullIo);
  if (cmd === "doctor") return doctor(fullIo);
  if (cmd === "check") return check(args, fullIo);
  if (cmd === "reassess") return reassess(args, fullIo);
  if (cmd === "migrate") return migrate(args, fullIo);
  if (cmd === "mode") return mode(args, fullIo);
  if (cmd === "retro") return retro(fullIo);
  if (cmd === "uninstall") return uninstall(args, fullIo);
  return { code: 1, output: `Unknown command: ${cmd}\n\n${usage()}` };
}

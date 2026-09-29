import { createInterface } from "node:readline/promises";
import { init } from "./init.js";
import { status } from "./status.js";
import { adapter } from "./adapter.js";
import { doctor } from "./doctor.js";
import { check } from "./check.js";
import { mode } from "./mode.js";
import { retro } from "./retro.js";
import { upgrade } from "./upgrade.js";
import { uninstall } from "./uninstall.js";
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

const COMMANDS: Record<string, string> = {
  init: "Install Groundwork into this project (--adapter claude-code|opencode|none, --dry-run)",
  upgrade: "Update this project's Groundwork files to this version; your spec, cards, lessons and edits stay (--dry-run, --yes)",
  adapter: "Add or refresh an AI tool adapter (adapter add claude-code|opencode)",
  status: "Show the current phase, cards by status, and what's ready or blocked",
  doctor: "Check harness health and the context token budget (exits 1 on problems)",
  mode: "Show or change when you approve: per-card, per-phase or at-end (mode [mode])",
  check: "Check cards against the workflow: evidence, criteria, status moves, approval (check [card-id...]; exits 1 on problems)",
  retro: "Collect signals of repeated mistakes for /gw-retro (writes .groundwork/retro.md)",
  uninstall: "Remove what Groundwork added, keeping anything you changed; asks before deleting .groundwork/ (--dry-run, --keep-state)",
};

function usage(): string {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(width)}  ${desc}`);
  return [
    `groundwork ${VERSION}: a tool-agnostic workflow for building software with AI agents`,
    "",
    "Usage: npx groundwork-ai <command>",
    "",
    "Commands:",
    ...lines,
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
  if (cmd === "upgrade") return upgrade(args, fullIo);
  if (cmd === "status") return status(fullIo);
  if (cmd === "adapter") return adapter(args, fullIo);
  if (cmd === "doctor") return doctor(fullIo);
  if (cmd === "check") return check(args, fullIo);
  if (cmd === "mode") return mode(args, fullIo);
  if (cmd === "retro") return retro(fullIo);
  if (cmd === "uninstall") return uninstall(args, fullIo);
  return { code: 1, output: `Unknown command: ${cmd}\n\n${usage()}` };
}

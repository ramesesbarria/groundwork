import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { init } from "./init.js";

export interface RunResult {
  code: number;
  output: string;
}

// Everything a command needs from the outside world, so tests can supply their own.
export interface Io {
  cwd: string;
  ask(question: string): Promise<string>;
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

// Works from both src/ (tests) and dist/ (published): package.json is one level up.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

const COMMANDS: Record<string, string> = {
  init: "Install Groundwork into this project (--adapter claude-code|none, --dry-run)",
  adapter: "(planned) Add or refresh an AI tool adapter",
  status: "(planned) Show the current phase, card and checks",
  doctor: "(planned) Check harness health and the context token budget",
  retro: "(planned) Collect signals for /gw-retro from git and .groundwork/",
};

function usage(): string {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(width)}  ${desc}`);
  return [
    `groundwork ${pkg.version}: a tool-agnostic workflow for building software with AI agents`,
    "",
    "Usage: groundwork <command>",
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
    return { code: 0, output: pkg.version };
  }
  if (cmd === "init") {
    return init(args, { cwd: io.cwd ?? process.cwd(), ask: io.ask ?? askTerminal });
  }
  if (cmd in COMMANDS) {
    return { code: 1, output: `'${cmd}' is planned but not implemented yet.` };
  }
  return { code: 1, output: `Unknown command: ${cmd}\n\n${usage()}` };
}

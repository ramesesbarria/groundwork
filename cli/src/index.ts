import { readFileSync } from "node:fs";

export interface RunResult {
  code: number;
  output: string;
}

// Works from both src/ (tests) and dist/ (published): package.json is one level up.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

const COMMANDS: Record<string, string> = {
  init: "Install Groundwork into this project",
  adapter: "Add or refresh an AI tool adapter (e.g. claude-code)",
  status: "Show the current phase, card and checks",
  doctor: "Check harness health and the context token budget",
  retro: "Collect signals for /gw-retro from git and .groundwork/",
};

function usage(): string {
  const width = Math.max(...Object.keys(COMMANDS).map((c) => c.length));
  const lines = Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(width)}  ${desc}`);
  return [
    `groundwork ${pkg.version}: a tool-agnostic workflow for building software with AI agents`,
    "",
    "Usage: groundwork <command>",
    "",
    "Commands (not implemented yet):",
    ...lines,
  ].join("\n");
}

export function run(argv: string[]): RunResult {
  const [cmd] = argv;
  if (cmd === undefined || cmd === "help" || cmd === "--help" || cmd === "-h") {
    return { code: 0, output: usage() };
  }
  if (cmd === "--version" || cmd === "-v") {
    return { code: 0, output: pkg.version };
  }
  if (cmd in COMMANDS) {
    return { code: 1, output: `'${cmd}' is planned but not implemented yet.` };
  }
  return { code: 1, output: `Unknown command: ${cmd}\n\n${usage()}` };
}

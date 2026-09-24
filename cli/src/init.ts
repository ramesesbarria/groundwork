import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore, type CoreFiles } from "./core.js";
import { generateClaudeCode } from "./adapters/claude-code.js";
import { generateOpenCode } from "./adapters/opencode.js";
import { applyFiles, type PlannedFile } from "./files.js";
import type { Io, RunResult } from "./index.js";

export type { PlannedFile } from "./files.js";

export const ADAPTERS = ["claude-code", "opencode", "none"] as const;
export type Adapter = (typeof ADAPTERS)[number];
export const isAdapter = (value: string): value is Adapter => (ADAPTERS as readonly string[]).includes(value);

// Keeps Groundwork's files identical on every OS, so Windows users don't get line-ending noise (L-012).
const GITATTRIBUTES = [
  "# Groundwork: same line endings on every OS",
  ".groundwork/** text eol=lf",
  "AGENTS.md text eol=lf",
  "CLAUDE.md text eol=lf",
  ".claude/** text eol=lf",
  ".opencode/** text eol=lf",
  "",
].join("\n");

// Where templates land in a project. Every other core file keeps its path inside .groundwork/.
const TEMPLATE_TARGETS: Record<string, string> = {
  "templates/AGENTS.md": "AGENTS.md",
  "templates/SPEC.md": ".groundwork/SPEC.md",
  "templates/HANDOFF.md": ".groundwork/HANDOFF.md",
  "templates/LESSONS.md": ".groundwork/LESSONS.md",
  "templates/config.json": ".groundwork/config.json",
  "templates/config.schema.json": ".groundwork/config.schema.json",
};

// What an existing CLAUDE.md or AGENTS.md gets instead of being replaced. gw-setup merges the rest, with the user's OK.
// A file that already contains the marker is already connected to Groundwork and is left alone.
const POINTERS: Record<string, { marker: string; lines: string }> = {
  "CLAUDE.md": { marker: "@AGENTS.md", lines: "@AGENTS.md\n" },
  "AGENTS.md": {
    marker: ".groundwork/HANDOFF.md",
    lines: "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md.\n",
  },
};
const withPointer = (file: PlannedFile): PlannedFile =>
  POINTERS[file.path] === undefined ? file : { ...file, pointer: POINTERS[file.path] };

const EMPTY_DIRS = [".groundwork/cards", ".groundwork/decisions", ".groundwork/evidence"];

// Pure: the files one adapter adds. `core` only needs commands/ and roles/, so it can be the
// package's core or a project's own .groundwork/.
export function planAdapter(core: CoreFiles, adapter: Adapter): PlannedFile[] {
  const files: PlannedFile[] = [{ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" }];
  if (adapter === "claude-code") {
    for (const [path, content] of Object.entries(generateClaudeCode(core))) {
      files.push(withPointer({ path, content, mode: path === ".claude/settings.json" ? "merge-settings" : "replace" }));
    }
  }
  if (adapter === "opencode") {
    for (const [path, content] of Object.entries(generateOpenCode(core))) files.push({ path, content });
  }
  return files;
}

// Pure: which files `init` writes for this core and adapter.
export function planInit(core: CoreFiles, adapter: Adapter): PlannedFile[] {
  const files: PlannedFile[] = Object.entries(core).map(([path, content]) =>
    withPointer({ path: TEMPLATE_TARGETS[path] ?? `.groundwork/${path}`, content }),
  );
  // A spare copy of the AGENTS.md template, so gw-setup can rebuild AGENTS.md if the user kept their own.
  files.push({ path: ".groundwork/templates/AGENTS.md", content: core["templates/AGENTS.md"] ?? "" });
  for (const dir of EMPTY_DIRS) files.push({ path: `${dir}/.gitkeep`, content: "" });
  files.push(...planAdapter(core, adapter));
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

// The published package ships core/ next to dist/; in this repo it sits two levels up.
export function locateCore(): string {
  for (const candidate of ["../core/", "../../core/"]) {
    const dir = fileURLToPath(new URL(candidate, import.meta.url));
    if (existsSync(join(dir, "workflow.md"))) return dir;
  }
  throw new Error("Groundwork's core files are missing from this installation.");
}

// Groundwork's own source repo has core/ and the CLI side by side. Installing into it would mix
// install output with the source (it happened once: lesson L-015).
export const isGroundworkSource = (dir: string) =>
  existsSync(join(dir, "core", "workflow.md")) && existsSync(join(dir, "cli", "src", "init.ts"));

export const NEXT_STEPS: Record<Adapter, string> = {
  "claude-code": "Next: open Claude Code in this folder and run /gw-setup.",
  opencode: "Next: open OpenCode in this folder and run /gw-setup.",
  none: "Next: ask your AI tool to read .groundwork/commands/gw-setup.md and follow it.",
};

const ADAPTER_QUESTION = [
  "Which AI tool should Groundwork set up?",
  "  1) Claude Code",
  "  2) OpenCode",
  "  3) None: plain markdown, works with any tool",
  "Choose 1, 2 or 3 [1]: ",
].join("\n");

function parseArgs(args: string[]): { dryRun: boolean; adapter?: string } {
  const i = args.indexOf("--adapter");
  return {
    dryRun: args.includes("--dry-run"),
    adapter: i === -1 ? undefined : (args[i + 1] ?? ""),
  };
}

async function chooseAdapter(io: Io, given: string | undefined, dryRun: boolean): Promise<string> {
  if (given !== undefined) return given;
  if (dryRun) return "claude-code"; // a dry run never asks anything
  const answer = (await io.ask(ADAPTER_QUESTION)).trim();
  if (answer === "" || answer === "1") return "claude-code";
  if (answer === "2") return "opencode";
  if (answer === "3") return "none";
  return answer;
}

export async function init(args: string[], io: Io): Promise<RunResult> {
  if (isGroundworkSource(io.cwd)) {
    return {
      code: 1,
      output: "This is Groundwork's own source repo, not a project to install into. Run init in your project's folder.",
    };
  }
  const { dryRun, adapter: given } = parseArgs(args);
  const adapter = await chooseAdapter(io, given, dryRun);
  if (!isAdapter(adapter)) {
    return { code: 1, output: `Unknown adapter: ${adapter}. Choose one of: ${ADAPTERS.join(", ")}.` };
  }

  const { lines } = await applyFiles(planInit(readCore(locateCore()), adapter), io, dryRun);
  const output = [
    dryRun
      ? `Dry run (adapter: ${adapter}). Nothing was written.`
      : lines.length === 0
        ? `Groundwork is already up to date (adapter: ${adapter}). Nothing to change.`
        : `Groundwork installed (adapter: ${adapter}).`,
    ...lines,
    ...(dryRun ? [] : ["", NEXT_STEPS[adapter]]),
  ];
  return { code: 0, output: output.join("\n") };
}

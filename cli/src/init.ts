import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore, type CoreFiles } from "./core.js";
import { generateClaudeCode } from "./adapters/claude-code.js";
import { generateOpenCode } from "./adapters/opencode.js";
import { mergeSettings } from "./settings.js";
import type { Io, RunResult } from "./index.js";

export const ADAPTERS = ["claude-code", "opencode", "none"] as const;
export type Adapter = (typeof ADAPTERS)[number];

export interface PlannedFile {
  path: string;
  content: string;
  // "replace" (default): write the file, asking first if a different one exists.
  // "append-lines": add any of our lines the file is missing, keeping everything else.
  // "merge-settings": merge our hooks into an existing Claude Code settings file.
  mode?: "replace" | "append-lines" | "merge-settings";
}

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

const EMPTY_DIRS = [".groundwork/cards", ".groundwork/decisions", ".groundwork/evidence"];

// Pure: which files `init` writes for this core and adapter.
export function planInit(core: CoreFiles, adapter: Adapter): PlannedFile[] {
  const files: PlannedFile[] = Object.entries(core).map(([path, content]) => ({
    path: TEMPLATE_TARGETS[path] ?? `.groundwork/${path}`,
    content,
  }));
  // A spare copy of the AGENTS.md template, so gw-setup can rebuild AGENTS.md if the user kept their own.
  files.push({ path: ".groundwork/templates/AGENTS.md", content: core["templates/AGENTS.md"] ?? "" });
  for (const dir of EMPTY_DIRS) files.push({ path: `${dir}/.gitkeep`, content: "" });
  files.push({ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" });
  if (adapter === "claude-code") {
    for (const [path, content] of Object.entries(generateClaudeCode(core))) {
      files.push({ path, content, mode: path === ".claude/settings.json" ? "merge-settings" : "replace" });
    }
  }
  if (adapter === "opencode") {
    for (const [path, content] of Object.entries(generateOpenCode(core))) files.push({ path, content });
  }
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

// What to tell the user when they keep their own version of a file.
const KEPT_ADVICE: Record<string, string> = {
  "CLAUDE.md": "Add the line @AGENTS.md to your CLAUDE.md so Claude Code loads Groundwork.",
  "AGENTS.md":
    'Add this line to your AGENTS.md: "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md."',
};

const NEXT_STEPS: Record<Adapter, string> = {
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

const isAdapter = (value: string): value is Adapter => (ADAPTERS as readonly string[]).includes(value);

async function chooseAdapter(io: Io, given: string | undefined, dryRun: boolean): Promise<Adapter | string> {
  if (given !== undefined) return given;
  if (dryRun) return "claude-code"; // a dry run never asks anything
  const answer = (await io.ask(ADAPTER_QUESTION)).trim();
  if (answer === "" || answer === "1") return "claude-code";
  if (answer === "2") return "opencode";
  if (answer === "3") return "none";
  return answer;
}

export async function init(args: string[], io: Io): Promise<RunResult> {
  const { dryRun, adapter: given } = parseArgs(args);
  const adapter = await chooseAdapter(io, given, dryRun);
  if (!isAdapter(adapter)) {
    return { code: 1, output: `Unknown adapter: ${adapter}. Choose one of: ${ADAPTERS.join(", ")}.` };
  }

  const lines: string[] = [];
  const kept: string[] = [];
  for (const file of planInit(readCore(locateCore()), adapter)) {
    const target = join(io.cwd, file.path);
    const exists = existsSync(target);

    if (file.mode === "append-lines" && exists) {
      const current = readFileSync(target, "utf8");
      const have = new Set(current.split(/\r?\n/));
      const missing = file.content.split("\n").filter((line) => line !== "" && !have.has(line));
      if (missing.length === 0) {
        if (dryRun) lines.push(`  unchanged  ${file.path}`);
        continue;
      }
      lines.push(`  add lines  ${file.path}`);
      if (!dryRun) {
        const separator = current === "" || current.endsWith("\n") ? "" : "\n";
        writeFileSync(target, `${current}${separator}${missing.join("\n")}\n`);
      }
      continue;
    }

    if (file.mode === "merge-settings" && exists) {
      const current = readFileSync(target, "utf8");
      let merged: string;
      try {
        merged = JSON.stringify(mergeSettings(JSON.parse(current), JSON.parse(file.content)), null, 2) + "\n";
      } catch {
        lines.push(`  skip       ${file.path} (not valid JSON; add Groundwork's hook by hand)`);
        continue;
      }
      if (JSON.stringify(JSON.parse(merged)) === JSON.stringify(JSON.parse(current))) {
        if (dryRun) lines.push(`  unchanged  ${file.path}`);
        continue;
      }
      lines.push(`  merge      ${file.path}`);
      if (!dryRun) writeFileSync(target, merged);
      continue;
    }

    const same = exists && readFileSync(target, "utf8") === file.content;

    if (dryRun) {
      if (same) lines.push(`  unchanged  ${file.path}`);
      else if (exists) lines.push(`  exists     ${file.path} (would ask before overwriting)`);
      else lines.push(`  create     ${file.path}`);
      continue;
    }
    if (same) continue;
    if (exists) {
      const answer = (await io.ask(`${file.path} already exists. Overwrite it? [y/N]: `)).trim().toLowerCase();
      if (answer !== "y" && answer !== "yes") {
        lines.push(`  skip       ${file.path} (kept yours)`);
        kept.push(file.path);
        continue;
      }
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    lines.push(`  ${exists ? "overwrite" : "create   "}  ${file.path}`);
  }

  const advice = kept.map((path) => KEPT_ADVICE[path]).filter((line): line is string => line !== undefined);
  const output = [
    dryRun
      ? `Dry run (adapter: ${adapter}). Nothing was written.`
      : lines.length === 0
        ? `Groundwork is already up to date (adapter: ${adapter}). Nothing to change.`
        : `Groundwork installed (adapter: ${adapter}).`,
    ...lines,
    ...(advice.length > 0 ? ["", ...advice] : []),
    ...(dryRun ? [] : ["", NEXT_STEPS[adapter]]),
  ];
  return { code: 0, output: output.join("\n") };
}

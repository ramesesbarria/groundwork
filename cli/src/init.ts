import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore, type CoreFiles } from "./core.js";
import { generateClaudeCode } from "./adapters/claude-code.js";
import { generateOpenCode } from "./adapters/opencode.js";
import { generateCodex, CODEX_FLOW_LIMITS } from "./adapters/codex.js";
import { generateCursor, CURSOR_FLOW_LIMITS } from "./adapters/cursor.js";
import { generateGemini, GEMINI_FLOW_LIMITS } from "./adapters/gemini.js";
import type { ModelHints } from "./adapters/shared.js";
import { applyFiles, type PlannedFile } from "./files.js";
import type { Io, RunResult } from "./index.js";
import { VERSION } from "./version.js";
import { parseJson, readProjectConfig } from "./config.js";
import { recordFiles } from "./manifest.js";

export type { PlannedFile } from "./files.js";

export const ADAPTERS = ["claude-code", "opencode", "codex", "cursor", "gemini", "none"] as const;
export type Adapter = (typeof ADAPTERS)[number];
export const isAdapter = (value: string): value is Adapter => (ADAPTERS as readonly string[]).includes(value);

// Keeps Groundwork's files identical on every OS, so Windows users don't get line-ending noise.
// The binary rules come last, and later rules win, so evidence images are never normalized as text.
export const GITATTRIBUTES = [
  "# Groundwork: same line endings on every OS",
  ".groundwork/** text eol=lf",
  "AGENTS.md text eol=lf",
  "CLAUDE.md text eol=lf",
  ".claude/** text eol=lf",
  ".opencode/** text eol=lf",
  ".codex/** text eol=lf",
  ".cursor/** text eol=lf",
  ".gemini/** text eol=lf",
  ".agents/** text eol=lf",
  "GEMINI.md text eol=lf",
  "",
  "# Evidence images are binary: git must never rewrite their bytes",
  "*.png binary",
  "*.jpg binary",
  "*.jpeg binary",
  "*.webp binary",
  "*.gif binary",
  "",
].join("\n");

// Where templates land in a project. Every other core file keeps its path inside .groundwork/.
export const TEMPLATE_TARGETS: Record<string, string> = {
  "templates/AGENTS.md": "AGENTS.md",
  "templates/SPEC.md": ".groundwork/SPEC.md",
  "templates/HANDOFF.md": ".groundwork/HANDOFF.md",
  "templates/LESSONS.md": ".groundwork/LESSONS.md",
  "templates/JOURNAL.md": ".groundwork/JOURNAL.md",
  "templates/MAP.md": ".groundwork/MAP.md",
  // The decisions index, generated from decisions/*.md by `groundwork index`.
  "templates/DECISIONS.md": ".groundwork/DECISIONS.md",
  "templates/config.json": ".groundwork/config.json",
  "templates/config.schema.json": ".groundwork/config.schema.json",
  // Shipped under another name: npm leaves files called .gitignore out of a package.
  "templates/groundwork.gitignore": ".groundwork/.gitignore",
};

// Template targets Groundwork keeps up to date; the rest belong to the project once it has them.
const MANAGED_TARGETS = new Set([".groundwork/config.schema.json", ".groundwork/.gitignore"]);
const RULES = "templates/rules/";

// Two layers. The context layer is project memory: the handoff, map, decisions, lessons and journal,
// the library that reads and writes them, and the hooks that load and save them. Every install has it.
// The flow (cards, roles, approval, guards) is everything else in the core, installed on top when
// asked. `context/` holds what a context-only install gets in place of the flow's file of that name.
const CONTEXT_ONLY = "context/";
const CONTEXT_FILES = new Set([
  "memory.md",
  "hooks/session-start.mjs",
  "hooks/checkpoint.mjs",
  "templates/MAP.md",
  "templates/DECISIONS.md",
  "templates/LESSONS.md",
  "templates/decision.md",
]);
export const isContextFile = (path: string) => CONTEXT_FILES.has(path) || path.startsWith("lib/");

// Pure: the core files one kind of install uses, keyed as a core without layers would be.
export function layerOf(core: CoreFiles, flow: boolean): CoreFiles {
  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(core)) {
    if (!path.startsWith(CONTEXT_ONLY) && (flow || isContextFile(path))) files[path] = content;
  }
  if (!flow) {
    for (const [path, content] of Object.entries(core)) {
      if (path.startsWith(CONTEXT_ONLY)) files[path.slice(CONTEXT_ONLY.length)] = content;
    }
  }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

// Whether a project has the flow on. Installs from before 2.0 have no `flow` key and always had it.
// core/lib/memory.mjs answers the same question for the hooks.
export function flowOn(groundworkDir: string): boolean {
  const flow = readProjectConfig(groundworkDir).flow;
  if (typeof flow === "boolean") return flow;
  return existsSync(join(groundworkDir, "guards", "run.mjs")) || existsSync(join(groundworkDir, "workflow.md"));
}

// Where a core file lands in a project. Each role's rules template becomes .groundwork/rules/<role>.md.
export function targetOf(path: string): string {
  if (TEMPLATE_TARGETS[path]) return TEMPLATE_TARGETS[path];
  if (path.startsWith(RULES)) return `.groundwork/rules/${path.slice(RULES.length)}`;
  return `.groundwork/${path}`;
}

// The project's own files: spec, handoff, map, lessons, journal, decisions index, config values,
// AGENTS.md, its rules. `upgrade` never replaces them.
export const isProjectFile = (target: string) =>
  target.startsWith(".groundwork/rules/") || (Object.values(TEMPLATE_TARGETS).includes(target) && !MANAGED_TARGETS.has(target));

// Files Groundwork owns outright, whose last-written version the manifest records.
export const isManaged = (file: PlannedFile) =>
  (file.mode ?? "replace") === "replace" && !file.pointer && !isProjectFile(file.path) && !file.path.endsWith("/.gitkeep");

// What an existing CLAUDE.md or AGENTS.md gets instead of being replaced.
// A file that already contains the marker is already connected to Groundwork and is left alone.
export const AGENTS_POINTER_FLOW = "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md.";
export const AGENTS_POINTER_CONTEXT =
  "Run `npx groundwork-ai brief` first: it prints this project's memory (.groundwork/HANDOFF.md and more). Then follow .groundwork/memory.md.";
function pointerFor(path: string, flow: boolean): { marker: string; lines: string } | undefined {
  if (path === "CLAUDE.md" || path === "GEMINI.md") return { marker: "@AGENTS.md", lines: "@AGENTS.md\n" };
  if (path === "AGENTS.md") return { marker: ".groundwork/HANDOFF.md", lines: `${flow ? AGENTS_POINTER_FLOW : AGENTS_POINTER_CONTEXT}\n` };
  return undefined;
}
const withPointer = (file: PlannedFile, flow: boolean): PlannedFile => {
  const pointer = pointerFor(file.path, flow);
  return pointer === undefined ? file : { ...file, pointer };
};

const CONTEXT_DIRS = [".groundwork/decisions"];
const FLOW_DIRS = [".groundwork/cards", ".groundwork/evidence"];

// Pure: the files one adapter adds. `core` only needs commands/ and roles/, so it can be the
// package's core or a project's own .groundwork/. `models` comes from the project's config. `flow`
// says whether to wire the flow's guards, roles and approval commands as well as project memory.
export function planAdapter(core: CoreFiles, adapter: Adapter, models: ModelHints = {}, flow = "guards/run.mjs" in core): PlannedFile[] {
  const files: PlannedFile[] = [{ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" }];
  if (adapter === "claude-code") {
    for (const [path, content] of Object.entries(generateClaudeCode(core, models, flow))) {
      files.push(withPointer({ path, content, mode: path === ".claude/settings.json" ? "merge-settings" : "replace" }, flow));
    }
  }
  if (adapter === "opencode") {
    for (const [path, content] of Object.entries(generateOpenCode(core, models, flow))) files.push({ path, content });
  }
  const generators = { codex: generateCodex, cursor: generateCursor, gemini: generateGemini } as const;
  if (adapter === "codex" || adapter === "cursor" || adapter === "gemini") {
    for (const [path, content] of Object.entries(generators[adapter](core, models, flow))) {
      const merged = path === ".codex/hooks.json" || path === ".cursor/hooks.json" || path === ".gemini/settings.json";
      files.push(withPointer({ path, content, mode: merged ? "merge-settings" : "replace" }, flow));
    }
  }
  return files;
}

// What a tool does not enforce with the flow on. Shown by init, adapter add and flow on.
export const FLOW_LIMITS: Partial<Record<Adapter, { tool: string; limits: string[] }>> = {
  codex: { tool: "Codex", limits: CODEX_FLOW_LIMITS },
  cursor: { tool: "Cursor", limits: CURSOR_FLOW_LIMITS },
  gemini: { tool: "Gemini CLI", limits: GEMINI_FLOW_LIMITS },
};
export const flowLimitLines = (adapter: Adapter, flow: boolean): string[] => {
  const entry = FLOW_LIMITS[adapter];
  return !flow || !entry ? [] : ["", `Not enforced by ${entry.tool} (the flow's guarantees that need more than its hooks give):`, ...entry.limits.map((l) => `  - ${l}`)];
};

// The project's config with the Groundwork version that wrote its files, so doctor can tell when it's behind.
export function stampVersion(configJson: string, version: string): string {
  const { $schema, ...rest } = parseJson(configJson) as Record<string, unknown>;
  delete rest.version;
  return JSON.stringify({ ...($schema === undefined ? {} : { $schema }), version, ...rest }, null, 2) + "\n";
}

// Pure: which files `init` writes for this core and adapter. A default install is the context layer;
// `flow` adds the development flow on top of it.
export function planInit(fullCore: CoreFiles, adapter: Adapter, version = VERSION, flow = false): PlannedFile[] {
  const core = layerOf(fullCore, flow);
  const files: PlannedFile[] = Object.entries(core).map(([path, content]) => {
    const target = targetOf(path);
    return withPointer({ path: target, content: target === ".groundwork/config.json" ? stampVersion(content, version) : content }, flow);
  });
  // A spare copy of the AGENTS.md template, so AGENTS.md can be rebuilt if the user kept their own.
  files.push({ path: ".groundwork/templates/AGENTS.md", content: core["templates/AGENTS.md"] ?? "" });
  for (const dir of [...CONTEXT_DIRS, ...(flow ? FLOW_DIRS : [])]) files.push({ path: `${dir}/.gitkeep`, content: "" });
  files.push(...planAdapter(core, adapter, {}, flow));
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
// install output with the source.
export const isGroundworkSource = (dir: string) =>
  existsSync(join(dir, "core", "workflow.md")) && existsSync(join(dir, "cli", "src", "init.ts"));

// With the flow: /gw runs the next step of the build loop.
export const NEXT_STEPS: Record<Adapter, string> = {
  "claude-code": "Next: open Claude Code in this folder and type /gw. It works out what to do next.",
  opencode: "Next: open OpenCode in this folder and type /gw. It works out what to do next.",
  codex: "Next: open Codex in this folder, run /hooks and trust Groundwork's hooks, then type $gw. It works out what to do next.",
  cursor: "Next: open Cursor on this folder and type /gw in Agent. It works out what to do next.",
  gemini: "Next: start Gemini CLI in this folder and type /gw. It works out what to do next.",
  none: "Next: ask your AI tool to read .groundwork/commands/gw.md and follow it.",
};

// Context only: every session starts from the brief, and saves with a checkpoint.
export const CONTEXT_NEXT_STEPS: Record<Adapter, string> = {
  "claude-code": "Next: open Claude Code in this folder. Each session starts with the project brief; type /gw to resume or save.",
  opencode: "Next: open OpenCode in this folder. Each session starts with the project brief; type /gw to resume or save.",
  codex: "Next: open Codex in this folder, run /hooks and trust Groundwork's hooks. Each session starts with the project brief; type $gw to resume or save.",
  cursor: "Next: open Cursor on this folder. A new conversation starts with the project brief; type /gw to resume or save.",
  gemini: "Next: start Gemini CLI in this folder. Each session starts with the project brief; type /gw to resume or save.",
  none: "Next: ask your AI tool to run `npx groundwork-ai brief`, then to read .groundwork/commands/gw.md and follow it.",
};
const FLOW_HINT = "Optional: a guided build workflow on top of project memory: `npx groundwork-ai flow on`.";

export const nextSteps = (adapter: Adapter, flow: boolean) => (flow ? NEXT_STEPS[adapter] : CONTEXT_NEXT_STEPS[adapter]);

const ADAPTER_QUESTION = [
  "Which AI tool should Groundwork set up?",
  "  1) Claude Code",
  "  2) OpenCode",
  "  3) Codex",
  "  4) Cursor",
  "  5) Gemini CLI",
  "  6) None: plain markdown, works with any tool",
  "Choose a number, or several separated by commas (1,3) [1]: ",
].join("\n");

function parseArgs(args: string[]): { dryRun: boolean; flow: boolean; adapter?: string } {
  const i = args.indexOf("--adapter");
  return {
    dryRun: args.includes("--dry-run"),
    flow: args.includes("--flow"),
    adapter: i === -1 ? undefined : (args[i + 1] ?? ""),
  };
}

async function chooseAdapter(io: Io, given: string | undefined, dryRun: boolean): Promise<string> {
  if (given !== undefined) return given;
  if (dryRun) return "claude-code"; // a dry run never asks anything
  const answer = (await io.ask(ADAPTER_QUESTION)).trim();
  const byNumber: Record<string, string> = { "1": "claude-code", "2": "opencode", "3": "codex", "4": "cursor", "5": "gemini", "6": "none" };
  if (answer === "") return "claude-code";
  return answer.split(",").map((part) => byNumber[part.trim()] ?? part.trim()).join(",");
}

// Whether the repo already had uncommitted changes. False when git can't tell (no git, no repo).
function uncommittedChanges(cwd: string): boolean {
  if (!existsSync(join(cwd, ".git"))) return false;
  try {
    return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() !== "";
  } catch {
    return false;
  }
}

export async function init(args: string[], io: Io): Promise<RunResult> {
  if (isGroundworkSource(io.cwd)) {
    return {
      code: 1,
      output: "This is Groundwork's own source repo, not a project to install into. Run init in your project's folder.",
    };
  }
  const { dryRun, flow: wantsFlow, adapter: given } = parseArgs(args);
  // One adapter, or several separated by commas (--adapter claude-code,codex).
  const chosen = (await chooseAdapter(io, given, dryRun)).split(",").map((a) => a.trim());
  const unknown = chosen.find((a) => !isAdapter(a));
  if (unknown !== undefined) {
    return { code: 1, output: `Unknown adapter: ${unknown}. Choose one of: ${ADAPTERS.join(", ")} (several separated by commas).` };
  }
  if (chosen.includes("none") && chosen.length > 1) return { code: 1, output: "Choose `none` on its own, or one or more tools." };
  const adapters = [...new Set(chosen)] as Adapter[];
  const adapter = adapters.join(", ");

  // A project that is already installed keeps the layers it has: init only fills in what's missing.
  const groundwork = join(io.cwd, ".groundwork");
  const installed = existsSync(groundwork);
  const hasFlow = installed && flowOn(groundwork);
  if (installed && existsSync(join(groundwork, "config.json")) && wantsFlow && !hasFlow) {
    return { code: 1, output: "Groundwork is already installed here without the flow. Turn it on with `npx groundwork-ai flow on`." };
  }
  const flow = wantsFlow || hasFlow;

  const hadChanges = uncommittedChanges(io.cwd);
  const core = readCore(locateCore());
  let lines: string[];
  let warnings: string[];
  if (dryRun) {
    const extra = adapters.slice(1).flatMap((a) => planAdapter(layerOf(core, flow), a, {}, flow).filter((f) => f.path !== ".gitattributes"));
    ({ lines, warnings } = await applyFiles([...planInit(core, adapters[0], VERSION, flow), ...extra], io, true));
  } else {
    const base = planInit(core, "none", VERSION, flow);
    const first = await applyFiles(base, io, false);
    // Adapter files come from the project's own .groundwork/, as `adapter add` and `doctor` build them,
    // so a role or command file the user chose to keep is what the adapter points at.
    const adapterFiles = adapters
      .filter((a) => a !== "none")
      .flatMap((a) => planAdapter(readCore(groundwork), a, readProjectConfig(groundwork).models, flow))
      .filter((f, i, all) => f.path !== ".gitattributes" && all.findIndex((g) => g.path === f.path) === i);
    const second = await applyFiles(adapterFiles, io, false);
    lines = [...first.lines, ...second.lines];
    warnings = [...first.warnings, ...second.warnings];
    recordFiles(io.cwd, [...base, ...adapterFiles].filter(isManaged), VERSION);
  }
  if (!existsSync(join(io.cwd, ".git"))) {
    warnings.push(
      flow
        ? // The build loop commits each card, so it needs git; everything else works without it.
          "This folder isn't a git repository. Groundwork commits each approved card, so run `git init` before you start."
        : "This folder isn't a git repository. The handoff still saves, but nothing can tell how far the code has moved since: run `git init`.",
    );
  } else if (!dryRun && hadChanges) {
    warnings.push(
      flow
        ? "There were uncommitted changes before this install. Commit Groundwork's files on their own (e.g. `Add Groundwork`), " +
            "so they don't mix with other work and each card's commit holds only that card."
        : "There were uncommitted changes before this install. Commit Groundwork's files on their own (e.g. `chore: add Groundwork`), so they don't mix with other work.",
    );
  }
  const output = [
    dryRun
      ? `Dry run (adapter: ${adapter}). Nothing was written.`
      : lines.length === 0
        ? `Groundwork is already up to date (adapter: ${adapter}). Nothing to change.`
        : `Groundwork installed (adapter: ${adapter}).`,
    ...lines,
    ...(warnings.length > 0 ? ["", ...warnings.map((w) => `Warning: ${w}`)] : []),
    ...(dryRun ? [] : ["", ...adapters.map((a) => nextSteps(a, flow)), ...adapters.flatMap((a) => flowLimitLines(a, flow)), ...(flow ? [] : [FLOW_HINT])]),
  ];
  return { code: 0, output: output.join("\n") };
}

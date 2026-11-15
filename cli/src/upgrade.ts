// `groundwork upgrade`: bring a project's Groundwork files up to this version.
// The project's state (handoff, map, lessons, journal, decisions, spec, rules, cards, evidence, config
// values, its own AGENTS.md and CLAUDE.md) is never touched. Groundwork's own files are replaced,
// unless the user changed one since Groundwork wrote it: then theirs stays and the new version is
// written next to it as <file>.new. Keys a newer version added are put into the config.
//
// A project keeps the layers it has. One from before 2.0 has the flow, so it stays on: nothing it
// used is taken away, and it gains the context layer underneath (checkpoints, brief, freshness).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCore, type CoreFiles } from "./core.js";
import { applyFiles, type PlannedFile } from "./files.js";
import { ADAPTERS, flowOn, GITATTRIBUTES, isManaged, isProjectFile, layerOf, locateCore, planAdapter, planInit, stampVersion, type Adapter } from "./init.js";
import { compareVersions, VERSION } from "./version.js";
import { keptHelperNote, retiredHelperFiles } from "./retired.js";
import { CLAUDE_MD_LINES } from "./adapters/claude-code.js";
import { OPENCODE_FLOW_PLUGIN, OPENCODE_MEMORY_PLUGIN } from "./adapters/opencode.js";
import { parseJson, readProjectConfig } from "./config.js";
import { alreadyMerged, editState, readManifest, recordFiles, recordOffered } from "./manifest.js";
import { memoryLib } from "./memory.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

// Commands a later version removed. Their core file and adapter files go too.
const RETIRED_COMMANDS = ["gw-resume"];
const retiredPaths = RETIRED_COMMANDS.flatMap((name) => [
  `.groundwork/commands/${name}.md`,
  `.claude/skills/${name}`,
  `.opencode/commands/${name}.md`,
]);

// Subagent files a later version stopped generating, removed only if Groundwork wrote them.
const RETIRED_AGENTS: [string, string][] = [
  [".claude/agents/gw-planner.md", "You are the Groundwork planner."],
  [".opencode/agents/gw-planner.md", "You are the Groundwork planner."],
];

// A CLAUDE.md made entirely of lines Groundwork generates, each once, so replacing or removing it loses
// nothing of the user's.
export function isGeneratedClaudeMd(text: string): boolean {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== "@AGENTS.md" || lines[1] !== "" || lines[2] !== "## Claude Code") return false;
  const used = new Set<RegExp>();
  return lines.slice(3).every((line) => {
    const pattern = CLAUDE_MD_LINES.find((re) => re.test(line));
    if (!pattern || used.has(pattern)) return false;
    used.add(pattern);
    return true;
  });
}

type Commands = { commands?: Record<string, string> };

// Command keys a newer template has that the project's config lacks (e.g. `run` in 0.6).
export function missingCommands(configJson: string, templateJson: string): string[] {
  const have = (parseJson(configJson) as Commands).commands ?? {};
  const want = (parseJson(templateJson) as Commands).commands ?? {};
  return Object.keys(want).filter((key) => !(key in have));
}

// Adds them empty, so every value the project already set stays exactly as it is.
export function withCommands(configJson: string, keys: string[]): string {
  if (keys.length === 0) return configJson;
  const config = parseJson(configJson) as Commands & Record<string, unknown>;
  config.commands = { ...config.commands, ...Object.fromEntries(keys.map((key) => [key, ""])) };
  return JSON.stringify(config, null, 2) + "\n";
}

// The context layer's settings, added in 2.0. Only these are filled in from the template: a flow
// setting the project never had (a guard, say) is not switched on by an upgrade.
const MEMORY_KEYS = ["budgets", "staleAfterDays", "nudge"];

// Memory settings the template has and the project's config doesn't, with the template's values.
export function missingKeys(configJson: string, templateJson: string): Record<string, unknown> {
  const have = parseJson(configJson) as Record<string, unknown>;
  const want = parseJson(templateJson) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(want).filter(([key]) => !(key in have) && MEMORY_KEYS.includes(key)));
}

export function withKeys(configJson: string, keys: Record<string, unknown>): string {
  if (Object.keys(keys).length === 0) return configJson;
  return JSON.stringify({ ...(parseJson(configJson) as Record<string, unknown>), ...keys }, null, 2) + "\n";
}

// Older configs have no `setup` key. Setup ran if it filled in both AGENTS.md and SPEC.md: a project
// that kept its own AGENTS.md has no placeholders there, so SPEC.md is the one that tells.
export function setupState(cwd: string): "done" | "pending" {
  const read = (path: string) => (existsSync(join(cwd, path)) ? readFileSync(join(cwd, path), "utf8") : "");
  const filled = !read("AGENTS.md").includes("{{") && !read(".groundwork/SPEC.md").includes("{{project_name}}");
  return filled ? "done" : "pending";
}

export function withSetup(configJson: string, state: "done" | "pending"): string {
  const config = parseJson(configJson) as Record<string, unknown>;
  if ("setup" in config) return configJson;
  return JSON.stringify({ ...config, setup: state }, null, 2) + "\n";
}

// The adapters a project has, whichever layers their files were generated for.
export function installedAdapters(cwd: string, core: CoreFiles): Adapter[] {
  return ADAPTERS.filter((tool) => tool !== "none").filter((tool) =>
    [true, false].some((flow) =>
      planAdapter(layerOf(core, flow), tool, {}, flow).some((f) => (f.mode ?? "replace") === "replace" && f.path !== "CLAUDE.md" && f.path !== "GEMINI.md" && existsSync(join(cwd, f.path))),
    ),
  );
}

// The project's own memory files. They are never replaced, but one that is missing is created: a
// project from before 2.0 has no map or decisions index yet.
const MEMORY_FILES = new Set([".groundwork/HANDOFF.md", ".groundwork/MAP.md", ".groundwork/DECISIONS.md", ".groundwork/JOURNAL.md", ".groundwork/LESSONS.md"]);

// Groundwork's own files for this project: the managed part of its layers, plus each installed adapter.
// Project files are left out, except ones the project doesn't have yet (a role's rules, a memory file).
export function planManaged(cwd: string, fullCore: CoreFiles, flow: boolean): PlannedFile[] {
  // Old installs may predate the binary image rules; append-lines only adds what's missing.
  const files: PlannedFile[] = [{ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" }];
  files.push(
    ...planInit(fullCore, "none", VERSION, flow).filter(
      (f) =>
        f.path.startsWith(".groundwork/") &&
        !f.path.endsWith("/.gitkeep") &&
        (!isProjectFile(f.path) || ((f.path.startsWith(".groundwork/rules/") || MEMORY_FILES.has(f.path)) && !existsSync(join(cwd, f.path)))),
    ),
  );
  const core = layerOf(fullCore, flow);
  const models = readProjectConfig(join(cwd, ".groundwork")).models;
  for (const tool of installedAdapters(cwd, fullCore)) {
    for (const file of planAdapter(core, tool, models, flow)) {
      const claude = join(cwd, "CLAUDE.md");
      if (file.path === "CLAUDE.md" && existsSync(claude) && isGeneratedClaudeMd(readFileSync(claude, "utf8"))) {
        files.push({ path: file.path, content: file.content }); // Groundwork's own: refresh it
      } else {
        files.push(file);
      }
    }
  }
  // Adapters plan the same .gitattributes; keep the first entry per path.
  const seen = new Set<string>();
  return files.filter((file) => (seen.has(file.path) ? false : (seen.add(file.path), true)));
}

export type Step = { file: PlannedFile; action: "create" | "replace" | "keep"; unknown?: boolean };

const sameText = (a: string, b: string) => a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");

// What to do with each file Groundwork owns: create, replace, or keep the user's edit.
export function decide(cwd: string, files: PlannedFile[]): Step[] {
  const manifest = readManifest(cwd);
  const steps: Step[] = [];
  for (const file of files) {
    const path = join(cwd, file.path);
    if (!existsSync(path)) {
      steps.push({ file, action: "create" });
      continue;
    }
    const current = readFileSync(path, "utf8");
    if (sameText(current, file.content)) continue;
    const state = editState(manifest, file.path, current);
    if (state === "edited") {
      // Offered before and merged by the user (they deleted the .new file): their version stands.
      if (!alreadyMerged(cwd, manifest, file)) steps.push({ file, action: "keep" });
    } else steps.push({ file, action: "replace", unknown: state === "unknown" && file.path !== "CLAUDE.md" });
  }
  return steps;
}

export const describe = (step: Step) =>
  step.action === "keep"
    ? `  keep       ${step.file.path} (you changed it; the new version goes in ${step.file.path}.new)`
    : `  ${step.action.padEnd(9)}  ${step.file.path}`;

// Writes each step: the new file, or `<file>.new` next to one the user changed.
export function writeSteps(cwd: string, steps: Step[]) {
  for (const { file, action } of steps) {
    const target = join(cwd, action === "keep" ? `${file.path}.new` : file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
}

// A plugin generated for the other layer set: two would both run. Removed if Groundwork wrote it.
export function otherPlugin(cwd: string, flow: boolean): string | undefined {
  const path = flow ? OPENCODE_MEMORY_PLUGIN : OPENCODE_FLOW_PLUGIN;
  return existsSync(join(cwd, path)) && existsSync(join(cwd, flow ? OPENCODE_FLOW_PLUGIN : OPENCODE_MEMORY_PLUGIN)) ? path : undefined;
}

export async function upgrade(args: string[], io: Io): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };
  const dryRun = args.includes("--dry-run");
  const yes = args.includes("--yes");

  const configPath = join(groundwork, "config.json");
  const config = existsSync(configPath) ? (parseJson(readFileSync(configPath, "utf8")) as { version?: string; flow?: boolean }) : undefined;
  const from = config?.version ? `version ${config.version}` : "an older version";
  const flow = flowOn(groundwork);
  const before2 = config !== undefined && (config.version === undefined || compareVersions(config.version, "2.0.0") < 0);

  const fullCore = readCore(locateCore());
  const core = layerOf(fullCore, flow);
  const files = planManaged(io.cwd, fullCore, flow);
  const managed = files.filter(isManaged);
  const others = files.filter((f) => !isManaged(f));
  const steps = decide(io.cwd, managed);

  const template = core["templates/config.json"] ?? "{}";
  const configText = config === undefined ? "{}" : readFileSync(configPath, "utf8");
  const newCommands = config === undefined ? [] : missingCommands(configText, template);
  const additions = newCommands.map((key) => `  add        commands.${key} (empty) to .groundwork/config.json`);
  const setup = config !== undefined && flow && !("setup" in config) ? setupState(io.cwd) : undefined;
  if (setup) additions.push(`  add        setup: "${setup}" to .groundwork/config.json`);
  // `flow` is written as what the project has, never as the template's default.
  const newKeys = config === undefined ? {} : { ...missingKeys(configText, template), ...("flow" in config ? {} : { flow }) };
  for (const [key, value] of Object.entries(newKeys)) {
    additions.push(`  add        ${key}: ${typeof value === "object" ? "(defaults)" : JSON.stringify(value)} to .groundwork/config.json`);
  }

  const auto = { ...io, ask: async () => "y" }; // the human confirms once, below, not per file
  const otherChanges = (await applyFiles(others, auto, true)).lines
    .filter((line) => !line.includes("unchanged"))
    .map((line) => line.replace(/^ {2}exists {5}(.*) \(would ask before overwriting\)$/, "  replace    $1"));
  const retiredAgents = RETIRED_AGENTS.filter(([path, marker]) => existsSync(join(io.cwd, path)) && readFileSync(join(io.cwd, path), "utf8").includes(marker)).map(([path]) => path);
  const helpers = retiredHelperFiles(io.cwd);
  const retiredHelpers = helpers.filter((file) => file.generated).map((file) => file.path);
  const keptHelpers = helpers.filter((file) => !file.generated).map((file) => file.path);
  const removals = [...retiredPaths.filter((path) => existsSync(join(io.cwd, path))), ...retiredAgents, ...retiredHelpers].map((path) => `  remove     ${path}`);
  const restamp = config !== undefined && config.version !== VERSION;
  const lib = await memoryLib();
  const indexStale = existsSync(join(groundwork, lib.DECISIONS_INDEX)) && !lib.decisionsIndexInSync(groundwork);
  if (indexStale) additions.push("  update     .groundwork/DECISIONS.md (the decisions index)");

  if (steps.length === 0 && otherChanges.length === 0 && removals.length === 0 && additions.length === 0 && !restamp) {
    return { code: 0, output: `Groundwork is already up to date (${VERSION}). Nothing to change.` };
  }
  const list = [...steps.map(describe), ...otherChanges, ...removals, ...additions];
  if (dryRun) {
    return { code: 0, output: [`Dry run: upgrading from ${from} to ${VERSION} would change:`, ...list, "Nothing was written."].join("\n") };
  }

  if (!yes) {
    // No terminal to ask in (a script, CI or an agent's shell): never take silence as a yes.
    if (!io.interactive) {
      return {
        code: 1,
        output: [`Upgrading from ${from} to ${VERSION} would change:`, ...list, "", "Nothing was changed. Run `npx groundwork-ai upgrade --yes` to apply it."].join("\n"),
      };
    }
    const answer = (
      await io.ask(
        flow
          ? `Upgrade Groundwork here from ${from} to ${VERSION}? This updates Groundwork's own files (commands, roles, workflow, ` +
              "guards, hooks, templates); any you changed are kept, with the new version saved next to them as .new. Your spec, " +
              "handoff, lessons, rules, cards, decisions and evidence stay exactly as they are. [Y/n]: "
          : `Upgrade Groundwork here from ${from} to ${VERSION}? This updates Groundwork's own files (commands, hooks, templates); ` +
              "any you changed are kept, with the new version saved next to them as .new. Your handoff, map, decisions, lessons " +
              "and journal stay exactly as they are. [Y/n]: ",
      )
    )
      .trim()
      .toLowerCase();
    if (answer === "n" || answer === "no") return { code: 0, output: "Nothing was changed." };
  }

  writeSteps(io.cwd, steps);
  const { lines } = await applyFiles(others, auto, false);
  for (const path of [...retiredPaths, ...retiredAgents, ...retiredHelpers]) rmSync(join(io.cwd, path), { recursive: true, force: true });
  for (const path of retiredHelpers.filter((p) => p.endsWith("/SKILL.md"))) {
    const dir = join(io.cwd, dirname(path));
    if (existsSync(dir) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
  }
  if (config !== undefined) {
    const updated = withKeys(withCommands(readFileSync(configPath, "utf8"), newCommands), newKeys);
    writeFileSync(configPath, stampVersion(setup ? withSetup(updated, setup) : updated, VERSION));
  }
  // The index is generated: bring it in step with the decisions the project already has.
  if (existsSync(join(groundwork, lib.DECISIONS_INDEX))) lib.writeDecisionsIndex(groundwork);
  recordFiles(io.cwd, managed, VERSION);
  recordOffered(io.cwd, steps.filter((s) => s.action === "keep").map((s) => s.file), VERSION);

  const kept = steps.filter((s) => s.action === "keep");
  const unknown = steps.filter((s) => s.unknown);
  const fillIn =
    newCommands.length > 0
      ? [`New command${newCommands.length > 1 ? "s" : ""} to fill in: ${newCommands.join(", ")}. Set it in .groundwork/config.json and add it under Commands in AGENTS.md.`]
      : [];
  const adapterKept = kept.filter(({ file }) => [".claude/", ".opencode/", ".codex/", ".cursor/", ".gemini/", ".agents/"].some((dir) => file.path.startsWith(dir)) || file.path === "GEMINI.md");
  const notes = [
    ...(before2
      ? [
          "New in 2.0: project memory. Every session now starts with a brief (handoff, how fresh it is, decisions, rules, map), " +
            "and `npx groundwork-ai checkpoint` stamps the handoff with the commit it was written at. " +
            (flow ? "The flow you were using stays on, unchanged. " : "") +
            "Your handoff is untouched: run `npx groundwork-ai checkpoint` to stamp it, fill in .groundwork/MAP.md, " +
            "and run `npx groundwork-ai compact` if doctor says a file is over its budget.",
        ]
      : []),
    ...(keptHelpers.length > 0
      ? [`Kept: ${keptHelpers.map(keptHelperNote).join("; ")}.`]
      : []),
    ...(kept.length > 0
      ? [`You changed ${kept.length} of Groundwork's files, so they were kept. Compare each with its .new file, merge what you want, then delete the .new file.`]
      : []),
    ...(adapterKept.length > 0
      ? [
          `The active adapter still loads your preserved file${adapterKept.length === 1 ? "" : "s"}: ` +
            `${adapterKept.map(({ file }) => file.path).join(", ")}. The .new version is not active. ` +
            "Merge it, or remove your edit and run upgrade again, before relying on adapter changes in this release.",
        ]
      : []),
    ...(unknown.length > 0
      ? ["This project had no record of the files Groundwork last wrote (it's from before that was tracked), so its files were replaced. If you had edited any, `git diff` shows it. From now on, edits are kept."]
      : []),
  ];

  return {
    code: 0,
    output: [
      `Upgraded Groundwork from ${from} to ${VERSION}.`,
      ...steps.map(describe),
      ...lines,
      ...removals,
      ...additions,
      ...fillIn,
      ...(notes.length > 0 ? ["", ...notes] : []),
      "",
      flow
        ? "Commit Groundwork's updated files separately before the next card, e.g. `[setup] Upgrade Groundwork`, so they don't mix with card work."
        : "Commit Groundwork's updated files on their own, e.g. `chore: upgrade Groundwork`, so they don't mix with other work.",
      "Run `npx groundwork-ai doctor` to check the result.",
    ].join("\n"),
  };
}

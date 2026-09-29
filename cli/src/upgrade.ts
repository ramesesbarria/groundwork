// `groundwork upgrade`: bring a project's Groundwork files up to this version.
// The project's state (spec, handoff, lessons, rules, cards, decisions, evidence, config values, its
// own AGENTS.md and CLAUDE.md) is never touched. Groundwork's own files are replaced, unless the user
// changed one since Groundwork wrote it: then theirs stays and the new version is written next to it
// as <file>.new. Command keys a newer version added are put into the config empty.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCore, type CoreFiles } from "./core.js";
import { applyFiles, type PlannedFile } from "./files.js";
import { ADAPTERS, GITATTRIBUTES, isManaged, isProjectFile, locateCore, planAdapter, planInit, stampVersion, type Adapter } from "./init.js";
import { VERSION } from "./version.js";
import { parseJson, readProjectConfig } from "./config.js";
import { editState, readManifest, recordFiles } from "./manifest.js";
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

// A CLAUDE.md made entirely of lines Groundwork generates, so replacing it loses nothing of the user's.
export function isGeneratedClaudeMd(text: string): boolean {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0] !== "@AGENTS.md" || lines[1] !== "" || lines[2] !== "## Claude Code") return false;
  return lines.slice(3).every((line) => /^(Groundwork commands are skills|The others:|When a command says to run a role)/.test(line));
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
  const config = parseJson(configJson) as Commands & Record<string, unknown>;
  config.commands = { ...config.commands, ...Object.fromEntries(keys.map((key) => [key, ""])) };
  return JSON.stringify(config, null, 2) + "\n";
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

function installedAdapters(cwd: string, core: CoreFiles): Adapter[] {
  return ADAPTERS.filter((tool) => tool !== "none").filter((tool) =>
    planAdapter(core, tool).some((f) => (f.mode ?? "replace") === "replace" && f.path !== "CLAUDE.md" && existsSync(join(cwd, f.path))),
  );
}

// Groundwork's own files for this project: the managed part of the core, plus each installed adapter.
// Project files are left out, except a role's rules file the project doesn't have yet.
function plan(cwd: string, core: CoreFiles): PlannedFile[] {
  // Old installs may predate the binary image rules; append-lines only adds what's missing.
  const files: PlannedFile[] = [{ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" }];
  files.push(
    ...planInit(core, "none").filter(
      (f) =>
        f.path.startsWith(".groundwork/") &&
        !f.path.endsWith("/.gitkeep") &&
        (!isProjectFile(f.path) || (f.path.startsWith(".groundwork/rules/") && !existsSync(join(cwd, f.path)))),
    ),
  );
  const models = readProjectConfig(join(cwd, ".groundwork")).models;
  for (const tool of installedAdapters(cwd, core)) {
    for (const file of planAdapter(core, tool, models)) {
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

type Step = { file: PlannedFile; action: "create" | "replace" | "keep" ; unknown?: boolean };

const sameText = (a: string, b: string) => a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");

// What to do with each file Groundwork owns: create, replace, or keep the user's edit.
function decide(cwd: string, files: PlannedFile[]): Step[] {
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
    if (state === "edited") steps.push({ file, action: "keep" });
    else steps.push({ file, action: "replace", unknown: state === "unknown" && file.path !== "CLAUDE.md" });
  }
  return steps;
}

const describe = (step: Step) =>
  step.action === "keep"
    ? `  keep       ${step.file.path} (you changed it; the new version goes in ${step.file.path}.new)`
    : `  ${step.action.padEnd(9)}  ${step.file.path}`;

export async function upgrade(args: string[], io: Io): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };
  const dryRun = args.includes("--dry-run");
  const yes = args.includes("--yes");

  const configPath = join(groundwork, "config.json");
  const config = existsSync(configPath) ? (parseJson(readFileSync(configPath, "utf8")) as { version?: string }) : undefined;
  const from = config?.version ? `version ${config.version}` : "an older version";

  const core = readCore(locateCore());
  const files = plan(io.cwd, core);
  const managed = files.filter(isManaged);
  const others = files.filter((f) => !isManaged(f));
  const steps = decide(io.cwd, managed);

  const newCommands = config === undefined ? [] : missingCommands(readFileSync(configPath, "utf8"), core["templates/config.json"] ?? "{}");
  const additions = newCommands.map((key) => `  add        commands.${key} (empty) to .groundwork/config.json`);
  const setup = config !== undefined && !("setup" in config) ? setupState(io.cwd) : undefined;
  if (setup) additions.push(`  add        setup: "${setup}" to .groundwork/config.json`);

  const auto = { ...io, ask: async () => "y" }; // the human confirms once, below, not per file
  const otherChanges = (await applyFiles(others, auto, true)).lines
    .filter((line) => !line.includes("unchanged"))
    .map((line) => line.replace(/^ {2}exists {5}(.*) \(would ask before overwriting\)$/, "  replace    $1"));
  const retiredAgents = RETIRED_AGENTS.filter(([path, marker]) => existsSync(join(io.cwd, path)) && readFileSync(join(io.cwd, path), "utf8").includes(marker)).map(([path]) => path);
  const removals = [...retiredPaths.filter((path) => existsSync(join(io.cwd, path))), ...retiredAgents].map((path) => `  remove     ${path}`);
  const restamp = config !== undefined && config.version !== VERSION;

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
        `Upgrade Groundwork here from ${from} to ${VERSION}? This updates Groundwork's own files (commands, roles, workflow, ` +
          "guards, hooks, templates); any you changed are kept, with the new version saved next to them as .new. Your spec, " +
          "handoff, lessons, rules, cards, decisions and evidence stay exactly as they are. [Y/n]: ",
      )
    )
      .trim()
      .toLowerCase();
    if (answer === "n" || answer === "no") return { code: 0, output: "Nothing was changed." };
  }

  for (const { file, action } of steps) {
    const target = join(io.cwd, action === "keep" ? `${file.path}.new` : file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  const { lines } = await applyFiles(others, auto, false);
  for (const path of [...retiredPaths, ...retiredAgents]) rmSync(join(io.cwd, path), { recursive: true, force: true });
  if (config !== undefined) {
    const updated = withCommands(readFileSync(configPath, "utf8"), newCommands);
    writeFileSync(configPath, stampVersion(setup ? withSetup(updated, setup) : updated, VERSION));
  }
  recordFiles(io.cwd, managed, VERSION);

  const kept = steps.filter((s) => s.action === "keep");
  const unknown = steps.filter((s) => s.unknown);
  const fillIn =
    newCommands.length > 0
      ? [`New command${newCommands.length > 1 ? "s" : ""} to fill in: ${newCommands.join(", ")}. Set it in .groundwork/config.json and add it under Commands in AGENTS.md.`]
      : [];
  const notes = [
    ...(kept.length > 0
      ? [`You changed ${kept.length} of Groundwork's files, so they were kept. Compare each with its .new file, merge what you want, then delete the .new file.`]
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
      "Run `npx groundwork-ai doctor` to check the result.",
    ].join("\n"),
  };
}

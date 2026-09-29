// `groundwork upgrade`: bring a project's Groundwork files up to this version.
// Groundwork's own files are replaced; the project's state (spec, handoff, lessons, cards, decisions,
// evidence, config values, its own AGENTS.md and CLAUDE.md) is never touched. Command keys a newer
// version added are put into the config empty, next to the project's own values.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readCore, type CoreFiles } from "./core.js";
import { applyFiles, type PlannedFile } from "./files.js";
import { ADAPTERS, GITATTRIBUTES, locateCore, planAdapter, planInit, stampVersion, TEMPLATE_TARGETS, type Adapter } from "./init.js";
import { VERSION } from "./version.js";
import { parseJson, readProjectConfig } from "./config.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

// Commands a later version removed. Their core file and adapter files go too.
const RETIRED_COMMANDS = ["gw-resume"];
const retiredPaths = RETIRED_COMMANDS.flatMap((name) => [
  `.groundwork/commands/${name}.md`,
  `.claude/skills/${name}`,
  `.opencode/commands/${name}.md`,
]);

// Files init copies that belong to the project once it has them.
const MANAGED_TARGETS = new Set([".groundwork/config.schema.json", ".groundwork/.gitignore"]);
const PROJECT_FILES = new Set(Object.values(TEMPLATE_TARGETS).filter((path) => !MANAGED_TARGETS.has(path)));

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
function plan(cwd: string, core: CoreFiles): PlannedFile[] {
  // Old installs may predate the binary image rules; append-lines only adds what's missing.
  const files: PlannedFile[] = [{ path: ".gitattributes", content: GITATTRIBUTES, mode: "append-lines" }];
  files.push(
    ...planInit(core, "none").filter(
      (f) => f.path.startsWith(".groundwork/") && !PROJECT_FILES.has(f.path) && !f.path.endsWith("/.gitkeep"),
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

export async function upgrade(args: string[], io: Io): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };
  const dryRun = args.includes("--dry-run");

  const configPath = join(groundwork, "config.json");
  const config = existsSync(configPath) ? (parseJson(readFileSync(configPath, "utf8")) as { version?: string }) : undefined;
  const from = config?.version ? `version ${config.version}` : "an older version";

  const core = readCore(locateCore());
  const files = plan(io.cwd, core);
  const newCommands = config === undefined ? [] : missingCommands(readFileSync(configPath, "utf8"), core["templates/config.json"] ?? "{}");
  const additions = newCommands.map((key) => `  add        commands.${key} (empty) to .groundwork/config.json`);
  const setup = config !== undefined && !("setup" in config) ? setupState(io.cwd) : undefined;
  if (setup) additions.push(`  add        setup: "${setup}" to .groundwork/config.json`);
  const yes = { ...io, ask: async () => "y" }; // the human confirms once, below, not per file
  const changes = (await applyFiles(files, yes, true)).lines
    .filter((line) => !line.includes("unchanged"))
    .map((line) => line.replace(/^ {2}exists {5}(.*) \(would ask before overwriting\)$/, "  replace    $1"));
  const removals = retiredPaths.filter((path) => existsSync(join(io.cwd, path))).map((path) => `  remove     ${path}`);
  const restamp = config !== undefined && config.version !== VERSION;

  if (changes.length === 0 && removals.length === 0 && additions.length === 0 && !restamp) {
    return { code: 0, output: `Groundwork is already up to date (${VERSION}). Nothing to change.` };
  }
  const list = [...changes, ...removals, ...additions];
  if (dryRun) {
    return { code: 0, output: [`Dry run: upgrading from ${from} to ${VERSION} would change:`, ...list, "Nothing was written."].join("\n") };
  }

  const answer = (
    await io.ask(
      `Upgrade Groundwork here from ${from} to ${VERSION}? This replaces Groundwork's own files (commands, roles, workflow, ` +
        "guards, hooks, templates) and keeps your spec, handoff, lessons, cards, decisions and evidence exactly as they are. " +
        "If you edited Groundwork's files, commit first so you can compare. [Y/n]: ",
    )
  )
    .trim()
    .toLowerCase();
  if (answer === "n" || answer === "no") return { code: 0, output: "Nothing was changed." };

  const { lines } = await applyFiles(files, yes, false);
  for (const path of retiredPaths) rmSync(join(io.cwd, path), { recursive: true, force: true });
  if (config !== undefined) {
    const updated = withCommands(readFileSync(configPath, "utf8"), newCommands);
    writeFileSync(configPath, stampVersion(setup ? withSetup(updated, setup) : updated, VERSION));
  }
  const fillIn = newCommands.length > 0 ? [`New command${newCommands.length > 1 ? "s" : ""} to fill in: ${newCommands.join(", ")}. Set it in .groundwork/config.json and add it under Commands in AGENTS.md.`] : [];

  return {
    code: 0,
    output: [`Upgraded Groundwork from ${from} to ${VERSION}.`, ...lines, ...removals, ...additions, ...fillIn, "", "Run `npx groundwork-ai doctor` to check the result."].join("\n"),
  };
}

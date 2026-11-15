// `groundwork flow [on|off]`: show, add or remove the development flow (cards, roles, approval, guards)
// on top of project memory. Only the human switches it: with the flow on, the guard refuses the
// agent's `flow off`, as it refuses `uninstall`.
//
// on:  installs the flow's files, adds its settings to config.json, and rewires each installed adapter.
// off: takes Groundwork's own flow files out (ones you changed stay), and rewires each adapter for
//      project memory only. What the project made with the flow stays: spec, cards, evidence, rules
//      and the flow's settings, so turning it on again continues where it stopped.
import { existsSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCore } from "./core.js";
import { applyFiles } from "./files.js";
import { flowOn, isManaged, layerOf, locateCore, planAdapter, planInit, stampVersion } from "./init.js";
import { editState, readManifest, recordFiles, recordOffered } from "./manifest.js";
import { mergeSettings, type Settings } from "./settings.js";
import { unmergeSettings } from "./uninstall.js";
import { parseJson, readProjectConfig } from "./config.js";
import { decide, describe, installedAdapters, isGeneratedClaudeMd, planManaged, writeSteps } from "./upgrade.js";
import { OPENCODE_FLOW_PLUGIN, OPENCODE_MEMORY_PLUGIN } from "./adapters/opencode.js";
import { NOT_INSTALLED } from "./memory.js";
import { VERSION } from "./version.js";
import type { Io, RunResult } from "./index.js";

const USAGE = "Usage: npx groundwork-ai flow [on|off] [--yes]";

const EXPLAINED =
  "The flow is optional. On top of project memory it adds a build loop: a spec, small cards with evidence, tester, implementer and " +
  "reviewer roles, your approval before each commit, and guards that enforce it.";

function removeEmptyDirs(cwd: string, paths: string[]) {
  const dirs = new Set<string>();
  for (const path of paths) for (let dir = dirname(path); dir !== "." && dir !== ""; dir = dirname(dir)) dirs.add(dir);
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
    const full = join(cwd, dir);
    if (existsSync(full) && readdirSync(full).length === 0) rmdirSync(full);
  }
}

export async function flow(args: string[], io: Io): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };
  const wanted = args.find((arg) => !arg.startsWith("--"));
  const yes = args.includes("--yes");
  const on = flowOn(groundwork);

  if (wanted === undefined) {
    return { code: 0, output: `Flow: ${on ? "on" : "off"}.\n\n${EXPLAINED}\n\nChange it with: npx groundwork-ai flow ${on ? "off" : "on"}` };
  }
  if (wanted !== "on" && wanted !== "off") return { code: 1, output: USAGE };
  if ((wanted === "on") === on) return { code: 0, output: `The flow is already ${wanted}.` };

  const configPath = join(groundwork, "config.json");
  let config: Record<string, unknown>;
  try {
    config = parseJson(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  } catch (error) {
    return { code: 1, output: `.groundwork/config.json can't be read (${(error as Error).message}). Fix it first: \`npx groundwork-ai doctor\`.` };
  }

  const turnOn = wanted === "on";
  const fullCore = readCore(locateCore());
  const adapters = installedAdapters(io.cwd, fullCore);
  const manifest = readManifest(io.cwd);
  const read = (path: string) => (existsSync(join(io.cwd, path)) ? readFileSync(join(io.cwd, path), "utf8") : undefined);
  // Still exactly what Groundwork wrote (or would generate now), so removing it loses nothing.
  const untouched = (path: string, generated?: string) => {
    const current = read(path);
    if (current === undefined) return false;
    if (generated !== undefined && current.replace(/\r\n/g, "\n") === generated) return true;
    return editState(manifest, path, current) === "unchanged";
  };

  // What the new layer set installs, as upgrade would plan it.
  const planned = planManaged(io.cwd, fullCore, turnOn);
  const managed = planned.filter(isManaged);
  const steps = decide(io.cwd, managed);
  // Project files the flow needs and the project doesn't have yet (spec, rules, empty folders).
  const projectFiles = turnOn
    ? planInit(fullCore, "none", VERSION, true).filter((f) => !isManaged(f) && f.path.startsWith(".groundwork/") && f.path !== ".groundwork/config.json" && !existsSync(join(io.cwd, f.path)))
    : [];

  // What only the old layer set had.
  const stays = new Set(planned.map((f) => f.path));
  const oldManaged = planManaged(io.cwd, fullCore, !turnOn).filter(isManaged).filter((f) => !stays.has(f.path));
  const removable = oldManaged.filter((f) => untouched(f.path, f.content));
  const keptEdited = oldManaged.filter((f) => read(f.path) !== undefined && !untouched(f.path, f.content));
  const otherPlugin = turnOn ? OPENCODE_MEMORY_PLUGIN : OPENCODE_FLOW_PLUGIN;
  if (adapters.includes("opencode") && read(otherPlugin) !== undefined && !oldManaged.some((f) => f.path === otherPlugin)) {
    removable.push({ path: otherPlugin, content: "" });
  }

  const list = [
    ...steps.map(describe),
    ...projectFiles.map((f) => `  create     ${f.path}`),
    ...removable.map((f) => `  remove     ${f.path}`),
    ...keptEdited.map((f) => `  keep       ${f.path} (you changed it; it is no longer used)`),
    ...(adapters.includes("claude-code") ? ["  merge      .claude/settings.json"] : []),
    `  set        flow: ${turnOn} in .groundwork/config.json`,
  ];

  if (!yes) {
    if (!io.interactive) {
      return { code: 1, output: [`Turning the flow ${wanted} would change:`, ...list, "", `Nothing was changed. Run \`npx groundwork-ai flow ${wanted} --yes\` to apply it.`].join("\n") };
    }
    const question = turnOn
      ? `Turn the flow on? ${EXPLAINED} [Y/n]: `
      : "Turn the flow off? Its commands, roles and guards are removed, and commits are no longer checked or approved. " +
        "Your spec, cards, evidence and rules stay, and project memory keeps working. [y/N]: ";
    const answer = (await io.ask(question)).trim().toLowerCase();
    const agreed = turnOn ? answer !== "n" && answer !== "no" : answer === "y" || answer === "yes";
    if (!agreed) return { code: 0, output: "Nothing was changed." };
  }

  // Config first: the flow's settings are added from its template, and nothing the project set is lost.
  const template = parseJson(layerOf(fullCore, true)["templates/config.json"] ?? "{}") as Record<string, unknown>;
  const { $schema: _schema, version: _version, flow: _flow, ...defaults } = template;
  const next = turnOn ? { ...defaults, ...config, flow: true } : { ...config, flow: false };
  writeFileSync(configPath, stampVersion(JSON.stringify(next, null, 2), VERSION));

  writeSteps(io.cwd, steps);
  const auto = { ...io, ask: async () => "y" };
  await applyFiles(projectFiles, auto, false);
  for (const file of removable) rmSync(join(io.cwd, file.path), { force: true });
  removeEmptyDirs(io.cwd, removable.map((f) => f.path));
  // Local records of the human's messages mean nothing without the flow, and are no longer ignored by git.
  if (!turnOn) rmSync(join(groundwork, ".approvals"), { recursive: true, force: true });

  // Adapters: settings.json keeps the user's own hooks; Groundwork's are replaced by the new set.
  const core = layerOf(fullCore, turnOn);
  const models = readProjectConfig(groundwork).models;
  for (const tool of adapters) {
    for (const file of planAdapter(core, tool, models, turnOn)) {
      const current = read(file.path);
      if (file.mode === "merge-settings") {
        let settings: Settings = {};
        try {
          settings = current === undefined ? {} : (parseJson(current) as Settings);
        } catch {
          continue; // doctor reports an unreadable settings file
        }
        writeFileSync(join(io.cwd, file.path), JSON.stringify(mergeSettings(unmergeSettings(settings), parseJson(file.content) as Settings), null, 2) + "\n");
      } else if (file.path === "CLAUDE.md" && current !== undefined && isGeneratedClaudeMd(current)) {
        writeFileSync(join(io.cwd, file.path), file.content);
      }
    }
  }
  recordFiles(io.cwd, managed, VERSION);
  recordOffered(io.cwd, steps.filter((s) => s.action === "keep").map((s) => s.file), VERSION);

  const kept = steps.filter((s) => s.action === "keep");
  const notes = [
    ...(kept.length > 0 ? [`You changed ${kept.length} of Groundwork's files, so they were kept. Compare each with its .new file, merge what you want, then delete the .new file.`] : []),
    ...(turnOn
      ? [
          "Next: type /gw in your AI tool. It runs setup: a short interview, and it rebuilds AGENTS.md's \"How we work\" from .groundwork/templates/AGENTS.md with your OK.",
          "Only you can turn the flow off again (`npx groundwork-ai flow off`): the guards keep the agent from doing it.",
        ]
      : [
          "Your spec, cards, evidence and rules are still in .groundwork/. Turn the flow back on with `npx groundwork-ai flow on`.",
          "AGENTS.md is yours and wasn't changed: take the flow's \"How we work\" steps out of it, or replace them from .groundwork/templates/AGENTS.md.",
        ]),
  ];
  return { code: 0, output: [`The flow is now ${wanted}.`, ...list, "", ...notes].join("\n") };
}

// `groundwork uninstall`: take out what Groundwork added, and nothing the user wrote or changed.
// Adapter files are removed only if they're exactly what Groundwork generates. Hook entries, the
// pointer line and .gitattributes lines are taken out of files that are otherwise kept.
// .groundwork/ holds the project's own spec, cards and evidence, so it goes only after one question.
import { existsSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readCore } from "./core.js";
import { parseJson, readProjectConfig } from "./config.js";
import { GITATTRIBUTES, locateCore, planAdapter } from "./init.js";
import { isGeneratedClaudeMd } from "./upgrade.js";
import type { Settings } from "./settings.js";
import type { Io, RunResult } from "./index.js";

const AGENTS_POINTER = "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md.";

// Pure: the user's settings without Groundwork's hook entries (any entry whose commands all run
// something in .groundwork/). Empty events and an empty hooks key go too.
export function unmergeSettings(settings: Settings): Settings {
  const out: Settings = { ...settings };
  const hooks: Record<string, unknown[]> = {};
  for (const [event, entries] of Object.entries(settings.hooks ?? {})) {
    const kept = entries.filter((entry) => {
      const commands = (entry.hooks ?? []).map((h) => h.command ?? "");
      return commands.length === 0 || !commands.every((c) => c.includes(".groundwork/"));
    });
    if (kept.length > 0) hooks[event] = kept;
  }
  if (Object.keys(hooks).length > 0) out.hooks = hooks as Settings["hooks"];
  else delete out.hooks;
  return out;
}

// Pure: text without the given lines, keeping the file's own line endings.
export function withoutLines(text: string, remove: Set<string>): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  return text
    .split(/\r?\n/)
    .filter((line) => !remove.has(line))
    .join(eol);
}

// Pure: .gitattributes without Groundwork's blocks. A line like `*.png binary` is common, so it's only
// taken out where it sits under one of Groundwork's own "# ..." headers; the same line elsewhere is the
// user's.
export function withoutGroundworkAttributes(text: string): string {
  const ours = GITATTRIBUTES.split("\n").filter((line) => line !== "");
  const headers = new Set(ours.filter((line) => line.startsWith("#")));
  const rules = new Set(ours.filter((line) => !line.startsWith("#")));
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const kept: string[] = [];
  let inBlock = false;
  for (const line of text.split(/\r?\n/)) {
    if (headers.has(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock && rules.has(line)) continue;
    inBlock = false;
    kept.push(line);
  }
  return kept.join(eol);
}

function removeEmptyDirs(cwd: string, paths: string[]) {
  const dirs = new Set<string>();
  for (const path of paths) {
    for (let dir = dirname(path); dir !== "." && dir !== ""; dir = dirname(dir)) dirs.add(dir);
  }
  // Deepest first, so a parent is only tried once its children are gone.
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
    const full = join(cwd, dir);
    if (existsSync(full) && readdirSync(full).length === 0) rmdirSync(full);
  }
}

export async function uninstall(args: string[], io: Io): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  const dryRun = args.includes("--dry-run");
  const keepState = args.includes("--keep-state");
  const read = (path: string) => (existsSync(join(io.cwd, path)) ? readFileSync(join(io.cwd, path), "utf8") : undefined);

  // Build what the adapters would generate from the project's own core, as `adapter add` does.
  const core = readCore(existsSync(join(groundwork, "commands")) ? groundwork : locateCore());
  const models = readProjectConfig(groundwork).models;

  const lines: string[] = [];
  const kept: string[] = [];
  const removed: string[] = [];
  const act = (fn: () => void) => {
    if (!dryRun) fn();
  };

  for (const tool of ["claude-code", "opencode"] as const) {
    for (const file of planAdapter(core, tool, models)) {
      const current = read(file.path);
      if (current === undefined || file.path === ".gitattributes") continue;

      if (file.path === "CLAUDE.md") {
        if (isGeneratedClaudeMd(current)) {
          lines.push(`  remove     CLAUDE.md`);
          act(() => rmSync(join(io.cwd, "CLAUDE.md")));
        } else {
          kept.push("CLAUDE.md (yours; it still loads AGENTS.md with @AGENTS.md)");
        }
        continue;
      }

      if (file.mode === "merge-settings") {
        let settings: Settings;
        try {
          settings = parseJson(current) as Settings;
        } catch {
          kept.push(`${file.path} (not valid JSON; remove Groundwork's hooks by hand)`);
          continue;
        }
        const rest = unmergeSettings(settings);
        if (JSON.stringify(rest) === JSON.stringify(settings)) continue;
        if (Object.keys(rest).length === 0) {
          lines.push(`  remove     ${file.path}`);
          act(() => rmSync(join(io.cwd, file.path)));
          removed.push(file.path);
        } else {
          lines.push(`  edit       ${file.path} (Groundwork's hooks taken out)`);
          act(() => writeFileSync(join(io.cwd, file.path), JSON.stringify(rest, null, 2) + "\n"));
        }
        continue;
      }

      if (current === file.content) {
        lines.push(`  remove     ${file.path}`);
        act(() => rmSync(join(io.cwd, file.path)));
        removed.push(file.path);
      } else {
        kept.push(`${file.path} (changed since Groundwork wrote it)`);
      }
    }
  }

  // AGENTS.md: take out the pointer Groundwork appended to the project's own file. One Groundwork
  // wrote from its template is the project's instructions by now, so it stays for the human to decide.
  const agents = read("AGENTS.md");
  if (agents !== undefined) {
    if (agents.split(/\r?\n/).includes(AGENTS_POINTER)) {
      lines.push("  edit       AGENTS.md (Groundwork's pointer line taken out)");
      act(() => writeFileSync(join(io.cwd, "AGENTS.md"), withoutLines(agents, new Set([AGENTS_POINTER]))));
    } else if (agents.includes("This project uses [Groundwork]")) {
      kept.push("AGENTS.md (written by Groundwork's setup and filled in for this project; delete it if you don't want it)");
    }
  }

  const attributes = read(".gitattributes");
  if (attributes !== undefined) {
    const rest = withoutGroundworkAttributes(attributes);
    if (rest !== attributes) {
      if (rest.trim() === "") {
        lines.push("  remove     .gitattributes");
        act(() => rmSync(join(io.cwd, ".gitattributes")));
      } else {
        lines.push("  edit       .gitattributes (Groundwork's lines taken out)");
        act(() => writeFileSync(join(io.cwd, ".gitattributes"), rest.replace(/(\r?\n){3,}/g, "$1$1")));
      }
    }
  }

  act(() => removeEmptyDirs(io.cwd, removed));

  if (existsSync(groundwork)) {
    if (keepState) {
      kept.push(".groundwork/ (--keep-state)");
    } else if (dryRun) {
      lines.push("  ask        before deleting .groundwork/ (your spec, cards, decisions and evidence)");
    } else {
      const answer = (
        await io.ask("Delete .groundwork/ too? It holds this project's spec, cards, decisions, lessons and evidence. [y/N]: ")
      )
        .trim()
        .toLowerCase();
      if (answer === "y" || answer === "yes") {
        rmSync(groundwork, { recursive: true, force: true });
        lines.push("  remove     .groundwork/");
      } else {
        kept.push(".groundwork/ (you chose to keep it)");
      }
    }
  }

  if (lines.length === 0 && kept.length === 0) {
    return { code: 0, output: "Groundwork isn't installed here. Nothing to remove." };
  }
  return {
    code: 0,
    output: [
      dryRun ? "Dry run: uninstalling would change:" : "Removed Groundwork.",
      ...lines,
      ...(kept.length > 0 ? ["", "Kept:", ...kept.map((k) => `  ${k}`)] : []),
      ...(dryRun ? ["Nothing was written."] : []),
    ].join("\n"),
  };
}

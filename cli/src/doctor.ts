// `groundwork doctor`: harness health and the context budget (SPEC §10).
// Problems make it exit 1 (so it can run in CI); suggestions don't.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCore } from "./core.js";
import { planAdapter } from "./init.js";
import { estimateTokens } from "./tokens.js";
import { sectionBody, withoutComments } from "./frontmatter.js";
import { parseCard } from "./cards.js";
import { compareVersions, VERSION } from "./version.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `groundwork init` in your project's folder first.";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

// What's lost when one of Groundwork's Claude Code hooks is missing.
const HOOK_EFFECT: Record<string, string> = {
  PreToolUse: "guard hook, so guards won't run",
  SessionStart: "session-start hook, so new sessions aren't told where things stand",
};

interface Findings {
  problems: string[];
  suggestions: string[];
}

function checkBudget(cwd: string, budget: number, f: Findings): string {
  const files = ["AGENTS.md", "CLAUDE.md"].filter((name) => existsSync(join(cwd, name)));
  const tokens = files.reduce((sum, name) => sum + estimateTokens(read(join(cwd, name))), 0);
  if (tokens > budget) {
    f.problems.push(
      `${files.join(" and ")} are ≈${tokens} tokens, over the ${budget}-token budget. Move rules that rarely matter ` +
        "back to .groundwork/LESSONS.md as notes, or raise tokenBudget in .groundwork/config.json.",
    );
  }
  return `Always loaded: ≈${tokens} tokens (budget ${budget})`;
}

function checkGuards(groundwork: string, guards: string[], f: Findings) {
  for (const name of guards) {
    if (!existsSync(join(groundwork, "guards", `${name}.mjs`))) {
      f.problems.push(
        `Guard "${name}" is listed in config.json, but .groundwork/guards/${name}.mjs doesn't exist. ` +
          "Remove it from guards or add the file.",
      );
    }
  }
}

function checkAdapters(cwd: string, groundwork: string, behind: boolean, f: Findings) {
  const core = readCore(groundwork);
  for (const tool of ["claude-code", "opencode"] as const) {
    const planned = planAdapter(core, tool).filter((file) => file.mode !== "append-lines");
    const installed = planned.some((file) => file.mode === "replace" && file.path !== "CLAUDE.md" && existsSync(join(cwd, file.path)));
    if (!installed) continue;

    // An older project's adapter files are out of date because the whole install is: upgrade fixes both.
    const fix = behind
      ? "Run `groundwork upgrade` to update it."
      : `Run \`groundwork adapter add ${tool}\` to refresh it (it asks before overwriting).`;
    for (const file of planned) {
      const current = read(join(cwd, file.path));
      if (file.path === "CLAUDE.md") {
        // Users may keep their own CLAUDE.md; it only has to load AGENTS.md.
        if (!current.includes("@AGENTS.md")) f.problems.push(`CLAUDE.md doesn't load AGENTS.md. Add the line @AGENTS.md.`);
      } else if (file.mode === "merge-settings") {
        const hooks = JSON.parse(file.content).hooks as Record<string, { hooks: { command: string }[] }[]>;
        for (const [event, entries] of Object.entries(hooks)) {
          const command = entries[0].hooks[0].command;
          if (!current.includes(command.replace(/"/g, '\\"'))) {
            f.problems.push(`${file.path} is missing Groundwork's ${HOOK_EFFECT[event] ?? `${event} hook`}. ${fix}`);
          }
        }
      } else if (current !== file.content) {
        f.problems.push(`${file.path} ${current === "" ? "is missing" : "differs from what Groundwork would generate"}. ${fix}`);
      }
    }
  }
}

function checkCards(groundwork: string, f: Findings): string {
  const dir = join(groundwork, "cards");
  if (!existsSync(dir)) return "";
  let allText = "";
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const text = read(join(dir, name));
    allText += text;
    const card = parseCard(text);
    if (!card) continue;
    const decisions = withoutComments(sectionBody(text, "History"))
      .split("\n")
      .filter((line) => /\b(approved|rejected)\b/i.test(line));
    const last = decisions.at(-1) ?? "";
    if (/\bapproved\b/i.test(last) && !/\brejected\b/i.test(last) && card.status !== "done") {
      f.problems.push(
        `Card ${card.id}: History says it was approved, but its status is "${card.status}". ` +
          "Set it to done, or add a History line explaining why not.",
      );
    }
  }
  return allText;
}

function checkLessons(cwd: string, groundwork: string, cardText: string, f: Findings) {
  const lessons = [...withoutComments(read(join(groundwork, "LESSONS.md"))).matchAll(/^### (L-\d+)/gm)].map((m) => m[1]);
  const agents = read(join(cwd, "AGENTS.md"));
  for (const id of lessons) {
    if (!cardText.includes(id) && !agents.includes(id)) {
      f.suggestions.push(`${id} is never cited in any card or AGENTS.md. If it no longer matters, archive it.`);
    }
  }
  const rules = withoutComments(sectionBody(agents, "Rules"))
    .split("\n")
    .filter((line) => line.startsWith("- ") && !/L-\d+/.test(line));
  for (const rule of rules) {
    f.suggestions.push(`Rule "${rule.slice(2).trim()}" in AGENTS.md has no lesson ID. Record where it came from in LESSONS.md.`);
  }
}

// True when the project's Groundwork files are older than this CLI.
function checkVersion(projectVersion: string | undefined, f: Findings): boolean {
  if (projectVersion !== undefined && compareVersions(projectVersion, VERSION) >= 0) return false;
  const from = projectVersion ? `version ${projectVersion}` : "an older version (no version stamp)";
  f.suggestions.push(`This project's Groundwork files are from ${from}; the CLI is ${VERSION}. Run \`groundwork upgrade\` to update them.`);
  return true;
}

export function doctor(io: Pick<Io, "cwd">): RunResult {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };

  const configText = read(join(groundwork, "config.json"));
  const config = JSON.parse(configText || "{}") as { tokenBudget?: number; guards?: string[]; version?: string };
  const f: Findings = { problems: [], suggestions: [] };

  const behind = configText !== "" && checkVersion(config.version, f);
  const budgetLine = checkBudget(io.cwd, config.tokenBudget ?? 2000, f);
  checkGuards(groundwork, config.guards ?? [], f);
  checkAdapters(io.cwd, groundwork, behind, f);
  const cardText = checkCards(groundwork, f);
  checkLessons(io.cwd, groundwork, cardText, f);

  const lines = ["Groundwork doctor", "", budgetLine, ""];
  if (f.problems.length === 0) lines.push("No problems found.");
  else lines.push(`Problems (${f.problems.length}):`, ...f.problems.map((p) => `  ✗ ${p}`));
  if (f.suggestions.length > 0) lines.push("", `Suggestions (${f.suggestions.length}):`, ...f.suggestions.map((s) => `  • ${s}`));
  return { code: f.problems.length > 0 ? 1 : 0, output: lines.join("\n") };
}

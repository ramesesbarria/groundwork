// `groundwork doctor`: harness health and the context budget.
// Problems make it exit 1 (so it can run in CI); suggestions don't.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { readCore } from "./core.js";
import { planAdapter } from "./init.js";
import { estimateTokens } from "./tokens.js";
import { sectionBody, withoutComments } from "./frontmatter.js";
import { nextReady, parseCard } from "./cards.js";
import { compareVersions, VERSION } from "./version.js";
import { parseJson, readProjectConfig } from "./config.js";
import { rolesOf } from "./adapters/shared.js";
import { checkProject } from "./check.js";
import { alreadyMerged, readManifest } from "./manifest.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");

// What's lost when one of Groundwork's Claude Code hooks is missing.
const HOOK_EFFECT: Record<string, string> = {
  PreToolUse: "guard hook, so guards won't run",
  SessionStart: "session-start hook, so new sessions aren't told where things stand",
  UserPromptSubmit: "user-prompt hook, so the commit gate can't see your approvals and blocks per-card card commits",
};

interface Findings {
  problems: string[];
  suggestions: string[];
}

// The name and description lines of each file: what a tool keeps in context from a skill, command or
// subagent so the model knows it exists. The body loads only when it's used.
function listingTokens(dir: string, pattern: RegExp): number {
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return existsSync(join(path, "SKILL.md")) && pattern.test(entry.name) ? [join(path, "SKILL.md")] : [];
    return pattern.test(entry.name) ? [path] : [];
  });
  return files.reduce((sum, path) => {
    const lines = read(path).split(/\r?\n/).filter((line) => /^(name|description):/.test(line));
    return sum + estimateTokens(lines.join("\n"));
  }, 0);
}

async function sessionStartTokens(groundwork: string): Promise<number> {
  const hook = join(groundwork, "hooks", "session-start.mjs");
  if (!existsSync(hook)) return 0;
  try {
    const { orientation } = (await import(pathToFileURL(hook).href)) as { orientation?: (dir: string) => string };
    return orientation ? estimateTokens(orientation(dirname(groundwork)) ?? "") : 0;
  } catch {
    return 0;
  }
}

async function checkBudget(cwd: string, budget: number, f: Findings): Promise<{ lines: string[]; tokens: number }> {
  const parts: [string, number][] = [];
  for (const name of ["AGENTS.md", "CLAUDE.md"]) if (existsSync(join(cwd, name))) parts.push([name, estimateTokens(read(join(cwd, name)))]);
  parts.push(["skill list", listingTokens(join(cwd, ".claude/skills"), /^gw/)]);
  parts.push(["subagent list", listingTokens(join(cwd, ".claude/agents"), /^gw-.*\.md$/) + listingTokens(join(cwd, ".opencode/agents"), /^gw-.*\.md$/)]);
  // OpenCode's custom command descriptions aren't counted: a 2,000-token description left the model's
  // prompt unchanged on OpenCode 2.0.32 (checked 2026-10-19), so they're a menu for the human.
  // Session-start lines reach a session only through an adapter's hook or plugin.
  const wired = read(join(cwd, ".claude/settings.json")).includes("session-start") || existsSync(join(cwd, ".opencode/plugins/groundwork-guards.js"));
  if (wired) parts.push(["session start", await sessionStartTokens(join(cwd, ".groundwork"))]);
  const shown = parts.filter(([, n]) => n > 0);
  const tokens = shown.reduce((sum, [, n]) => sum + n, 0);
  if (tokens > budget) {
    f.problems.push(
      `What every session loads is ≈${tokens} tokens, over the ${budget}-token budget. Move rules that rarely matter ` +
        "back to .groundwork/LESSONS.md as notes, or raise tokenBudget in .groundwork/config.json.",
    );
  }
  return {
    lines: [`Always loaded:  ≈${tokens} tokens (budget ${budget}): ${shown.map(([name, n]) => `${name} ${n}`).join(", ")}`],
    tokens,
  };
}

// Every role rereads the card, so a long History or Evidence section is paid for again and again.
// The same limit as CARD_TOKEN_LIMIT in core/guards/lib/cards.mjs, whose size rule check, doctor and the
// commit gate share; a test ties the two together.
export const CARD_TOKEN_LIMIT = 1500;

interface CardFile {
  name: string;
  text: string;
  card: ReturnType<typeof parseCard>;
}

function readCardFiles(groundwork: string): CardFile[] {
  const dir = join(groundwork, "cards");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".md"))
    .map((name) => {
      const text = read(join(dir, name));
      return { name, text, card: parseCard(text) };
    });
}

// What a session pays before it does anything: Groundwork's files, not the AI tool's own prompt.
function startupCost(groundwork: string, always: number, cards: CardFile[]): string[] {
  const tokensOf = (path: string) => estimateTokens(read(join(groundwork, path)));
  const parsed = cards.flatMap((c) => (c.card ? [c.card] : []));
  const current =
    parsed.find((c) => ["testing", "implementing", "review", "awaiting-approval"].includes(c.status)) ?? nextReady(parsed);
  const cardFile = current && cards.find((c) => c.card?.id === current.id);
  const card = cardFile ? estimateTokens(cardFile.text) : 0;
  const handoff = tokensOf("HANDOFF.md");

  const loads = ["AGENTS.md", "gw.md", "HANDOFF.md", ...(current ? [`card ${current.id}`] : [])].join(", ");
  const roles = ["tester", "implementer", "reviewer"]
    .map((role) => `${role} ≈${always + tokensOf(`roles/${role}.md`) + handoff + card}`)
    .join(" · ");
  return [
    `Session start:  ≈${always + tokensOf("commands/gw.md") + handoff + card} tokens for gw (${loads})`,
    `Role start:     ${roles}, before reading code and tests`,
    "Your AI tool's own instructions come on top of these.",
  ];
}

// A text file starting with a UTF-16 byte order mark: Windows PowerShell 5.1's `>` writes these.
function isUtf16(path: string): boolean {
  const head = readFileSync(path).subarray(0, 2);
  return head.length === 2 && ((head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff));
}

function textFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return /\.(txt|md|log|json|csv|html?|xml)$/i.test(entry.name) ? [path] : [];
  });
}

function checkEvidenceEncoding(groundwork: string, f: Findings) {
  const utf16 = textFiles(join(groundwork, "evidence")).filter(isUtf16);
  if (utf16.length === 0) return;
  const first = relative(groundwork, utf16[0]).replace(/\\/g, "/");
  // A problem, not a suggestion: git won't diff these, and GitHub won't show them.
  f.problems.push(
    `${utf16.length} evidence file${utf16.length === 1 ? " is" : "s are"} UTF-16 (e.g. .groundwork/${first}), so git and GitHub treat ` +
      "them as binary. Save them as UTF-8 without a byte order mark: write them with the AI tool's file-write tool or " +
      "`node -e`, not `>`. (In Windows PowerShell 5.1, `Out-File -Encoding utf8` adds a byte order mark; " +
      "`[IO.File]::WriteAllText(path, text)` doesn't.)",
  );
}

// Longer than this, a History or Evidence line is carrying detail that belongs in an evidence file.
const LINE_LIMIT = 200;

function checkLongLines(cards: CardFile[], f: Findings) {
  for (const { name, text, card } of cards) {
    const id = card?.id ?? name;
    for (const section of ["History", "Evidence"]) {
      const long = withoutComments(sectionBody(text, section))
        .split(/\r?\n/)
        .filter((line) => line.length > LINE_LIMIT);
      if (long.length > 0) {
        f.suggestions.push(
          `Card ${id}: ${long.length} ${section} line${long.length === 1 ? " is" : "s are"} over ${LINE_LIMIT} characters ` +
            `(e.g. "${long[0].slice(0, 60)}…"). Move the detail into an evidence file.`,
        );
      }
    }
  }
}

// A `.groundwork/** text` rule with no binary override makes git rewrite evidence images.
function checkGitAttributes(cwd: string, f: Findings) {
  const path = join(cwd, ".gitattributes");
  if (!existsSync(path)) return;
  const text = read(path);
  if (!text.includes(".groundwork/** text")) return;
  if (/^\*\.png binary$/m.test(text)) return;
  f.suggestions.push(
    "`.gitattributes` marks .groundwork/** as text, so git rewrites evidence images (screenshots) and breaks them. " +
      "Add `*.png binary` (and jpg/jpeg/webp/gif), or run `npx groundwork-ai upgrade`.",
  );
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

// Model hints for roles that don't exist are ignored by the adapters, which is probably a typo.
function checkModels(groundwork: string, f: Findings) {
  const roles = new Set(rolesOf(readCore(groundwork)).map((r) => r.name));
  for (const name of Object.keys(readProjectConfig(groundwork).models ?? {})) {
    if (!roles.has(name)) {
      f.suggestions.push(`"models" in config.json has "${name}", which isn't a role (${[...roles].join(", ")}). It's ignored.`);
    }
  }
}

function checkAdapters(cwd: string, groundwork: string, behind: boolean, f: Findings) {
  const core = readCore(groundwork);
  const models = readProjectConfig(groundwork).models;
  const manifest = readManifest(cwd);
  for (const tool of ["claude-code", "opencode"] as const) {
    const planned = planAdapter(core, tool, models).filter((file) => file.mode !== "append-lines");
    const installed = planned.some((file) => (file.mode ?? "replace") === "replace" && file.path !== "CLAUDE.md" && existsSync(join(cwd, file.path)));
    if (!installed) continue;

    // An older project's adapter files are out of date because the whole install is: upgrade fixes both.
    const fix = behind
      ? "Run `npx groundwork-ai upgrade` to update it."
      : `Run \`npx groundwork-ai adapter add ${tool}\` to refresh it (it asks before overwriting).`;
    for (const file of planned) {
      const current = read(join(cwd, file.path));
      if (file.path === "CLAUDE.md") {
        // Users may keep their own CLAUDE.md; it only has to load AGENTS.md.
        if (!current.includes("@AGENTS.md")) f.problems.push(`CLAUDE.md doesn't load AGENTS.md. Add the line @AGENTS.md.`);
      } else if (file.mode === "merge-settings") {
        const hooks = JSON.parse(file.content).hooks as Record<string, { hooks: { command: string; onFailure?: string }[] }[]>;
        let installed: { hooks?: Record<string, { hooks?: { command?: string; onFailure?: string }[] }[]> } = {};
        try {
          installed = parseJson(current || "{}") as typeof installed;
        } catch {
          // An unreadable file is reported below as a missing hook.
        }
        for (const [event, entries] of Object.entries(hooks)) {
          const ours = entries[0].hooks[0];
          if (!current.includes(ours.command.replace(/"/g, '\\"'))) {
            f.problems.push(`${file.path} is missing Groundwork's ${HOOK_EFFECT[event] ?? `${event} hook`}. ${fix}`);
            continue;
          }
          const hook = (installed.hooks?.[event] ?? []).flatMap((entry) => entry.hooks ?? []).find((h) => h.command === ours.command);
          if (ours.onFailure && hook?.onFailure !== ours.onFailure) {
            f.problems.push(
              `${file.path}: Groundwork's guard hook doesn't set "onFailure": "${ours.onFailure}", so Claude Code lets a call through when the guard can't run. Add it to that hook.`,
            );
          }
        }
      } else if (current.replace(/\r\n/g, "\n") !== file.content && !alreadyMerged(cwd, manifest, file)) {
        f.problems.push(`${file.path} ${current === "" ? "is missing" : "differs from what Groundwork would generate"}. ${fix}`);
      }
    }
  }
}

// Guard and hook scripts that won't load. The guards then block every call, so say which file and how
// to get it back.
async function checkScriptsLoad(cwd: string, groundwork: string, f: Findings) {
  const scripts = ["guards", "guards/lib", "hooks"].flatMap((dir) =>
    existsSync(join(groundwork, dir)) ? readdirSync(join(groundwork, dir)).filter((n) => n.endsWith(".mjs")).map((n) => join(groundwork, dir, n)) : [],
  );
  for (const script of scripts) {
    try {
      await import(pathToFileURL(script).href);
    } catch (error) {
      const path = relative(cwd, script).split("\\").join("/");
      f.problems.push(
        `${path} can't load (${(error as Error).message.split("\n")[0]}), so the guards block every call. ` +
          "Restore it from Git if it's committed, or delete it and run `npx groundwork-ai upgrade`.",
      );
    }
  }
}

// The guard hook's onFailure: "block" needs Claude Code 2.1.295 or later (code.claude.com/docs/en/hooks;
// changelog 2.1.295). Earlier versions let a call through when the guard can't run.
export const CLAUDE_CODE_MIN = "2.1.295";

// The installed Claude Code version: GROUNDWORK_CLAUDE_CODE_VERSION if set, else `claude --version`.
function claudeCodeVersion(): string | undefined {
  let text = process.env.GROUNDWORK_CLAUDE_CODE_VERSION;
  if (text === undefined) {
    const result = spawnSync("claude", ["--version"], { encoding: "utf8", timeout: 10_000, shell: process.platform === "win32" });
    text = result.status === 0 ? result.stdout : "";
  }
  return text.match(/\d+\.\d+\.\d+/)?.[0];
}

// Pure: one status line for the detected version, and a problem when it's too old.
export function claudeCodeCompatibility(version: string | undefined): { line: string; problem?: string } {
  if (!version) {
    return {
      line: `Claude Code:    version unknown. Groundwork needs ${CLAUDE_CODE_MIN} or later to block tool calls when its guard can't run; check with \`claude --version\`.`,
    };
  }
  if (compareVersions(version, CLAUDE_CODE_MIN) >= 0) return { line: `Claude Code:    ${version} (blocks tool calls when the guard can't run)` };
  return {
    line: `Claude Code:    ${version}, older than ${CLAUDE_CODE_MIN}`,
    problem: `Claude Code ${version} lets tool calls through when Groundwork's guard can't run; that needs ${CLAUDE_CODE_MIN} or later. Update Claude Code.`,
  };
}

// A <file>.new that upgrade left next to a file the user changed: that update isn't active until it's merged.
function checkPendingUpdates(cwd: string, f: Findings) {
  const pending: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(join(cwd, dir))) return;
    for (const entry of readdirSync(join(cwd, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!["cards", "evidence", "work", "private", "decisions", ".approvals"].includes(entry.name)) walk(path);
      } else if (entry.name.endsWith(".new") && existsSync(join(cwd, path.slice(0, -".new".length)))) {
        pending.push(path);
      }
    }
  };
  for (const dir of [".groundwork", ".claude", ".opencode"]) walk(dir);
  if (existsSync(join(cwd, "CLAUDE.md.new"))) pending.push("CLAUDE.md.new");
  for (const path of pending.sort()) {
    const active = path.slice(0, -".new".length);
    f.problems.push(
      `${path} is waiting: you changed ${active}, so upgrade kept yours and ${active} still runs without this version's ` +
        `changes. Merge what you want from ${path} into ${active}, then delete ${path}.`,
    );
  }
}

function checkCards(cards: CardFile[], f: Findings): string {
  let allText = "";
  for (const { text, card } of cards) {
    allText += text;
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

// Cards built straight through (at-end mode) that no review has covered yet, said plainly.
function checkUnreviewed(cards: CardFile[], f: Findings) {
  const parsed = cards.flatMap((c) => (c.card ? [c.card] : []));
  const built = parsed.filter((c) => c.status === "built").map((c) => c.id);
  if (built.length === 0) return;
  const waiting = parsed.some((c) => ["todo", "testing", "implementing", "rejected"].includes(c.status));
  f.suggestions.push(
    `${built.length} card${built.length === 1 ? " is" : "s are"} built but not reviewed yet (${built.join(", ")}). ` +
      (waiting ? "The end review covers them once the rest are built." : "Everything is built: run /gw for the end review, then approve."),
  );
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
  f.suggestions.push(`This project's Groundwork files are from ${from}; the CLI is ${VERSION}. Run \`npx groundwork-ai upgrade\` to update them.`);
  return true;
}

export async function doctor(io: Pick<Io, "cwd">): Promise<RunResult> {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };

  const configText = read(join(groundwork, "config.json"));
  const f: Findings = { problems: [], suggestions: [] };
  let config: { tokenBudget?: number; guards?: string[]; version?: string } = {};
  if (configText === "") {
    f.problems.push(
      ".groundwork/config.json is missing, so this install is broken and the guards block every call. " +
        "Restore it from Git if it's committed, or run `npx groundwork-ai init`, which recreates only missing files (then set " +
        "your choices in it again); the other checks below use default settings.",
    );
  }
  try {
    config = parseJson(configText || "{}") as typeof config;
  } catch (error) {
    f.problems.push(
      `.groundwork/config.json isn't valid JSON (${(error as Error).message}). Until it's fixed, the guards block every call. ` +
        "Fix the file; the other checks below use default settings.",
    );
  }

  const behind = configText !== "" && checkVersion(config.version, f);
  const budget = await checkBudget(io.cwd, config.tokenBudget ?? 2000, f);
  const cards = readCardFiles(groundwork);
  checkGitAttributes(io.cwd, f);
  checkGuards(groundwork, config.guards ?? [], f);
  await checkScriptsLoad(io.cwd, groundwork, f);
  checkAdapters(io.cwd, groundwork, behind, f);
  checkPendingUpdates(io.cwd, f);
  checkModels(groundwork, f);
  const cardText = checkCards(cards, f);
  checkUnreviewed(cards, f);
  for (const card of await checkProject(io.cwd)) {
    for (const problem of card.problems) f.problems.push(`Card ${card.id}: ${problem}. Run \`npx groundwork-ai check ${card.id}\`.`);
  }
  checkLongLines(cards, f); // the size limit itself comes from the shared card rules above
  checkEvidenceEncoding(groundwork, f);
  checkLessons(io.cwd, groundwork, cardText, f);

  const lines = ["Groundwork doctor", "", ...budget.lines, ...startupCost(groundwork, budget.tokens, cards)];
  if (read(join(io.cwd, ".claude/settings.json")).includes(".groundwork/guards/run.mjs")) {
    const compatibility = claudeCodeCompatibility(claudeCodeVersion());
    lines.push(compatibility.line);
    if (compatibility.problem) f.problems.push(compatibility.problem);
  }
  lines.push("");
  if (f.problems.length === 0) lines.push("No problems found.");
  else lines.push(`Problems (${f.problems.length}):`, ...f.problems.map((p) => `  ✗ ${p}`));
  if (f.suggestions.length > 0) lines.push("", `Suggestions (${f.suggestions.length}):`, ...f.suggestions.map((s) => `  • ${s}`));
  return { code: f.problems.length > 0 ? 1 : 0, output: lines.join("\n") };
}

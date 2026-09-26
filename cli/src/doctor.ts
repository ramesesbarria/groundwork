// `groundwork doctor`: harness health and the context budget.
// Problems make it exit 1 (so it can run in CI); suggestions don't.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { readCore } from "./core.js";
import { planAdapter } from "./init.js";
import { estimateTokens } from "./tokens.js";
import { sectionBody, withoutComments } from "./frontmatter.js";
import { nextReady, parseCard } from "./cards.js";
import { compareVersions, VERSION } from "./version.js";
import { readProjectConfig } from "./config.js";
import { rolesOf } from "./adapters/shared.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

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

function checkBudget(cwd: string, budget: number, f: Findings): { line: string; tokens: number } {
  const files = ["AGENTS.md", "CLAUDE.md"].filter((name) => existsSync(join(cwd, name)));
  const tokens = files.reduce((sum, name) => sum + estimateTokens(read(join(cwd, name))), 0);
  if (tokens > budget) {
    f.problems.push(
      `${files.join(" and ")} are ≈${tokens} tokens, over the ${budget}-token budget. Move rules that rarely matter ` +
        "back to .groundwork/LESSONS.md as notes, or raise tokenBudget in .groundwork/config.json.",
    );
  }
  return { line: `Always loaded:  ≈${tokens} tokens (budget ${budget})`, tokens };
}

// Every role rereads the card, so a long History or Evidence section is paid for again and again.
const CARD_TOKEN_LIMIT = 1500;

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
    return /\.(txt|md|log|json)$/i.test(entry.name) ? [path] : [];
  });
}

function checkEvidenceEncoding(groundwork: string, f: Findings) {
  const utf16 = textFiles(join(groundwork, "evidence")).filter(isUtf16);
  if (utf16.length === 0) return;
  const first = relative(groundwork, utf16[0]).replace(/\\/g, "/");
  f.suggestions.push(
    `${utf16.length} evidence file${utf16.length === 1 ? " is" : "s are"} UTF-16 (e.g. .groundwork/${first}), so git and GitHub treat ` +
      "them as binary. Save them as UTF-8; in Windows PowerShell 5.1 use `Out-File -Encoding utf8` instead of `>`.",
  );
}

function checkCardSize(cards: CardFile[], f: Findings) {
  for (const { name, text, card } of cards) {
    const tokens = estimateTokens(text);
    if (tokens <= CARD_TOKEN_LIMIT) continue;
    f.suggestions.push(
      `Card ${card?.id ?? name} is ≈${tokens} tokens, and every role rereads it. Keep its History and Evidence lines ` +
        "to a sentence or two; the details belong in the evidence files.",
    );
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
  for (const tool of ["claude-code", "opencode"] as const) {
    const planned = planAdapter(core, tool, models).filter((file) => file.mode !== "append-lines");
    const installed = planned.some((file) => file.mode === "replace" && file.path !== "CLAUDE.md" && existsSync(join(cwd, file.path)));
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

export function doctor(io: Pick<Io, "cwd">): RunResult {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };

  const configText = read(join(groundwork, "config.json"));
  const config = JSON.parse(configText || "{}") as { tokenBudget?: number; guards?: string[]; version?: string };
  const f: Findings = { problems: [], suggestions: [] };

  const behind = configText !== "" && checkVersion(config.version, f);
  const budget = checkBudget(io.cwd, config.tokenBudget ?? 2000, f);
  const cards = readCardFiles(groundwork);
  checkGitAttributes(io.cwd, f);
  checkGuards(groundwork, config.guards ?? [], f);
  checkAdapters(io.cwd, groundwork, behind, f);
  checkModels(groundwork, f);
  const cardText = checkCards(cards, f);
  checkCardSize(cards, f);
  checkEvidenceEncoding(groundwork, f);
  checkLessons(io.cwd, groundwork, cardText, f);

  const lines = ["Groundwork doctor", "", budget.line, ...startupCost(groundwork, budget.tokens, cards), ""];
  if (f.problems.length === 0) lines.push("No problems found.");
  else lines.push(`Problems (${f.problems.length}):`, ...f.problems.map((p) => `  ✗ ${p}`));
  if (f.suggestions.length > 0) lines.push("", `Suggestions (${f.suggestions.length}):`, ...f.suggestions.map((s) => `  • ${s}`));
  return { code: f.problems.length > 0 ? 1 : 0, output: lines.join("\n") };
}

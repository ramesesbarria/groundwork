// `groundwork retro`: collect signals of repeated mistakes for /gw-retro.
// Sources: git history and Groundwork's own files. It only reports; /gw-retro proposes changes.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCard } from "./cards.js";
import { sectionBody, withoutComments } from "./frontmatter.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

// How many commits after a card commit still count as "soon after".
const SOON = 5;

interface Commit {
  hash: string;
  subject: string;
  files: string[];
}

interface Signal {
  kind: "revert" | "fix-after-card" | "rejection" | "send-back" | "call-rejected";
  text: string;
}

function readCommits(cwd: string): Commit[] | undefined {
  let log: string;
  try {
    log = execFileSync("git", ["log", "--reverse", "--format=%x1e%h%x1f%s", "--name-only"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined; // not a git repo, or no commits yet
  }
  return log
    .split("\x1e")
    .filter((chunk) => chunk.trim() !== "")
    .map((chunk) => {
      const [header = "", ...rest] = chunk.split("\n");
      const [hash = "", subject = ""] = header.split("\x1f");
      return { hash, subject, files: rest.map((f) => f.trim()).filter(Boolean) };
    });
}

export const DEFAULT_COMMIT_FORMAT = "[{id}] {title}";

// A matcher for commit subjects written in the project's commitFormat; group 1 is the card ID.
export function cardIdPattern(format: string): RegExp {
  const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace("\\{id\\}", "(\\d+(?:\\.\\d+)*)").replace("\\{title\\}", ".*")}$`);
}

function gitSignals(commits: Commit[], format: string): Signal[] {
  const pattern = cardIdPattern(format);
  const cardIdOf = (subject: string) => pattern.exec(subject)?.[1];
  const signals: Signal[] = [];
  commits.forEach((commit, i) => {
    if (/^revert\b/i.test(commit.subject)) {
      signals.push({ kind: "revert", text: `${commit.hash} ${commit.subject}` });
    }
    if (!/\bfix(es|ed)?\b/i.test(commit.subject)) return;
    // One signal per fix, naming every recent card whose files it touches: a fix to a
    // file that several cards shared is one mistake, not one per card.
    const ownId = cardIdOf(commit.subject);
    const cards: string[] = [];
    const shared = new Set<string>();
    for (const earlier of commits.slice(Math.max(0, i - SOON), i)) {
      const id = cardIdOf(earlier.subject);
      if (!id || id === ownId) continue;
      const overlap = earlier.files.filter((f) => !f.startsWith(".groundwork/") && commit.files.includes(f));
      if (overlap.length === 0) continue;
      if (!cards.includes(id)) cards.push(id);
      overlap.forEach((f) => shared.add(f));
    }
    if (cards.length > 0) {
      const after = cards.length === 1 ? `card ${cards[0]}` : `cards ${cards.join(", ")}`;
      signals.push({ kind: "fix-after-card", text: `${commit.hash} "${commit.subject}" after ${after}, touching ${[...shared].join(", ")}` });
    }
  });
  return signals;
}

function cardSignals(groundwork: string): Signal[] {
  const dir = join(groundwork, "cards");
  if (!existsSync(dir)) return [];
  const signals: Signal[] = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const text = readFileSync(join(dir, name), "utf8");
    const card = parseCard(text);
    if (!card) continue;
    const calls: string[] = []; // judgment calls made so far on this card
    for (const line of withoutComments(sectionBody(text, "History")).split("\n")) {
      const call = line.match(/\bcall:\s*(.+)$/i);
      if (call) calls.push(call[1].split(" — ")[0].trim());
      const rejected = line.match(/rejected:\s*(.+)$/i);
      if (rejected) {
        signals.push({ kind: "rejection", text: `card ${card.id}: ${rejected[1].trim()}` });
        for (const what of calls.splice(0)) {
          signals.push({ kind: "call-rejected", text: `card ${card.id}: call "${what}", then rejected: ${rejected[1].trim()}` });
        }
      }
      const sentBack = line.match(/review → implementing:?\s*(.+)$/i);
      if (sentBack) signals.push({ kind: "send-back", text: `card ${card.id}: ${sentBack[1].trim()}` });
    }
  }
  return signals;
}

const SECTIONS: [Signal["kind"], string][] = [
  ["revert", "Reverts"],
  ["fix-after-card", "Fixes soon after a card"],
  ["rejection", "Rejections"],
  ["send-back", "Sent back by review"],
  ["call-rejected", "Calls later rejected"],
];

export function report(signals: Signal[], gitNote?: string): string {
  const lines = ["# Retro signals", ""];
  if (gitNote) lines.push(gitNote, "");
  if (signals.length === 0) {
    lines.push("No signals found. Nothing has been reverted, rejected or sent back.");
    return lines.join("\n");
  }
  for (const [kind, title] of SECTIONS) {
    const found = signals.filter((s) => s.kind === kind);
    if (found.length === 0) continue;
    lines.push(`## ${title} (${found.length})`, ...found.map((s) => `- ${s.text}`), "");
  }
  const byLesson = new Map<string, number>();
  // A rejected call repeats its rejection's text, so it isn't counted a second time.
  for (const s of signals.filter((s) => s.kind !== "call-rejected")) {
    for (const id of new Set(s.text.match(/L-\d+/g) ?? [])) byLesson.set(id, (byLesson.get(id) ?? 0) + 1);
  }
  if (byLesson.size > 0) {
    lines.push("## By lesson cited");
    for (const [id, n] of [...byLesson].sort((a, b) => b[1] - a[1])) lines.push(`- ${id}: ${n} signal${n === 1 ? "" : "s"}`);
    lines.push("");
  }
  lines.push("Next: run /gw-retro to turn repeated signals into lessons, rules or guards.");
  return lines.join("\n");
}

export function retro(io: Pick<Io, "cwd">): RunResult {
  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) return { code: 1, output: NOT_INSTALLED };

  const configPath = join(groundwork, "config.json");
  const config = existsSync(configPath) ? (JSON.parse(readFileSync(configPath, "utf8")) as { commitFormat?: string }) : {};
  const commits = readCommits(io.cwd);
  const signals = [...(commits ? gitSignals(commits, config.commitFormat || DEFAULT_COMMIT_FORMAT) : []), ...cardSignals(groundwork)];
  const output = report(signals, commits ? undefined : "Not a git repo (or no commits yet), so only Groundwork's own files were read.");
  writeFileSync(join(groundwork, "retro.md"), output + "\n");
  return { code: 0, output };
}

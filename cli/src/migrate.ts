// `groundwork migrate legacy`: record the current snapshots of done cards that predate the approval
// rule. It does not add approvals, touch evidence, or exempt new cards. The manifest is a migration
// record; a later edit to a legacy card loses the exemption.
//
// A done status alone doesn't make a card historical. Git has to show that the card, unchanged,
// was last committed before the approval rule (`.groundwork/guards/lib/approval.mjs`) entered the
// project. When Git can't show that (no repository, or the card is ignored), the card is listed for
// the human to review, and recorded only with --reviewed.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { locateCore } from "./init.js";
import { parseJson } from "./config.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";
const MANIFEST = ".groundwork/.legacy-cards.json";
const RULE = ".groundwork/guards/lib/approval.mjs";
const USAGE = "Usage: groundwork migrate legacy [--dry-run] [--yes] [--reviewed]";

interface Rules {
  legacyFingerprint(md: string): string;
}

const rules = async (): Promise<Rules> =>
  (await import(pathToFileURL(join(locateCore(), "guards", "lib", "cards.mjs")).href)) as Rules;

function approved(md: string): boolean {
  // Only History counts. A card with the words in its Goal, criteria or a comment hasn't been approved.
  const history = (md.match(/\n## History\s*\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? "").replace(/<!--[\s\S]*?-->/g, "");
  return /^- ?\d{4}-\d{2}-\d{2} approved by human\b/im.test(history);
}

const git = (cwd: string, args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const succeeds = (cwd: string, args: string[]) => {
  try {
    git(cwd, args);
    return true;
  } catch {
    return false;
  }
};

type Verdict = { kind: "record" } | { kind: "review"; why: string } | { kind: "reject"; why: string };

// The commit that first brought the approval rule into the project, or undefined if it isn't
// committed yet (then everything already committed predates it).
function ruleCommit(project: string): string | undefined {
  try {
    return git(project, ["log", "--diff-filter=A", "--reverse", "--format=%H", "--", RULE]).split(/\r?\n/)[0] || undefined;
  } catch {
    return undefined;
  }
}

function historical(project: string, path: string, cutoff: string | undefined): Verdict {
  if (!succeeds(project, ["rev-parse", "--verify", "HEAD"])) {
    return { kind: "review", why: "no Git history to show it predates the approval rule" };
  }
  if (!succeeds(project, ["ls-files", "--error-unmatch", "--", path])) {
    if (succeeds(project, ["check-ignore", "-q", "--", path])) {
      return { kind: "review", why: "Git ignores it, so its history can't be checked" };
    }
    return { kind: "reject", why: "not committed: new work needs an approval" };
  }
  if (!succeeds(project, ["diff", "--quiet", "HEAD", "--", path])) {
    return { kind: "reject", why: "changed since its last commit" };
  }
  const last = git(project, ["log", "-1", "--format=%H", "--", path]);
  if (cutoff && (last === cutoff || !succeeds(project, ["merge-base", "--is-ancestor", last, cutoff]))) {
    return { kind: "reject", why: `committed with or after the approval rule (${cutoff.slice(0, 7)}); it needs an approval` };
  }
  return { kind: "record" };
}

export async function migrate(args: string[], io: Pick<Io, "cwd">): Promise<RunResult> {
  const project = io.cwd;
  if (!existsSync(join(project, ".groundwork"))) return { code: 1, output: NOT_INSTALLED };
  if (args[0] !== "legacy") return { code: 1, output: USAGE };
  const yes = args.includes("--yes");
  const dryRun = args.includes("--dry-run");
  const reviewed = args.includes("--reviewed");
  if (args.slice(1).some((arg) => !["--yes", "--dry-run", "--reviewed"].includes(arg))) return { code: 1, output: USAGE };

  const configPath = join(project, ".groundwork", "config.json");
  if (existsSync(configPath)) {
    try {
      if ((parseJson(readFileSync(configPath, "utf8")) as { integration?: string }).integration === "pr") {
        return { code: 0, output: "This project uses PR integration, so done cards need no local approval line. Nothing to migrate." };
      }
    } catch {
      // let check/doctor report the broken config
    }
  }

  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return { code: 0, output: "No cards yet." };
  const { legacyFingerprint } = await rules();
  let existing: Record<string, string> = {};
  const manifestPath = join(project, MANIFEST);
  if (existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (parsed?.version === 1 && parsed.cards && typeof parsed.cards === "object") existing = parsed.cards;
    } catch {
      return { code: 1, output: `${MANIFEST} isn't valid JSON. Fix or remove it first.` };
    }
  }

  const cutoff = ruleCommit(project);
  const next = { ...existing };
  const added: string[] = [];
  const review: string[] = [];
  const rejected: string[] = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const md = readFileSync(join(dir, name), "utf8");
    const fm = parseFrontmatter(md);
    if (fm.status !== "done" || approved(md)) continue;
    const id = fm.id ?? name;
    const hash = legacyFingerprint(md);
    if (existing[id] === hash) continue;
    if (existing[id] !== undefined) {
      rejected.push(`${id} (changed since migration)`);
      continue;
    }
    const verdict = historical(project, `.groundwork/cards/${name}`, cutoff);
    if (verdict.kind === "reject") {
      rejected.push(`${id} (${verdict.why})`);
      continue;
    }
    if (verdict.kind === "review") {
      review.push(`${id} (${verdict.why})`);
      if (!reviewed) continue;
    }
    next[id] = hash;
    added.push(id);
  }

  if (added.length === 0 && review.length === 0 && rejected.length === 0) return { code: 0, output: "No legacy cards need migration." };
  const reviewNote = reviewed
    ? []
    : review.length > 0
      ? ["", `${review.length} card${review.length === 1 ? "" : "s"} can't be shown to predate the approval rule. Check each one is old work, then re-run with --reviewed to record them.`]
      : [];
  const lines = [
    ...added.map((id) => `  record  ${id}`),
    ...(reviewed ? [] : review.map((s) => `  review  ${s}`)),
    ...rejected.map((s) => `  skip    ${s}`),
    "",
    `${added.length} legacy card${added.length === 1 ? "" : "s"} to record. No approval line or evidence is added.`,
    ...reviewNote,
  ];
  if (dryRun || !yes || added.length === 0) {
    if (added.length > 0) lines.push("", "Nothing written. Re-run with --yes to write .groundwork/.legacy-cards.json.");
    return { code: 0, output: lines.join("\n") };
  }
  writeFileSync(manifestPath, JSON.stringify({ version: 1, at: new Date().toISOString(), cards: Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + "\n");
  lines.push("", `Wrote ${MANIFEST}. New cards are not exempt.`);
  return { code: 0, output: lines.join("\n") };
}

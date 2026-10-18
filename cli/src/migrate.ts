// `groundwork migrate legacy`: record the current snapshots of done cards that predate the approval
// rule. It does not add approvals, touch evidence, or exempt new cards. The manifest is a one-time
// migration record; a later edit to a legacy card loses the exemption.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { locateCore } from "./init.js";
import { parseJson } from "./config.js";
import { parseFrontmatter } from "./frontmatter.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";
const MANIFEST = ".groundwork/.legacy-cards.json";

interface Rules {
  legacyFingerprint(md: string): string;
}

const rules = async (): Promise<Rules> =>
  (await import(pathToFileURL(join(locateCore(), "guards", "lib", "cards.mjs")).href)) as Rules;

function approved(md: string): boolean {
  return /^- ?\d{4}-\d{2}-\d{2} approved by human\b/im.test(md);
}

export async function migrate(args: string[], io: Pick<Io, "cwd">): Promise<RunResult> {
  const project = io.cwd;
  if (!existsSync(join(project, ".groundwork"))) return { code: 1, output: NOT_INSTALLED };
  if (args[0] !== "legacy") return { code: 1, output: "Usage: groundwork migrate legacy [--dry-run] [--yes]" };
  const yes = args.includes("--yes");
  const dryRun = args.includes("--dry-run");
  if (args.slice(1).some((arg) => !["--yes", "--dry-run"].includes(arg))) {
    return { code: 1, output: "Usage: groundwork migrate legacy [--dry-run] [--yes]" };
  }

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

  const next = { ...existing };
  const added: string[] = [];
  const skipped: string[] = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const md = readFileSync(join(dir, name), "utf8");
    const fm = parseFrontmatter(md);
    if (fm.status !== "done" || approved(md)) continue;
    const id = fm.id ?? name;
    const hash = legacyFingerprint(md);
    if (existing[id] === hash) continue;
    if (existing[id] !== undefined) {
      skipped.push(`${id} (changed since migration)`);
      continue;
    }
    next[id] = hash;
    added.push(id);
  }

  if (added.length === 0 && skipped.length === 0) return { code: 0, output: "No legacy cards need migration." };
  const lines = [
    ...added.map((id) => `  record  ${id}`),
    ...skipped.map((s) => `  skip    ${s}`),
    "",
    `${added.length} legacy card${added.length === 1 ? "" : "s"} to record. No approval line or evidence is added.`,
  ];
  if (dryRun || !yes) {
    lines.push("", "Nothing written. Re-run with --yes to write .groundwork/.legacy-cards.json.");
    return { code: 0, output: lines.join("\n") };
  }
  writeFileSync(manifestPath, JSON.stringify({ version: 1, at: new Date().toISOString(), cards: Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + "\n");
  lines.push("", `Wrote ${MANIFEST}. New cards are not exempt.`);
  return { code: 0, output: lines.join("\n") };
}

// `compact`: keeps what every session loads small. Nothing is deleted: whatever leaves the loaded
// set is moved under .groundwork/archive/, where it stays in the repository and can be searched.
//
//   journal     entries beyond the budget (oldest first) go to archive/JOURNAL-<year>.md
//   decisions   superseded records go to archive/decisions/; DECISIONS.md is regenerated
//   handoff     sections Groundwork doesn't define (logs that grew in it) go to archive/HANDOFF-<date>.md,
//               and a handoff in the old bullet layout is rewritten in the 2.0 layout

import { existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import {
  acquireLock,
  budgetsOf,
  estimateTokens,
  extraSections,
  flowEnabled,
  parseHandoff,
  parseJournal,
  readConfig,
  readDecisions,
  readText,
  renderHandoff,
  renderJournal,
  toSections,
  writeAtomic,
  writeDecisionsIndex,
} from "./memory.mjs";

const yearOf = (entry) => entry.match(/^## .*?(\d{4})-\d{2}-\d{2}/)?.[1] ?? "undated";

function append(path, title, blocks) {
  const current = (readText(path) || `# ${title}\n`).replace(/\r\n/g, "\n").trimEnd();
  writeAtomic(path, `${current}\n\n${blocks.join("\n\n")}\n`);
}

// Returns the changes as lines. With `dryRun`, nothing is written.
export function compact(project, { dryRun = false, now = new Date() } = {}) {
  const groundwork = join(project, ".groundwork");
  if (!existsSync(groundwork)) throw new Error("Groundwork isn't installed here.");
  const config = readConfig(groundwork);
  const budgets = budgetsOf(config);
  const archive = join(groundwork, "archive");
  const lines = [];
  const release = dryRun ? undefined : acquireLock(groundwork);
  try {
    // Journal: keep the newest entries that fit the budget, and always the newest one.
    const journalPath = join(groundwork, "JOURNAL.md");
    const journal = parseJournal(readText(journalPath));
    const kept = [];
    let used = estimateTokens(journal.head);
    for (const entry of [...journal.entries].reverse()) {
      used += estimateTokens(entry);
      if (kept.length > 0 && used > budgets.journal) break;
      kept.unshift(entry);
    }
    const old = journal.entries.slice(0, journal.entries.length - kept.length);
    if (old.length > 0) {
      const byYear = new Map();
      for (const entry of old) byYear.set(yearOf(entry), [...(byYear.get(yearOf(entry)) ?? []), entry]);
      for (const [year, entries] of byYear) {
        lines.push(`  archive    ${entries.length} journal entr${entries.length === 1 ? "y" : "ies"} → .groundwork/archive/JOURNAL-${year}.md`);
        if (!dryRun) append(join(archive, `JOURNAL-${year}.md`), `Journal archive ${year}`, entries);
      }
      if (!dryRun) writeAtomic(journalPath, renderJournal({ head: journal.head, entries: kept }));
    }

    // Decisions: superseded records leave the folder every session's index is built from.
    const superseded = readDecisions(groundwork).live.filter((d) => d.status === "superseded");
    for (const decision of superseded) {
      const name = decision.file.split("/").pop();
      lines.push(`  archive    .groundwork/decisions/${name} (superseded) → .groundwork/archive/decisions/${name}`);
      if (!dryRun) {
        mkdirSync(join(archive, "decisions"), { recursive: true });
        renameSync(join(groundwork, "decisions", name), join(archive, "decisions", name));
      }
    }

    // Handoffs: the root one and every worker's.
    const work = join(groundwork, "work");
    const handoffs = [
      "HANDOFF.md",
      ...(existsSync(work) ? readdirSync(work, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(work, e.name, "HANDOFF.md"))).map((e) => `work/${e.name}/HANDOFF.md`) : []),
    ];
    const flow = flowEnabled(groundwork, config);
    for (const rel of handoffs) {
      const path = join(groundwork, rel);
      const text = readText(path);
      if (text === "") continue;
      const handoff = parseHandoff(text);
      if (handoff.format === "empty") continue;
      const extras = extraSections(handoff);
      const oldLayout = handoff.format !== "sections";
      if (extras.length === 0 && !oldLayout) continue;
      const isRoot = rel === "HANDOFF.md";
      const stamp = now.toISOString().slice(0, 10);
      const target = `archive/HANDOFF-${stamp}${isRoot ? "" : `-${rel.split("/")[1]}`}.md`;
      const sections = toSections(handoff, { flow }).filter((s) => !extras.some((e) => e.name === s.name));
      const next = renderHandoff(handoff.meta, sections);
      if (extras.length > 0) lines.push(`  archive    ${extras.length} section${extras.length === 1 ? "" : "s"} of .groundwork/${rel} (${extras.map((e) => e.name).join(", ")}) → .groundwork/${target}`);
      if (oldLayout) lines.push(`  rewrite    .groundwork/${rel} in the 2.0 layout (the old file is kept in .groundwork/${target})`);
      if (!dryRun) {
        // The whole previous file is kept, so a trim can always be undone by hand.
        append(join(groundwork, target), `Handoff archive ${stamp}`, [`<!-- .groundwork/${rel} as it was before \`groundwork compact\` -->`, text.replace(/\r\n/g, "\n").trim()]);
        writeAtomic(path, next);
      }
      const tokens = estimateTokens(next);
      if (tokens > budgets.handoff) {
        lines.push(`  note       .groundwork/${rel} is still ≈${tokens} tokens (budget ${budgets.handoff}): shorten its sections by hand; only you know what still matters`);
      }
    }

    if (!dryRun) {
      if (writeDecisionsIndex(groundwork)) lines.push("  update     .groundwork/DECISIONS.md");
    } else if (superseded.length > 0) lines.push("  update     .groundwork/DECISIONS.md");
    return lines;
  } finally {
    release?.();
  }
}

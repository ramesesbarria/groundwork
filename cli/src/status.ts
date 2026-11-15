// `groundwork status`: where the project stands, from files only.
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { blocked, nextReady, readCards } from "./cards.js";
import { checkProject } from "./check.js";
import { CARD_STATUSES, statusLabel } from "./schema.js";
import { readProjectConfig } from "./config.js";
import { flowOn } from "./init.js";
import { checkpointLib, freshnessLib, memoryLib, NOT_INSTALLED } from "./memory.js";
import type { Io, RunResult } from "./index.js";

const oneLine = (text: string) => {
  const line = text.split("\n").find((l) => l.trim() !== "")?.trim() ?? "";
  return line === "" ? "—" : line.length > 200 ? `${line.slice(0, 199)}…` : line;
};

export async function status(io: Pick<Io, "cwd">): Promise<RunResult> {
  const dir = join(io.cwd, ".groundwork");
  if (!existsSync(dir)) return { code: 1, output: NOT_INSTALLED };

  const [memory, checkpoints, freshness] = await Promise.all([memoryLib(), checkpointLib(), freshnessLib()]);
  const flow = flowOn(dir);
  const target = checkpoints.resolveHandoff(io.cwd);
  const handoff = memory.parseHandoff(existsSync(target.path) ? readFileSync(target.path, "utf8") : "");
  const view = memory.handoffView(handoff);
  const config = memory.readConfig(dir);
  const fresh = freshness.assess(io.cwd, handoff, { staleAfterDays: memory.staleDaysOf(config), groundwork: dir });
  const field = (name: string) => handoff.fields[name] ?? "—";

  const lines: string[] = [];
  // The flow's own fields come first, as they did before 2.0.
  if (flow) lines.push(`Phase:         ${field("Phase")}`, `Current card:  ${field("Current card")}`);
  lines.push(
    `Now:           ${oneLine(view.now)}`,
    `Next step:     ${oneLine(view.next)}`,
    ...(oneLine(view.blockers) !== "—" && !/^none\b/i.test(view.blockers) ? [`Blockers:      ${oneLine(view.blockers)}`] : []),
    ...(oneLine(view.failingChecks) !== "—" && !/^none\b/i.test(view.failingChecks) ? [`Failing:       ${oneLine(view.failingChecks)}`] : []),
    `Handoff:       ${checkpoints.isPristine(handoff) ? "empty" : `${fresh.verdict}: ${fresh.summary}`} (${relative(io.cwd, target.path).split("\\").join("/")})`,
  );
  const workers = target.worker ? [] : checkpoints.listWorkers(io.cwd).filter((w) => w.state === "active");
  // Recorded by `worker start` but not saved yet: still in flight, so still listed.
  const unsaved = target.worker ? [] : checkpoints.unsavedWorkers(io.cwd);
  if (workers.length > 0 || unsaved.length > 0) {
    lines.push("Workers:");
    for (const w of workers) lines.push(`  ${w.id}${w.branch ? ` (${w.branch})` : ""}: ${w.next || w.now || "no next step recorded"}`);
    for (const w of unsaved) lines.push(`  ${w.id}: ${w.goal || "no goal given"} (has not saved a handoff yet)`);
  }
  if (!flow) return { code: 0, output: lines.join("\n") };
  lines.push("");

  const cards = readCards(dir);
  if (cards.length === 0) {
    lines.push("No cards yet. Run gw-spec, then gw-plan.");
    return { code: 0, output: lines.join("\n") };
  }

  const counts = CARD_STATUSES.map((s) => [s, cards.filter((c) => c.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${statusLabel(s)}`);
  lines.push(`Cards:         ${counts.join(" · ")}`);

  const inProgress = cards.filter((c) => ["testing", "implementing", "review", "awaiting-approval"].includes(c.status));
  if (inProgress.length > 0) {
    lines.push(`In progress:   ${inProgress.map((c) => `${c.id} ${c.title} (${statusLabel(c.status)})`).join(", ")}`);
  }
  // Built straight through (at-end mode) and not reviewed yet: said plainly, never rounded up to done.
  const unreviewed = cards.filter((c) => c.status === "built");
  if (unreviewed.length > 0) {
    lines.push(`Not reviewed:  ${unreviewed.map((c) => c.id).join(", ")} (built but not reviewed)`);
  }

  const mode = String(readProjectConfig(dir).approvalMode ?? "per-card");
  const next = nextReady(cards, mode);
  lines.push(`Next ready:    ${next ? `${next.id} ${next.title}` : "none"}`);

  const waiting = blocked(cards, mode);
  if (waiting.length > 0) {
    lines.push("Blocked:");
    for (const { card, waitingOn } of waiting) lines.push(`  ${card.id} ${card.title}  ← waiting on ${waitingOn.join(", ")}`);
  }

  // Open human checks wait for the human; they never fail anything, they're listed so they don't hide.
  const open = (await checkProject(io.cwd, { cardSize: false })).filter((card) => card.openHumanChecks.length > 0);
  if (open.length > 0) {
    lines.push("");
    lines.push("Human checks (open; confirm or waive at approval):");
    for (const card of open) {
      lines.push(`  ${card.id}:`);
      for (const check of card.openHumanChecks) lines.push(`    - ${check}`);
    }
  }
  return { code: 0, output: lines.join("\n") };
}

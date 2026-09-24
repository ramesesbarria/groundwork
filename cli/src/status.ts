// `groundwork status`: where the project stands, from files only.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blocked, nextReady, readCards } from "./cards.js";
import { CARD_STATUSES } from "./schema.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `groundwork init` in your project's folder first.";

// A "- **Field:** value" line from HANDOFF.md.
function handoffField(handoff: string, field: string): string | undefined {
  return handoff.match(new RegExp(`^- \\*\\*${field}:\\*\\*\\s*(.*)$`, "m"))?.[1]?.trim();
}

export function status(io: Pick<Io, "cwd">): RunResult {
  const dir = join(io.cwd, ".groundwork");
  if (!existsSync(dir)) return { code: 1, output: NOT_INSTALLED };

  const handoffPath = join(dir, "HANDOFF.md");
  const handoff = existsSync(handoffPath) ? readFileSync(handoffPath, "utf8") : "";
  const lines = [
    `Phase:         ${handoffField(handoff, "Phase") ?? "—"}`,
    `Current card:  ${handoffField(handoff, "Current card") ?? "—"}`,
    `Next step:     ${handoffField(handoff, "Next step") ?? "—"}`,
    "",
  ];

  const cards = readCards(dir);
  if (cards.length === 0) {
    lines.push("No cards yet. Run gw-spec, then gw-plan.");
    return { code: 0, output: lines.join("\n") };
  }

  const counts = CARD_STATUSES.map((s) => [s, cards.filter((c) => c.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`);
  lines.push(`Cards:         ${counts.join(" · ")}`);

  const inProgress = cards.filter((c) => ["testing", "implementing", "review", "awaiting-approval"].includes(c.status));
  if (inProgress.length > 0) {
    lines.push(`In progress:   ${inProgress.map((c) => `${c.id} ${c.title} (${c.status})`).join(", ")}`);
  }

  const next = nextReady(cards);
  lines.push(`Next ready:    ${next ? `${next.id} ${next.title}` : "none"}`);

  const waiting = blocked(cards);
  if (waiting.length > 0) {
    lines.push("Blocked:");
    for (const { card, waitingOn } of waiting) lines.push(`  ${card.id} ${card.title}  ← waiting on ${waitingOn.join(", ")}`);
  }
  return { code: 0, output: lines.join("\n") };
}

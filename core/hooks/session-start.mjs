#!/usr/bin/env node
// Groundwork session-start orientation. Adapters call it when a session starts, is cleared or compacted,
// e.g. for Claude Code: node .groundwork/hooks/session-start.mjs
// It prints a few lines from .groundwork/HANDOFF.md, so the agent knows where things stand before
// the human asks. Outside a Groundwork project it prints nothing.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LABELS = {
  todo: "to do",
  testing: "being tested",
  implementing: "being built",
  review: "in review",
  "awaiting-approval": "waiting for your approval",
  done: "done",
  rejected: "sent back",
};

// Keeps the whole message short, however long a HANDOFF field is.
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const field = (handoff, name) => handoff.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";

// Pure: the orientation text for a project folder, or "" if it doesn't use Groundwork.
export function orientation(projectDir) {
  const groundwork = join(projectDir, ".groundwork");
  if (!existsSync(groundwork)) return "";
  const path = join(groundwork, "HANDOFF.md");
  if (!existsSync(path)) return "Groundwork: .groundwork/HANDOFF.md is missing, so where things stand is unknown. Type /gw to get oriented.";

  const handoff = readFileSync(path, "utf8");
  const card = field(handoff, "Current card");
  const status = field(handoff, "Status");
  const next = field(handoff, "Next step");

  const noCard = card === "" || card === "—" || /^none\b/i.test(card);
  const state = LABELS[status] ?? (status === "" || status === "—" ? "" : clip(status, 30));
  const first = noCard
    ? "Groundwork: no card in progress."
    : `Groundwork: card ${clip(card, 60)}${state ? ` is ${state}` : ""}.`;
  return [first, ...(next ? [`Next: ${clip(next, 100)}`] : []), "Type /gw to continue."].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = orientation(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (text) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
  }
}

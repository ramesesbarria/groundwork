#!/usr/bin/env node
// Groundwork session-start orientation. Adapters call it when a session starts, is cleared or compacted:
//   node .groundwork/hooks/session-start.mjs [project folder]      (default: the current folder)
// It prints a few plain-text lines from .groundwork/HANDOFF.md, so the agent knows where things stand
// before the human asks. Outside a Groundwork project it prints nothing.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const LABELS = {
  todo: "to do",
  testing: "being tested",
  implementing: "being built",
  built: "built but not reviewed",
  review: "in review",
  "awaiting-approval": "waiting for you",
  done: "done",
  rejected: "sent back",
};

// Keeps the whole message short, however long a HANDOFF field is.
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const field = (handoff, name) => handoff.match(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";

const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// The branch names the task, including in CI where the checkout is detached.
function taskOf(projectDir) {
  let branch = "";
  try {
    branch = execFileSync("git", ["branch", "--show-current"], { cwd: projectDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    // no git, or a tool that doesn't expose it
  }
  if (!branch) branch = process.env.GITHUB_HEAD_REF ?? "";
  const match = branch.match(/^gw\/(.+)$/);
  return match && TASK_ID.test(match[1]) ? match[1] : undefined;
}

// Per-task handoff when the branch names one and the file exists; the root file otherwise.
function handoffPath(projectDir) {
  const task = taskOf(projectDir);
  const perTask = task ? join(projectDir, ".groundwork", "work", task, "HANDOFF.md") : "";
  return perTask && existsSync(perTask) ? perTask : join(projectDir, ".groundwork", "HANDOFF.md");
}

// Pure: the orientation text for a project folder, or "" if it doesn't use Groundwork.
export function orientation(projectDir) {
  const groundwork = join(projectDir, ".groundwork");
  if (!existsSync(groundwork)) return "";
  const path = handoffPath(projectDir);
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
  return [first, ...(next ? [`Next: ${clip(next, 100)}`] : []), "Type /gw to continue (the only other commands: /gw-approve, /gw-reject)."].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = orientation(process.argv[2] || process.cwd());
  if (text) process.stdout.write(`${text}\n`);
}

#!/usr/bin/env node
// Runs each time the human sends a message; adapters wire it to their tool's user-prompt hook, which
// the agent's own actions never trigger. It records that the human spoke, and where the project's
// history stood, in .groundwork/.approvals/last-human.json. The commit gate reads it: in per-card
// mode a card commit needs a human message since the last commit.
//
//   node .groundwork/hooks/user-prompt.mjs <project-dir>   (hook input as JSON on stdin)
//
// It prints nothing (a tool may add a hook's output to the conversation) and never fails the prompt.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function head(project) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return ""; // no commits yet
  }
}

function main() {
  const project = process.argv[2] ?? process.cwd();
  let prompt = "";
  try {
    const input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
    prompt = String(input.prompt ?? "");
  } catch {
    // no input we understand: still record that the human spoke
  }
  const dir = join(project, ".groundwork", ".approvals");
  mkdirSync(dir, { recursive: true });
  const approve = prompt.match(/^\s*\/gw-approve\b\s*([\d.]*)/);
  writeFileSync(
    join(dir, "last-human.json"),
    JSON.stringify({ head: head(project), at: new Date().toISOString(), approves: approve ? approve[1] || "current" : null }, null, 2) + "\n",
  );
}

try {
  main();
} catch {
  // Recording is best effort; the gate then asks for a fresh message from the human.
}

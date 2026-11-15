#!/usr/bin/env node
// Groundwork checkpoint hook: saves what can be saved at the moments context is about to be lost.
// Adapters wire it to their tool's events:
//   node .groundwork/hooks/checkpoint.mjs <stop|pre-compact|session-end> [project folder] [tool name] [--block-json]
// (hook input as JSON on stdin, when the tool sends it: a session id, and whether this stop already
// follows a reminder).
//
// Every event runs an automatic checkpoint: the journal gets the commits made since its last entry,
// and a handoff whose text was edited is stamped. A handoff nobody touched is never restamped, so it
// shows as behind instead of looking fresh. Then, where the tool lets a hook speak:
//   stop          if the handoff is behind the repository, the agent is asked once per commit to save it.
//                 Plain text by default; with --block-json it is printed as {"decision":"block","reason"},
//                 the shape tools with a blocking stop hook read.
//   pre-compact   prints what the compaction summary must keep, so the handoff can be written after it.
//   session-end   says nothing: the session is over.
//
// It always exits 0, finishes within a few seconds, and prints nothing outside a Groundwork project.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkpoint, isPristine, resolveHandoff } from "../lib/checkpoint.mjs";
import { assess } from "../lib/freshness.mjs";
import * as git from "../lib/git.mjs";
import { parseHandoff, readConfig, readState, readText, staleDaysOf, writeState } from "../lib/memory.mjs";

const SAVE = 'npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"';
const EXTRAS = '(add --blockers "…" and --failing "…" when there are any)';

export const COMPACT_INSTRUCTIONS = [
  "Keep in the summary, in these words: what is in progress right now; the very next step; open questions and blockers;",
  "failing checks; decisions made in this conversation that aren't written down yet; and any parallel workers still running.",
  `Right after compaction, save them to the project handoff with: ${SAVE} ${EXTRAS}.`,
].join(" ");

// What to tell the agent at a stop, or undefined when the handoff needs nothing. `key` identifies
// the situation, so the same one is raised only once.
export function reminder(project) {
  const groundwork = join(project, ".groundwork");
  const config = readConfig(groundwork);
  if (config.nudge === false) return undefined;
  const target = resolveHandoff(project);
  const handoff = parseHandoff(readText(target.path));
  const head = git.head(project);
  const where = target.worker ? `this worker's handoff (.groundwork/work/${target.worker}/HANDOFF.md)` : "the project handoff";
  if (!existsSync(target.path) || isPristine(handoff)) {
    // Nothing recorded yet: worth asking only once there is work to lose.
    const dirty = git.dirtyFiles(project)?.length ?? 0;
    if (dirty === 0 && !target.worker) return undefined;
    return {
      key: `empty:${target.worker ?? "root"}`,
      text: `Groundwork: ${where} is still empty. Before you stop, record where things stand so the next session can resume: ${SAVE} ${EXTRAS}.`,
    };
  }
  const freshness = assess(project, handoff, { staleAfterDays: staleDaysOf(config), groundwork });
  if (freshness.verdict === "unstamped") {
    return {
      key: `unstamped:${target.worker ?? "root"}`,
      text: `Groundwork: ${where} has never been checkpointed, so the next session can't tell how old it is. Check that it still describes where things stand, then stamp it: ${SAVE} ${EXTRAS}.`,
    };
  }
  if (freshness.verdict !== "behind" && freshness.verdict !== "diverged") return undefined;
  const list = freshness.commits.slice(0, 3).map((c) => `${c.sha} ${c.subject}`).join("; ");
  return {
    key: `${freshness.verdict}:${target.worker ?? "root"}:${head}`,
    text:
      `Groundwork: ${where} is ${freshness.verdict}: ${freshness.summary}${list ? ` (${list}${freshness.commitsSince > 3 ? "; …" : ""})` : ""}. ` +
      `Before you stop, save where things stand now: ${SAVE} ${EXTRAS}. ` +
      "If it is still accurate, run `npx groundwork-ai checkpoint` alone to confirm it. This reminder comes once per commit.",
  };
}

// Runs one event. Returns { say, kind }: text for the agent (or the compaction), if any.
export function onEvent(project, event, { tool, session, model, continuing = false } = {}) {
  const groundwork = join(project, ".groundwork");
  if (!existsSync(groundwork)) return {};
  try {
    checkpoint(project, { auto: true, tool, session, model });
  } catch {
    // saving is best effort; the reminder below still helps
  }
  if (event === "pre-compact") return { say: COMPACT_INSTRUCTIONS, kind: "compact" };
  if (event !== "stop" || continuing) return {};
  const due = reminder(project);
  if (!due) return {};
  const state = readState(groundwork);
  if (state.reminded === due.key) return {};
  writeState(groundwork, { ...state, reminded: due.key });
  return { say: due.text, kind: "reminder" };
}

function hookInput() {
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
  } catch {
    return {};
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // A hook must never hold the tool up: give up quietly if git or the disk hangs.
  setTimeout(() => process.exit(0), 8000).unref();
  try {
    git.cacheForThisProcess(); // one short process: ask git each question once
    const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
    const [event = "stop", project = process.cwd(), tool] = args;
    const input = hookInput();
    const { say, kind } = onEvent(project, event, {
      tool,
      session: input.session_id ?? input.sessionID,
      continuing: input.stop_hook_active === true,
    });
    if (say) {
      const blockJson = process.argv.includes("--block-json") && kind === "reminder";
      process.stdout.write(blockJson ? JSON.stringify({ decision: "block", reason: say }) : `${say}\n`);
    }
  } catch {
    // never fail the tool's own work
  }
  process.exitCode = 0;
}

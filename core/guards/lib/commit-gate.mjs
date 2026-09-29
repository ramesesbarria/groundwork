// Built-in check: a card is committed only when the workflow says it's finished.
//
// A commit whose message names a card (per commitFormat) is blocked unless that card is `done` and
// passes `groundwork check`: evidence saved and linked, criteria ticked or explained, and in per-card
// and at-end mode an "approved by human" line. In at-end mode a `built` card with its test output may
// also be committed, as a checkpoint before the end review. Commits that don't name a card (setup,
// plan, quick, the end approval) aren't gated.
//
// Where the tool tells Groundwork about the human's own messages (Claude Code's UserPromptSubmit hook
// writes .groundwork/.approvals/last-human.json), per-card commits also need a human message since
// the last commit, so an agent can't approve its own work. Tools without that signal get the card
// checks only.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCard, frontmatter } from "./cards.mjs";

export const HUMAN_MARKER = ".groundwork/.approvals/last-human.json";

// Tools whose hooks record the human's messages.
export const RECORDS_HUMAN = new Set(["claude-code"]);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The card ID in a commit message written in `format`, e.g. "[{id}] {title}". "quick" isn't a card.
export function cardIdIn(text, format = "[{id}] {title}") {
  const [before, after = ""] = format.split("{id}");
  // Only the literal text right next to the ID: "[" and "] " in "[{id}] {title}", " (" and ")" in
  // "feat: {title} ({id})". The title can be anything.
  const lead = escape(before.split("{title}").pop()).trimStart();
  const trail = escape(after.split("{title}")[0]);
  const match = text.match(new RegExp(`${lead}(\\d+(?:\\.\\d+)+)${trail}`));
  return match ? match[1] : undefined;
}

// Everything a commit command says its message is: the command text and any -F/--file message file.
export function commitText(command, cwd) {
  const file = command.match(/(?:^|\s)(?:-F|--file)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
  const path = file && (file[1] ?? file[2] ?? file[3]);
  let message = "";
  if (path && path !== "-") {
    const abs = join(cwd, path);
    const target = existsSync(path) ? path : existsSync(abs) ? abs : undefined;
    if (target) {
      try {
        message = readFileSync(target, "utf8");
      } catch {
        message = "";
      }
    }
  }
  return `${command}\n${message}`;
}

function head(project) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return ""; // no commits yet
  }
}

function findCard(project, id) {
  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return undefined;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const md = readFileSync(join(dir, name), "utf8");
    if (frontmatter(md).id === id) return md;
  }
  return undefined;
}

const WHEN = {
  "per-card": "In per-card mode a card is committed only after the human approves it with /gw-approve.",
  "per-phase": "In per-phase mode a card is committed once review passes and marks it done.",
  "at-end": "In at-end mode a card is committed once it's built with its test output saved, and again after the human approves.",
};

export function commitGate(action, { project, config, tool }) {
  const id = cardIdIn(commitText(action.command, project), config.commitFormat);
  if (!id) return { block: false };
  const md = findCard(project, id);
  if (!md) return { block: false }; // names no card we know; nothing to check against

  const approvalMode = config.approvalMode ?? "per-card";
  const status = frontmatter(md).status;
  const problems = checkCard(md, { projectDir: project, approvalMode });
  // at-end mode commits each card as a checkpoint once it's built, before the end review.
  const checkpoint = approvalMode === "at-end" && status === "built";
  if (status !== "done" && !checkpoint) {
    problems.unshift(`its status is "${status}", not ${approvalMode === "at-end" ? "built or done" : "done"}`);
  }
  if (problems.length > 0) {
    return { block: true, reason: `Card ${id} isn't ready to commit: ${problems.join("; ")}. ${WHEN[approvalMode] ?? WHEN["per-card"]}` };
  }

  if (!checkpoint && approvalMode !== "per-phase" && RECORDS_HUMAN.has(tool)) {
    const path = join(project, HUMAN_MARKER);
    let marker;
    try {
      marker = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
    } catch {
      marker = undefined;
    }
    if (!marker || marker.head !== head(project)) {
      return {
        block: true,
        reason:
          `No message from the human since the last commit, so card ${id} can't have been approved by them. ` +
          "Stop and ask the human to approve it (/gw-approve) or reject it.",
      };
    }
  }
  return { block: false };
}

// Built-in check: a card is committed only when the workflow says it's finished and the human has
// explicitly approved the work they were shown.
//
// A card commit names its card in the configured format and must be `done`, pass `groundwork check`,
// and match a human approval record for that card. The record is bound to the reviewed HEAD, code
// diff, card content and evidence files. A commit with no card ID is blocked unless it uses an
// explicit non-card tag (`[no-card]`, `[quick]`, `[setup]`, `[plan]`, `[docs]`). Omitting the ID is
// therefore not a way around the gate.
//
// In at-end mode a `built` card may be committed as a checkpoint before the end review. Team projects
// (`integration: "pr"`) use PR review and required checks instead; local commits are checkpoints.
// Tools that do not record the human's own messages get the card checks only.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCard, frontmatter } from "./cards.mjs";
import { approvalMatches } from "./approval.mjs";

export const HUMAN_MARKER = ".groundwork/.approvals/last-human.json";

// Tools whose hooks record the human's messages. Claude Code always has its UserPromptSubmit hook.
// OpenCode's plugin writes RECORDER when its prompt hook first fires; a version without that hook
// never writes it, and those projects keep the card checks only rather than blocking every commit.
export const RECORDS_HUMAN = new Set(["claude-code"]);
export const RECORDER = ".groundwork/.approvals/records-human";

export function toolRecordsHuman(tool, project) {
  return RECORDS_HUMAN.has(tool) || (tool === "opencode" && existsSync(join(project, RECORDER)));
}

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

const NON_CARD = /\[(?:no-card|quick|setup|plan|docs)\]/i;

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

// The runner learns this by trial otherwise: the gate reads the card as it is before the command
// runs, so the status edit and the commit can't share one shell command.
const TWO_STEP = "Change the card first, then commit as a separate step: the gate reads the card as it is before the command runs.";

const NO_CARD =
  "This commit names no card. Use the card format, or an explicit non-card tag such as [no-card] <reason> " +
  "or [quick]. Omitting the card ID must not bypass the approval gate.";

export function commitGate(action, { project, config, tool }) {
  // Team projects use PR review and required checks for integration. Local task-branch commits are
  // checkpoints, so the card gate does not run here; only the general guards do.
  if (config.integration === "pr") return { block: false };

  const text = commitText(action.command, project);
  const id = cardIdIn(text, config.commitFormat);
  if (!id) {
    if (NON_CARD.test(text)) return { block: false };
    return { block: true, reason: NO_CARD };
  }

  const md = findCard(project, id);
  if (!md) return { block: true, reason: `This commit names card ${id}, but no card file has that id.` };

  const approvalMode = config.approvalMode ?? "per-card";
  const status = frontmatter(md).status;
  const problems = checkCard(md, { projectDir: project, approvalMode });
  // at-end mode commits each card as a checkpoint once it's built, before the end review.
  const checkpoint = approvalMode === "at-end" && status === "built";
  if (status !== "done" && !checkpoint) {
    problems.unshift(`its status is "${status}", not ${approvalMode === "at-end" ? "built or done" : "done"}`);
  }
  if (problems.length > 0) {
    return { block: true, reason: `Card ${id} isn't ready to commit: ${problems.join("; ")}. ${WHEN[approvalMode] ?? WHEN["per-card"]} ${TWO_STEP}` };
  }

  if (!checkpoint && approvalMode !== "per-phase" && toolRecordsHuman(tool, project)) {
    const match = approvalMatches(project, id, md);
    if (!match.ok) {
      return {
        block: true,
        reason:
          `Card ${id} is ready, but ${match.reason}. Ordinary conversation, a rejection, or an agent-written ` +
          "card line does not count. Ask the human to run /gw-approve for this card.",
      };
    }
  }
  return { block: false };
}

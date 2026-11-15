// Cursor adapter. Formats from Cursor's documentation, read 2026-11-15:
//   hooks      https://cursor.com/docs/hooks              (.cursor/hooks.json: events, input, output, failClosed, timeouts in seconds)
//   skills     https://cursor.com/docs/context/skills     (.cursor/skills/<name>/SKILL.md; disable-model-invocation; /name)
//   subagents  https://cursor.com/docs/context/subagents  (.cursor/agents/*.md; readonly)
//   rules      https://cursor.com/docs/context/rules      (AGENTS.md in the project root is read natively: no extra file)
// Cursor's custom commands (.cursor/commands/) aren't described in the current docs, which say commands are being
// converted to skills with disable-model-invocation, so the commands here are skills. Not run against a live Cursor.
//
// What is wired, and what the documentation does not let an adapter promise, is in CURSOR_FLOW_LIMITS
// and docs/content/docs/adapters/cursor.mdx.
import type { CoreFiles } from "../core.js";
import { hookShim } from "./hook-shim.js";
import { commandsOf, modelFor, sortedByPath, subagentRolesOf, yamlValue, type ModelHints } from "./shared.js";

// Only the human approves or rejects: Cursor includes the skill only when it is invoked explicitly.
const HUMAN_ONLY = new Set(["gw-approve", "gw-reject"]);

// Cursor's `readonly` runs a subagent with restricted write permissions. The reviewer judges and doesn't repair.
const READONLY = new Set(["reviewer"]);

export const CURSOR_SHIM = ".cursor/hooks/groundwork.mjs";

// What a Cursor session with the flow does not get from this adapter. Shown by `init --flow` and
// `adapter add cursor`, and on the docs page.
export const CURSOR_FLOW_LIMITS = [
  "Only shell commands are guarded (beforeShellExecution, set to fail closed). Cursor's documentation doesn't give the input of a file-write tool call, so edits and writes are not checked: the guard against changing Groundwork's own files, and the card-state guards, don't see them. The commit gate does, because a commit is a shell command.",
  "Approvals are not bound to the human's message: the commit gate checks the card and its evidence and cannot tell that a human approved. gw-approve and gw-reject are skills the model may not invoke on its own (disable-model-invocation), which is Cursor's own switch.",
  "The session-start brief arrives when Cursor creates a conversation; its documentation doesn't say a resumed or compacted one runs it again, so AGENTS.md also says to run `npx groundwork-ai brief`.",
  "Hook scripts run from the project root, so Cursor must be opened on the project folder, not a parent.",
];

const hookEntry = (event: string, timeout: number, extra: Record<string, unknown> = {}) => ({
  command: `node ${CURSOR_SHIM} ${event}`,
  timeout,
  ...extra,
});

// Pure: core files in, Cursor files out. Generated files point to the core instead of copying it.
export function generateCursor(core: CoreFiles, models: ModelHints = {}, flow = "guards/run.mjs" in core): Record<string, string> {
  const out: Record<string, string> = {};

  for (const { name, description } of commandsOf(core)) {
    out[`.cursor/skills/${name}/SKILL.md`] = [
      "---",
      `name: ${name}`,
      `description: ${yamlValue(description)}`,
      ...(HUMAN_ONLY.has(name) ? ["disable-model-invocation: true"] : []),
      "---",
      `Read \`.groundwork/commands/${name}.md\` now and follow it exactly.`,
      "",
    ].join("\n");
  }

  for (const { name: role, description } of flow ? subagentRolesOf(core) : []) {
    const model = modelFor(models, role, "cursor");
    out[`.cursor/agents/gw-${role}.md`] = [
      "---",
      `name: gw-${role}`,
      `description: ${yamlValue(description)}`,
      ...(model ? [`model: ${yamlValue(model)}`] : []),
      ...(READONLY.has(role) ? ["readonly: true"] : []),
      "---",
      `You are the Groundwork ${role}. Read \`.groundwork/roles/${role}.md\` now and follow it exactly.`,
      "Load only the files it lists under Load.",
      "",
    ].join("\n");
  }

  // Project memory, in every install. From cursor.com/docs/hooks, 2026-11-15:
  // sessionStart: called when a conversation is created; {"additional_context"} goes into the initial context.
  // stop: {"followup_message"} is submitted as the next user message; the input's loop_count is how many
  //   times that has happened (Cursor's default loop_limit is 5), and the script asks once per commit.
  // preCompact: observational; it cannot change the compaction and its output is only shown to the user.
  // sessionEnd: fire and forget.
  // None sets failClosed, so a crash or a timeout lets the work go on; timeouts are in seconds.
  const memoryHooks = {
    sessionStart: [hookEntry("session-start", 15)],
    stop: [hookEntry("stop", 15)],
    preCompact: [hookEntry("pre-compact", 15)],
    sessionEnd: [hookEntry("session-end", 10)],
  };

  // The flow's guard: every shell command goes through it, and failClosed makes a crash, a timeout, a
  // non-zero exit or empty output block the command.
  const flowHooks = { beforeShellExecution: [hookEntry("guard", 30, { failClosed: true })] };

  out[".cursor/hooks.json"] = JSON.stringify({ version: 1, hooks: { ...memoryHooks, ...(flow ? flowHooks : {}) } }, null, 2) + "\n";
  out[CURSOR_SHIM] = hookShim("cursor", flow, [
    "sessionStart additional_context and stop followup_message: cursor.com/docs/hooks",
    "beforeShellExecution permission, user_message, agent_message: cursor.com/docs/hooks",
  ]);

  return sortedByPath(out);
}

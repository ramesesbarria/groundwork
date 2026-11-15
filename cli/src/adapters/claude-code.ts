import type { CoreFiles } from "../core.js";
import { commandsOf, modelFor, sortedByPath, subagentRolesOf, yamlValue, type ModelHints } from "./shared.js";

// Claude Code tools each role's subagent may use. The reviewer judges and doesn't repair,
// so it has no file-edit tool.
const ROLE_TOOLS: Record<string, string[]> = {
  tester: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  implementer: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  reviewer: ["Read", "Grep", "Glob", "Bash"],
};

// Only the human approves or rejects. This field stops the model from invoking the skill on its own
// while `/gw-approve` still works (code.claude.com/docs/en/skills, checked 2026-09-24).
const HUMAN_ONLY = new Set(["gw-approve", "gw-reject"]);

const CONTEXT_LINE = "Each session starts with the project brief from .groundwork/ (a hook prints it). /gw resumes from it and saves.";

// Every line Groundwork writes under "## Claude Code" in CLAUDE.md, now or in an earlier version. A
// CLAUDE.md made only of these is Groundwork's own: upgrade refreshes it and uninstall removes it.
// Add the pattern here when the generator below gains a line.
export const CLAUDE_MD_LINES: RegExp[] = [
  /^Groundwork commands are skills: \/[\w-]+(?:, \/[\w-]+)*\.$/, // 0.3
  /^Groundwork commands are skills\. Start with \/gw: it says where things stand and runs the next step\.$/,
  /^The others: \/[\w-]+(?:, \/[\w-]+)*\.$/,
  /^Other helpers live in \.groundwork\/commands\/; \/gw reads the one it needs\.$/,
  /^When a command says to run a role, use its subagent: gw-[\w-]+(?:, gw-[\w-]+)*\.$/,
  /^Each session starts with the project brief from \.groundwork\/ \(a hook prints it\)\. \/gw resumes from it and saves\.$/, // 2.0, context only
];

const hook = (script: string, args: string) => `node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/${script}" ${args}`;

// Pure: core files in, Claude Code files out. Generated files point to the core instead of
// copying it, so .groundwork/ stays the single source of truth. `flow` adds the flow's subagents,
// guard hook and approval recorder to the context layer's hooks.
export function generateClaudeCode(core: CoreFiles, models: ModelHints = {}, flow = "guards/run.mjs" in core): Record<string, string> {
  const out: Record<string, string> = {};

  const commands = commandsOf(core);
  for (const { name, description } of commands) {
    out[`.claude/skills/${name}/SKILL.md`] = [
      "---",
      `name: ${name}`,
      `description: ${yamlValue(description)}`,
      ...(HUMAN_ONLY.has(name) ? ["disable-model-invocation: true"] : []),
      "---",
      `Read \`.groundwork/commands/${name}.md\` now and follow it exactly.`,
      "",
    ].join("\n");
  }

  const roles = flow ? subagentRolesOf(core) : [];
  for (const { name: role, description } of roles) {
    const tools = ROLE_TOOLS[role];
    if (!tools) throw new Error(`No Claude Code tools defined for role "${role}"`);
    const model = modelFor(models, role, "claude-code");
    out[`.claude/agents/gw-${role}.md`] = [
      "---",
      `name: gw-${role}`,
      `description: ${yamlValue(description)}`,
      `tools: ${tools.join(", ")}`,
      ...(model ? [`model: ${yamlValue(model)}`] : []),
      "---",
      `You are the Groundwork ${role}. Read \`.groundwork/roles/${role}.md\` now and follow it exactly.`,
      "Load only the files it lists under Load.",
      "",
    ].join("\n");
  }

  out["CLAUDE.md"] = flow
    ? [
        "@AGENTS.md",
        "",
        "## Claude Code",
        `Groundwork commands are skills. Start with /gw: it says where things stand and runs the next step.`,
        `The others: ${commands.filter((c) => c.name !== "gw").map((c) => `/${c.name}`).join(", ")}.`,
        "Other helpers live in .groundwork/commands/; /gw reads the one it needs.",
        `When a command says to run a role, use its subagent: ${roles.map((r) => `gw-${r.name}`).join(", ")}.`,
        "",
      ].join("\n")
    : ["@AGENTS.md", "", "## Claude Code", CONTEXT_LINE, ""].join("\n");

  // Project memory, in every install. Events, their input and what their output does are from
  // code.claude.com/docs/en/hooks, checked 2026-11-15.
  // SessionStart: a new or resumed session, /clear or a compaction begins with the project brief; Claude
  //   Code adds the hook's plain-text output as context. The command is the one 1.x wrote, so an
  //   upgrade replaces that entry instead of adding a second one.
  // Stop: an automatic checkpoint. When the handoff is behind the repository, the hook answers
  //   {"decision":"block","reason"}, which Claude Code gives to the model: it is asked to save, once
  //   per commit. The script reads stop_hook_active, so it never asks twice in a row.
  // PreCompact: an automatic checkpoint; the hook's output becomes instructions for the compaction summary.
  // SessionEnd: a last automatic checkpoint. Its default budget is 1.5 seconds; `timeout` raises it.
  // None of these sets onFailure, and the scripts always exit 0: memory never blocks the work.
  const memoryHooks = {
    SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [{ type: "command", command: hook("session-start.mjs", '"$CLAUDE_PROJECT_DIR"') }] }],
    Stop: [{ hooks: [{ type: "command", command: hook("checkpoint.mjs", 'stop "$CLAUDE_PROJECT_DIR" claude-code --block-json'), timeout: 15 }] }],
    PreCompact: [{ hooks: [{ type: "command", command: hook("checkpoint.mjs", 'pre-compact "$CLAUDE_PROJECT_DIR" claude-code'), timeout: 15 }] }],
    SessionEnd: [{ hooks: [{ type: "command", command: hook("checkpoint.mjs", 'session-end "$CLAUDE_PROJECT_DIR" claude-code'), timeout: 10 }] }],
  };

  // The flow's guards: every shell command and file write goes through the runner, which applies the
  // guards listed in .groundwork/config.json. Exit code 2 blocks the action. Claude Code lets a call
  // through when a hook fails any other way (it can't start, crashes, times out), unless the hook sets
  // onFailure: "block", added in Claude Code 2.1.295 (code.claude.com/docs/en/hooks, "Block the
  // action when a hook fails"; changelog 2.1.295). Older versions ignore the field.
  const flowHooks = {
    PreToolUse: [
      {
        matcher: "Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit",
        hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/guards/run.mjs" claude-code', onFailure: "block" }],
      },
    ],
    // Fires only on the human's own messages, so the commit gate can tell a human approval
    // from the agent's say-so.
    UserPromptSubmit: [{ hooks: [{ type: "command", command: hook("user-prompt.mjs", '"$CLAUDE_PROJECT_DIR"') }] }],
  };

  out[".claude/settings.json"] = JSON.stringify({ hooks: { ...memoryHooks, ...(flow ? flowHooks : {}) } }, null, 2) + "\n";

  return sortedByPath(out);
}

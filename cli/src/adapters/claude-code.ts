import type { CoreFiles } from "../core.js";
import { commandsOf, rolesOf, sortedByPath, yamlValue } from "./shared.js";

// Claude Code tools each role's subagent may use. The reviewer judges and doesn't repair,
// so it can't edit files; the planner writes docs and never runs code.
const ROLE_TOOLS: Record<string, string[]> = {
  planner: ["Read", "Grep", "Glob", "Write", "Edit"],
  tester: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  implementer: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  reviewer: ["Read", "Grep", "Glob", "Bash"],
};

// Only the human approves or rejects. This field stops the model from invoking the skill on its own
// while `/gw-approve` still works (code.claude.com/docs/en/skills, checked 2026-09-24).
const HUMAN_ONLY = new Set(["gw-approve", "gw-reject"]);

// Pure: core files in, Claude Code files out. Generated files point to the core instead of
// copying it, so .groundwork/ stays the single source of truth.
export function generateClaudeCode(core: CoreFiles): Record<string, string> {
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

  const roles = rolesOf(core);
  for (const { name: role, description } of roles) {
    const tools = ROLE_TOOLS[role];
    if (!tools) throw new Error(`No Claude Code tools defined for role "${role}"`);
    out[`.claude/agents/gw-${role}.md`] = [
      "---",
      `name: gw-${role}`,
      `description: ${yamlValue(description)}`,
      `tools: ${tools.join(", ")}`,
      "---",
      `You are the Groundwork ${role}. Read \`.groundwork/roles/${role}.md\` now and follow it exactly.`,
      "Load only the files it lists under Load.",
      "",
    ].join("\n");
  }

  out["CLAUDE.md"] = [
    "@AGENTS.md",
    "",
    "## Claude Code",
    `Groundwork commands are skills. Start with /gw: it says where things stand and runs the next step.`,
    `The others: ${commands.filter((c) => c.name !== "gw").map((c) => `/${c.name}`).join(", ")}.`,
    `When a command says to run a role, use its subagent: ${roles.map((r) => `gw-${r.name}`).join(", ")}.`,
    "",
  ].join("\n");

  // Guards: every shell command and file write goes through the runner, which applies the guards
  // listed in .groundwork/config.json (none by default). Exit code 2 blocks the action.
  out[".claude/settings.json"] =
    JSON.stringify(
      {
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash|Write|Edit|MultiEdit",
              hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/guards/run.mjs" claude-code' }],
            },
          ],
        },
      },
      null,
      2,
    ) + "\n";

  return sortedByPath(out);
}

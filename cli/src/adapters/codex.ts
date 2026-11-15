// OpenAI Codex CLI adapter. Formats from OpenAI's Codex documentation, read 2026-11-15 (developers.openai.com/codex/...
// now redirects to learn.chatgpt.com/docs/...):
//   hooks            https://learn.chatgpt.com/docs/hooks            (.codex/hooks.json, events, input, output, timeouts in seconds)
//   skills           https://learn.chatgpt.com/docs/build-skills     (.agents/skills/<name>/SKILL.md, agents/openai.yaml policy)
//   custom prompts   https://learn.chatgpt.com/docs/custom-prompts   (deprecated, and ~/.codex only: not used)
//   AGENTS.md        https://learn.chatgpt.com/docs/agent-configuration/agents-md   (read natively: no extra file)
//   custom agents    https://learn.chatgpt.com/docs/agent-configuration/subagents   (.codex/agents/*.toml)
// Not run against a live Codex.
//
// What is wired, and what the documentation does not let an adapter promise, is in CODEX_FLOW_LIMITS
// and docs/content/docs/adapters/codex.mdx.
import type { CoreFiles } from "../core.js";
import { commandsOf, modelFor, sortedByPath, subagentRolesOf, tomlString, yamlValue, type ModelHints } from "./shared.js";

// Only the human approves or rejects. Codex's documented switch for a skill is
// `policy.allow_implicit_invocation: false` in agents/openai.yaml: the model doesn't pick the skill
// itself, and `$gw-approve` still works. It stops implicit use only; the skill file stays readable.
const HUMAN_ONLY = new Set(["gw-approve", "gw-reject"]);

// What a Codex session with the flow does not get from this adapter. Shown by `init --flow` and
// `adapter add codex`, and on the docs page.
export const CODEX_FLOW_LIMITS = [
  "The guard runs before Bash and apply_patch calls (PreToolUse), but Codex's documentation does not say a call is blocked when the hook itself fails to run, so it is not fail-closed. Other tools (MCP, web) aren't checked.",
  "Approvals are not bound to the human's message: Codex's UserPromptSubmit hook is documented, but not what it receives for a $skill, so the commit gate checks the card and its evidence and cannot tell that a human approved. gw-approve and gw-reject are set to explicit invocation only, which stops the model picking them itself but not reading them.",
  "A role's subagent is told not to edit (reviewer) but Codex has no per-agent read-only setting: the sandbox belongs to the session.",
  "Project hooks run only once you trust the project's .codex/ layer and review each hook (/hooks in Codex); and a project .codex/config.toml can switch hooks off, which only the guard's own file-write check prevents.",
];

const ROLE_NOTE: Record<string, string> = {
  reviewer: "You judge and do not repair: never edit files.",
};

// Codex runs a hook in the session's working directory with no project variable. Where the shell
// understands $(...) (sh, bash, PowerShell: the form Codex's own documentation uses) the command finds the
// repository root; `commandWindows` is the plain relative form for cmd.exe, which needs Codex started
// from the project root.
const ROOT = "$(git rev-parse --show-toplevel)";
const hook = (script: string, args: string[], timeout: number) => {
  const rest = args.length > 0 ? ` ${args.join(" ")}` : "";
  return {
    type: "command",
    command: `node "${ROOT}/.groundwork/${script}"${rest.replace("<project>", `"${ROOT}"`)}`,
    commandWindows: `node .groundwork/${script}${rest.replace("<project>", ".")}`,
    timeout,
  };
};


// Pure: core files in, Codex files out. Generated files point to the core instead of copying it.
export function generateCodex(core: CoreFiles, models: ModelHints = {}, flow = "guards/run.mjs" in core): Record<string, string> {
  const out: Record<string, string> = {};

  for (const { name, description } of commandsOf(core)) {
    out[`.agents/skills/${name}/SKILL.md`] = [
      "---",
      `name: ${name}`,
      `description: ${yamlValue(description)}`,
      "---",
      `Read \`.groundwork/commands/${name}.md\` now and follow it exactly.`,
      "",
    ].join("\n");
    if (HUMAN_ONLY.has(name)) {
      out[`.agents/skills/${name}/agents/openai.yaml`] = ["policy:", "  allow_implicit_invocation: false", ""].join("\n");
    }
  }

  for (const { name: role, description } of flow ? subagentRolesOf(core) : []) {
    const model = modelFor(models, role, "codex");
    out[`.codex/agents/gw-${role}.toml`] = [
      `name = ${tomlString(`gw-${role}`)}`,
      `description = ${tomlString(description)}`,
      ...(model ? [`model = ${tomlString(model)}`] : []),
      'developer_instructions = """',
      `You are the Groundwork ${role}. Read \`.groundwork/roles/${role}.md\` now and follow it exactly.`,
      "Load only the files it lists under Load.",
      ...(ROLE_NOTE[role] ? [ROLE_NOTE[role]] : []),
      '"""',
      "",
    ].join("\n");
  }

  // Project memory, in every install. Events, input and output from learn.chatgpt.com/docs/hooks, 2026-11-15:
  // SessionStart: matcher values startup, resume, clear, compact, fork; plain stdout is added to the model's
  //   developer context.
  // Stop: {"decision":"block","reason"} continues the turn with the reason as a new prompt (--block-json);
  //   the input has stop_hook_active, which the script reads.
  // PreCompact: plain stdout is ignored, so it only runs the checkpoint.
  // SessionEnd: runs on close, advisory; timeout default 1 s, at most 3.
  // Timeouts are in seconds. None of these blocks anything, and the scripts always exit 0.
  const memoryHooks = {
    SessionStart: [{ matcher: "startup|resume|clear|compact|fork", hooks: [hook("hooks/session-start.mjs", ["<project>", "codex"], 15)] }],
    Stop: [{ hooks: [hook("hooks/checkpoint.mjs", ["stop", "<project>", "codex", "--block-json"], 15)] }],
    PreCompact: [{ hooks: [hook("hooks/checkpoint.mjs", ["pre-compact", "<project>", "codex"], 15)] }],
    SessionEnd: [{ hooks: [hook("hooks/checkpoint.mjs", ["session-end", "<project>", "codex"], 3)] }],
  };

  // The flow's guards: PreToolUse for Bash and apply_patch; exit code 2 blocks and stderr is the reason.
  const flowHooks = {
    PreToolUse: [{ matcher: "Bash|apply_patch", hooks: [hook("guards/run.mjs", ["codex"], 30)] }],
  };

  out[".codex/hooks.json"] = JSON.stringify({ hooks: { ...memoryHooks, ...(flow ? flowHooks : {}) } }, null, 2) + "\n";

  return sortedByPath(out);
}

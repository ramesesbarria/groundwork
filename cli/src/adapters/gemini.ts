// Gemini CLI adapter. Formats from the Gemini CLI documentation at geminicli.com, read 2026-11-15:
//   hooks       https://geminicli.com/docs/hooks/  and  /docs/hooks/reference/   (.gemini/settings.json; events, input, output; timeouts in ms)
//   commands    https://geminicli.com/docs/cli/custom-commands/                  (.gemini/commands/*.toml: prompt, description, {{args}})
//   GEMINI.md   https://geminicli.com/docs/cli/gemini-md/                        (@file imports)
//   subagents   https://geminicli.com/docs/core/subagents/                       (.gemini/agents/*.md; tools allow-list)
//   tools       https://geminicli.com/docs/tools/shell/  and  /docs/tools/file-system/   (run_shell_command, write_file, replace)
//   settings    https://geminicli.com/docs/reference/configuration/              (hooksConfig.enabled, default true)
// Gemini CLI's docs carry a notice that Google replaced it with Antigravity CLI on 2026-06-18 for unpaid-tier and
// Google One users; it stays available with paid API keys. Antigravity CLI is not covered here. Not run against a live Gemini CLI.
//
// What is wired, and what the documentation does not let an adapter promise, is in GEMINI_FLOW_LIMITS
// and docs/content/docs/adapters/gemini.mdx.
import type { CoreFiles } from "../core.js";
import { hookShim } from "./hook-shim.js";
import { commandsOf, modelFor, sortedByPath, subagentRolesOf, tomlString, yamlValue, type ModelHints } from "./shared.js";

export const GEMINI_SHIM = ".gemini/hooks/groundwork.mjs";

// The reviewer judges and doesn't repair, so it gets a short allow-list; the other roles inherit the
// session's tools. Names are from the tools documentation (shell, file-system) and the subagent example.
const ROLE_TOOLS: Record<string, string[] | undefined> = {
  tester: undefined,
  implementer: undefined,
  reviewer: ["read_file", "grep_search", "run_shell_command"],
};

// What a Gemini CLI session with the flow does not get from this adapter. Shown by `init --flow` and
// `adapter add gemini`, and on the docs page.
export const GEMINI_FLOW_LIMITS = [
  "The guard runs before run_shell_command, write_file and replace (BeforeTool). Gemini CLI treats a hook that fails to start as a warning and carries on, so it is not fail-closed; other tools (MCP) aren't checked.",
  "Approvals are not bound to the human's message: the commit gate checks the card and its evidence and cannot tell that a human approved. gw-approve and gw-reject are custom commands the person types; Gemini CLI's documentation doesn't say whether the model can run one, so they are not marked human-only.",
  "The reviewer's subagent has a tool allow-list, but it includes the shell (it runs the checks), so it is told not to edit rather than prevented.",
  "Hook scripts are started from the project root, so Gemini CLI must be started there. Project hooks are fingerprinted: a changed hook is untrusted until you accept it.",
  "Gemini CLI was replaced by Antigravity CLI for unpaid-tier and Google One users on 2026-06-18; this adapter is for Gemini CLI with a paid API key.",
];

const hookEntry = (name: string, command: string, timeout: number) => ({ name, type: "command", command, timeout });

// Pure: core files in, Gemini CLI files out. Generated files point to the core instead of copying it.
export function generateGemini(core: CoreFiles, models: ModelHints = {}, flow = "guards/run.mjs" in core): Record<string, string> {
  const out: Record<string, string> = {};

  for (const { name, description } of commandsOf(core)) {
    out[`.gemini/commands/${name}.toml`] = [
      `description = ${tomlString(description)}`,
      `prompt = ${tomlString(`Read \`.groundwork/commands/${name}.md\` now and follow it exactly.\n\nArguments: {{args}}`)}`,
      "",
    ].join("\n");
  }

  for (const { name: role, description } of flow ? subagentRolesOf(core) : []) {
    if (!(role in ROLE_TOOLS)) throw new Error(`No Gemini CLI tools defined for role "${role}"`);
    const tools = ROLE_TOOLS[role];
    const model = modelFor(models, role, "gemini");
    out[`.gemini/agents/gw-${role}.md`] = [
      "---",
      `name: gw-${role}`,
      `description: ${yamlValue(description)}`,
      ...(tools ? ["tools:", ...tools.map((t) => `  - ${t}`)] : []),
      ...(model ? [`model: ${yamlValue(model)}`] : []),
      "---",
      `You are the Groundwork ${role}. Read \`.groundwork/roles/${role}.md\` now and follow it exactly.`,
      "Load only the files it lists under Load.",
      ...(role === "reviewer" ? ["You judge and do not repair: never edit files."] : []),
      "",
    ].join("\n");
  }

  // GEMINI.md loads AGENTS.md (the @file import, geminicli.com/docs/cli/gemini-md/), the way CLAUDE.md does.
  out["GEMINI.md"] = [
    "@AGENTS.md",
    "",
    "## Gemini CLI",
    "Each session starts with the project brief from .groundwork/ (a hook adds it). /gw resumes from it and saves.",
    "",
  ].join("\n");

  // Project memory, in every install. From geminicli.com/docs/hooks/reference, 2026-11-15:
  // SessionStart (source startup, resume or clear): hookSpecificOutput.additionalContext is the first turn of the
  //   history. Plain stdout would only be shown to the user, so the script puts the brief in that JSON.
  // AfterAgent: {"decision":"deny","reason"} rejects the response and the reason becomes the next prompt; its
  //   input has stop_hook_active, which the script reads.
  // PreCompress: advisory and asynchronous, only a message for the user: it runs the checkpoint, nothing more.
  // SessionEnd: best effort, the CLI doesn't wait.
  // Timeouts are in milliseconds. A non-zero exit other than 2 is a warning, and the scripts always exit 0.
  const node = (event: string) => `node ${GEMINI_SHIM} ${event}`;
  const memoryHooks = {
    SessionStart: [{ matcher: "*", hooks: [hookEntry("groundwork-session-start", node("session-start"), 15000)] }],
    AfterAgent: [{ matcher: "*", hooks: [hookEntry("groundwork-stop", node("stop"), 15000)] }],
    PreCompress: [{ matcher: "*", hooks: [hookEntry("groundwork-pre-compress", node("pre-compress"), 15000)] }],
    SessionEnd: [{ matcher: "*", hooks: [hookEntry("groundwork-session-end", node("session-end"), 10000)] }],
  };

  // The flow's guards: tool matchers are regular expressions; exit code 2 blocks the call and stderr is the reason.
  const flowHooks = {
    BeforeTool: [
      { matcher: "run_shell_command|write_file|replace", hooks: [hookEntry("groundwork-guards", "node .groundwork/guards/run.mjs gemini", 30000)] },
    ],
  };

  out[".gemini/settings.json"] = JSON.stringify({ hooks: { ...memoryHooks, ...(flow ? flowHooks : {}) } }, null, 2) + "\n";
  out[GEMINI_SHIM] = hookShim("gemini", flow, [
    "SessionStart hookSpecificOutput.additionalContext and AfterAgent decision/reason: geminicli.com/docs/hooks/reference",
  ]);

  return sortedByPath(out);
}

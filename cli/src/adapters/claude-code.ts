import type { CoreFiles } from "../core.js";
import { parseFrontmatter, sectionBody } from "../frontmatter.js";

// Claude Code tools each role's subagent may use. The reviewer judges and doesn't repair,
// so it can't edit files; the planner writes docs and never runs code.
const ROLE_TOOLS: Record<string, string[]> = {
  planner: ["Read", "Grep", "Glob", "Write", "Edit"],
  tester: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  implementer: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"],
  reviewer: ["Read", "Grep", "Glob", "Bash"],
};

// Quote a frontmatter value when it contains characters YAML would misread.
// JSON strings are valid YAML double-quoted strings.
const yamlValue = (value: string) => (/^[\w(][^:#"{}\[\]&*!|>%@`]*$/.test(value) ? value : JSON.stringify(value));

const matching = (core: CoreFiles, prefix: string) =>
  Object.keys(core)
    .filter((path) => path.startsWith(prefix) && path.endsWith(".md"))
    .sort();

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".md".length);

// First sentence of the role's "## Job" section, used as the subagent description.
function roleDescription(role: string, md: string): string {
  const firstSentence = sectionBody(md, "Job").split(/(?<=\.)\s/)[0];
  return `Groundwork ${role}. ${firstSentence}`;
}

// Pure: core files in, Claude Code files out. Generated files point to the core instead of
// copying it, so .groundwork/ stays the single source of truth.
export function generateClaudeCode(core: CoreFiles): Record<string, string> {
  const out: Record<string, string> = {};

  const commands = matching(core, "commands/").map(baseName);
  for (const name of commands) {
    const { description } = parseFrontmatter(core[`commands/${name}.md`]);
    out[`.claude/skills/${name}/SKILL.md`] = [
      "---",
      `name: ${name}`,
      `description: ${yamlValue(description)}`,
      "---",
      `Read \`.groundwork/commands/${name}.md\` now and follow it exactly.`,
      "",
    ].join("\n");
  }

  const roles = matching(core, "roles/").map(baseName);
  for (const role of roles) {
    const tools = ROLE_TOOLS[role];
    if (!tools) throw new Error(`No Claude Code tools defined for role "${role}"`);
    out[`.claude/agents/gw-${role}.md`] = [
      "---",
      `name: gw-${role}`,
      `description: ${yamlValue(roleDescription(role, core[`roles/${role}.md`]))}`,
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
    `Groundwork commands are skills: ${commands.map((c) => `/${c}`).join(", ")}.`,
    `When a command says to run a role, use its subagent: ${roles.map((r) => `gw-${r}`).join(", ")}.`,
    "",
  ].join("\n");

  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

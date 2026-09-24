import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { generateClaudeCode } from "../src/adapters/claude-code.js";
import { estimateTokens } from "../src/tokens.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const out = generateClaudeCode(core);

const COMMANDS = ["gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject", "gw-handoff", "gw-resume"];
const ROLES = ["planner", "tester", "implementer", "reviewer"];

function frontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

const tools = (md: string) => (frontmatter(md).tools ?? "").split(",").map((t) => t.trim()).filter(Boolean);

describe("readCore", () => {
  it("reads core files keyed by forward-slash relative path", () => {
    expect(Object.keys(core)).toContain("commands/gw-next.md");
    expect(Object.keys(core)).toContain("roles/reviewer.md");
    expect(Object.keys(core).every((p) => !p.includes("\\"))).toBe(true);
  });
});

describe("Claude Code adapter", () => {
  it("generates exactly the expected files", () => {
    expect(Object.keys(out).sort()).toEqual(
      [
        "CLAUDE.md",
        ...COMMANDS.map((c) => `.claude/skills/${c}/SKILL.md`),
        ...ROLES.map((r) => `.claude/agents/gw-${r}.md`),
      ].sort(),
    );
  });

  it.each(COMMANDS)("skill %s has the command's name and description", (name) => {
    const skill = frontmatter(out[`.claude/skills/${name}/SKILL.md`]);
    const command = frontmatter(core[`commands/${name}.md`]);
    expect(skill.name).toBe(name);
    expect(skill.description).toBe(command.description);
  });

  it.each(COMMANDS)("skill %s points to the core command instead of copying it", (name) => {
    const skill = out[`.claude/skills/${name}/SKILL.md`];
    expect(skill).toContain(`.groundwork/commands/${name}.md`);
    expect(skill).not.toContain("## Steps");
    expect(estimateTokens(skill)).toBeLessThan(150);
  });

  it.each(ROLES)("agent gw-%s points to its core role file", (role) => {
    const agent = out[`.claude/agents/gw-${role}.md`];
    expect(frontmatter(agent).name).toBe(`gw-${role}`);
    expect(frontmatter(agent).description?.length ?? 0).toBeGreaterThan(20);
    expect(agent).toContain(`.groundwork/roles/${role}.md`);
    expect(agent).not.toContain("## Must not");
  });

  it("gives each subagent only the tools its role needs", () => {
    const agent = (role: string) => tools(out[`.claude/agents/gw-${role}.md`]);
    for (const role of ROLES) expect(agent(role)).toContain("Read");

    // The reviewer judges; it doesn't repair.
    expect(agent("reviewer")).not.toContain("Edit");
    expect(agent("reviewer")).not.toContain("Write");
    expect(agent("reviewer")).toContain("Bash");

    // The planner writes docs, never runs code.
    expect(agent("planner")).not.toContain("Bash");

    for (const role of ["tester", "implementer"]) {
      expect(agent(role)).toEqual(expect.arrayContaining(["Edit", "Write", "Bash"]));
    }
  });

  it("CLAUDE.md imports AGENTS.md and maps roles to subagents", () => {
    const claude = out["CLAUDE.md"];
    expect(claude).toContain("@AGENTS.md");
    for (const role of ROLES) expect(claude).toContain(`gw-${role}`);
    expect(estimateTokens(claude)).toBeLessThan(200);
  });

  it("is pure: same input, same output, input untouched", () => {
    const frozen = Object.freeze({ ...core });
    expect(generateClaudeCode(frozen)).toEqual(generateClaudeCode(frozen));
    expect(frozen).toEqual(core);
  });

  it("quotes descriptions that would break YAML", () => {
    const tricky = {
      ...core,
      "commands/gw-next.md": core["commands/gw-next.md"].replace(/^description: .*$/m, 'description: Next card: run "the loop" # now'),
    };
    const skill = generateClaudeCode(tricky)[".claude/skills/gw-next/SKILL.md"];
    expect(skill).toContain('description: "Next card: run \\"the loop\\" # now"');
  });

  it("matches the snapshot", () => {
    expect(out).toMatchSnapshot();
  });
});

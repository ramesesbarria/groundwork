// Card 7.1: command descriptions say when to use them, and only the human can approve or reject.
// Claude Code field checked against code.claude.com/docs/en/skills on 2026-09-24.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { generateClaudeCode } from "../src/adapters/claude-code.js";
import { generateOpenCode } from "../src/adapters/opencode.js";
import { parseFrontmatter } from "../src/frontmatter.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const claude = generateClaudeCode(core);
const opencode = generateOpenCode(core);
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

const COMMANDS = ["gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject", "gw-handoff", "gw-resume", "gw-quick", "gw-decide", "gw-ui-spec", "gw-retro"];
const HUMAN_ONLY = ["gw-approve", "gw-reject"];

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const description = (name: string) => parseFrontmatter(core[`commands/${name}.md`]).description ?? "";
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean);

describe("command descriptions are triggers", () => {
  it.each(COMMANDS)("%s says when to use it", (name) => {
    expect(description(name)).toMatch(/^Use when /);
  });

  it.each(COMMANDS)("%s is a sentence or two", (name) => {
    expect(sentences(description(name)).length).toBeLessThanOrEqual(2);
  });

  it.each(HUMAN_ONLY)("%s says only the human asks for it", (name) => {
    expect(description(name)).toMatch(/the human (asks|says)/i);
  });
});

describe("only the human approves or rejects", () => {
  it.each(HUMAN_ONLY)("Claude Code skill %s can't be invoked by the model", (name) => {
    expect(claude[`.claude/skills/${name}/SKILL.md`]).toMatch(/^disable-model-invocation: true$/m);
  });

  it.each(COMMANDS.filter((c) => !HUMAN_ONLY.includes(c)))("Claude Code skill %s can still be invoked by the model", (name) => {
    expect(claude[`.claude/skills/${name}/SKILL.md`]).not.toContain("disable-model-invocation");
  });

  it.each(HUMAN_ONLY)("OpenCode command %s still carries the same description", (name) => {
    expect(opencode[`.opencode/commands/${name}.md`]).toContain(description(name).slice(0, 30));
  });

  it.each(HUMAN_ONLY)("core %s says in its own text that only the human runs it, with no adapter", (name) => {
    const text = core[`commands/${name}.md`];
    expect(section(text, "Purpose")).toMatch(/only the human runs this/i);
    expect(section(text, "Steps")).toMatch(/didn't ask for (this|it)[^\n]*stop/i);
    expect(section(text, "Must not")).toMatch(/on your own/i);
  });

  it("README lists the OpenCode gap under Honest limitations", () => {
    const limits = section(readme, "Honest limitations");
    expect(limits).toMatch(/OpenCode/);
    expect(limits).toMatch(/gw-approve/);
  });
});

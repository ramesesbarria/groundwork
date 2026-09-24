import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const commandsDir = new URL("../../core/commands/", import.meta.url);
const command = (name: string) => readFileSync(new URL(`${name}.md`, commandsDir), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

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

// Each card adds its commands here.
const COMMANDS = ["gw-setup", "gw-spec", "gw-plan"];

describe("command files", () => {
  it.each(COMMANDS)("%s exists", (name) => {
    expect(existsSync(new URL(`${name}.md`, commandsDir))).toBe(true);
  });

  it.each(COMMANDS)("%s has name and description frontmatter (used by adapters)", (name) => {
    const fm = frontmatter(command(name));
    expect(fm.name).toBe(name);
    expect(fm.description?.length ?? 0).toBeGreaterThan(20);
  });

  it.each(COMMANDS)("%s has purpose, steps and writes sections", (name) => {
    const text = command(name);
    for (const heading of ["Purpose", "Steps", "Writes"]) {
      expect(section(text, heading), `${name}.md is missing "## ${heading}"`).not.toBe("");
    }
  });

  it.each(COMMANDS)("%s stays under 800 tokens", (name) => {
    expect(estimateTokens(command(name))).toBeLessThan(800);
  });
});

describe("gw-spec", () => {
  it("asks specific questions in batches", () => {
    const steps = section(command("gw-spec"), "Steps");
    expect(steps).toMatch(/batch/i);
    expect(steps).toMatch(/specific/i);
  });

  it("forbids section-level questions", () => {
    expect(command("gw-spec")).toContain("do you agree with section");
    expect(section(command("gw-spec"), "Must not")).toMatch(/section/i);
  });

  it("runs as the planner", () => {
    expect(command("gw-spec")).toContain(".groundwork/roles/planner.md");
  });
});

describe("gw-plan", () => {
  it("writes one card file per card from the template, with criteria and depends_on", () => {
    const text = command("gw-plan");
    expect(text).toMatch(/one (card )?file per card/i);
    expect(text).toContain(".groundwork/cards/");
    expect(text).toMatch(/acceptance criteria/i);
    expect(text).toContain("depends_on");
  });

  it("gets the human's OK before writing cards", () => {
    expect(section(command("gw-plan"), "Steps")).toMatch(/wait for/i);
  });

  it("runs as the planner", () => {
    expect(command("gw-plan")).toContain(".groundwork/roles/planner.md");
  });
});

describe("gw-setup", () => {
  it("writes AGENTS.md and config.json from a short interview", () => {
    const text = command("gw-setup");
    expect(section(text, "Writes")).toContain("AGENTS.md");
    expect(section(text, "Writes")).toContain(".groundwork/config.json");
    expect(section(text, "Steps")).toMatch(/ask/i);
  });

  it("never picks a stack for the user", () => {
    expect(section(command("gw-setup"), "Must not")).toMatch(/stack/i);
  });

  it("handles only new projects in v0.1 and says so", () => {
    expect(command("gw-setup")).toMatch(/existing project/i);
  });
});

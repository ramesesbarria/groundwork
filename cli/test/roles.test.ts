import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const rolesDir = new URL("../../core/roles/", import.meta.url);
const role = (name: string) => readFileSync(new URL(`${name}.md`, rolesDir), "utf8");

// The text of one "## Heading" section, up to the next "## ".
function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const ROLES = ["planner", "tester", "implementer", "reviewer"];

describe("role files", () => {
  it("has one file per role and nothing else", () => {
    expect(readdirSync(rolesDir).sort()).toEqual(ROLES.map((r) => `${r}.md`).sort());
  });

  it.each(ROLES)("%s has job, load, writes and must-not sections", (name) => {
    const text = role(name);
    for (const heading of ["Job", "Load", "Writes", "Must not"]) {
      expect(section(text, heading), `${name}.md is missing "## ${heading}"`).not.toBe("");
    }
  });

  it.each(ROLES)("%s stays under 800 tokens", (name) => {
    expect(estimateTokens(role(name))).toBeLessThan(800);
  });

  it.each(ROLES)("%s says exactly which files to load, starting with HANDOFF", (name) => {
    const load = section(role(name), "Load");
    expect(load).toContain(".groundwork/HANDOFF.md");
    expect(load).toMatch(/only/i);
  });

  it("implementer loads the current card and its tests, not the whole spec", () => {
    const load = section(role("implementer"), "Load");
    expect(load).toContain(".groundwork/cards/");
    expect(load).toMatch(/tests?/i);
    expect(load).not.toContain(".groundwork/SPEC.md");
  });

  it("reviewer checks the diff against the card, SPEC and LESSONS", () => {
    const load = section(role("reviewer"), "Load");
    for (const path of [".groundwork/cards/", ".groundwork/SPEC.md", ".groundwork/LESSONS.md"]) {
      expect(load).toContain(path);
    }
    expect(load).toMatch(/diff/i);
  });

  it("reviewer cites lesson IDs in its verdict", () => {
    expect(section(role("reviewer"), "Writes")).toMatch(/lesson IDs?/i);
  });

  it.each([
    ["planner", /code/i],
    ["tester", /implementation/i],
    ["implementer", /tests?/i],
    ["reviewer", /fix/i],
  ])("%s has its key 'must not' from SPEC §6", (name, pattern) => {
    expect(section(role(name), "Must not")).toMatch(pattern);
  });
});

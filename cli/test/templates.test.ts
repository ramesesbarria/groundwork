import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { CARD_FIELDS, CARD_STATUSES, APPROVAL_MODES } from "../src/schema.js";
import { estimateTokens } from "../src/tokens.js";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const template = (name: string) => read(`core/templates/${name}`);

function frontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("no frontmatter");
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

const statusesIn = (value: string) => value.split("|").map((s) => s.trim());

describe("core templates", () => {
  it("has exactly the templates init will copy", () => {
    expect(readdirSync(new URL("core/templates/", root)).sort()).toEqual(
      ["AGENTS.md", "HANDOFF.md", "JOURNAL.md", "LESSONS.md", "SPEC.md", "card.md", "config.json", "config.schema.json", "decision.md"],
    );
  });

  it.each([
    ["AGENTS.md", ["## Project", "## Commands", "## How we work", "## Rules"]],
    ["SPEC.md", ["## Problem", "## Users", "## Goals", "## Non-goals", "## Features", "## Open questions"]],
    ["HANDOFF.md", ["**Phase:**", "**Current card:**", "**Status:**", "**Last step:**", "**Next step:**", "**Failing checks:**"]],
    ["LESSONS.md", ["NOTE", "RULE", "GUARD", "Origin:"]],
    ["card.md", ["## Goal", "## Acceptance criteria", "## Evidence", "## History"]],
    ["decision.md", ["## Context", "## Options", "## Decision", "## Consequences"]],
  ])("%s has its required sections", (name, sections) => {
    const text = template(name);
    for (const section of sections) expect(text, `${name} is missing "${section}"`).toContain(section);
  });

  it("keeps the AGENTS.md template under the 2,000-token budget", () => {
    expect(estimateTokens(template("AGENTS.md"))).toBeLessThan(2000);
  });

  it("AGENTS.md points into .groundwork/ instead of repeating it", () => {
    const text = template("AGENTS.md");
    for (const path of [".groundwork/HANDOFF.md", ".groundwork/workflow.md", ".groundwork/roles/", ".groundwork/LESSONS.md"]) {
      expect(text).toContain(path);
    }
  });

  it("card template frontmatter matches the schema", () => {
    const fm = frontmatter(template("card.md"));
    expect(Object.keys(fm)).toEqual([...CARD_FIELDS]);
    expect(statusesIn(fm.status)).toEqual([...CARD_STATUSES]);
  });

  it("card schema matches the card example in SPEC §8", () => {
    const spec = read(".groundwork/SPEC.md");
    const section8 = spec.slice(spec.indexOf("## 8."), spec.indexOf("## 9."));
    const example = section8.match(/```md\r?\n([\s\S]*?)```/)![1];
    const fm = frontmatter(example);
    expect(Object.keys(fm)).toEqual([...CARD_FIELDS]);
    expect(statusesIn(fm.status)).toEqual([...CARD_STATUSES]);
  });

  it("config.json has a schema covering approval mode, token budget and commands", () => {
    const schema = JSON.parse(template("config.schema.json"));
    const config = JSON.parse(template("config.json"));

    expect(schema.required).toEqual(expect.arrayContaining(["approvalMode", "tokenBudget", "commands"]));
    expect(schema.properties.approvalMode.enum).toEqual([...APPROVAL_MODES]);
    expect(Object.keys(schema.properties.commands.properties)).toEqual(
      expect.arrayContaining(["test", "lint", "build"]),
    );

    // The default config satisfies the schema's basics.
    for (const key of schema.required) expect(config).toHaveProperty(key);
    for (const key of Object.keys(config)) expect(schema.properties).toHaveProperty(key);
    expect(APPROVAL_MODES).toContain(config.approvalMode);
    expect(config.approvalMode).toBe("per-card");
    expect(config.tokenBudget).toBe(2000);
  });
});

describe("estimateTokens", () => {
  it("estimates about one token per four characters, rounding up", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });
});

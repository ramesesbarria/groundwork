// When a request comes without a command, the agent says which path it's taking.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const agents = readFileSync(new URL("../../core/templates/AGENTS.md", import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

// The numbered rule in "How we work" that mentions gw-quick.
const pathRule = () => section(agents, "How we work").split("\n").find((line) => line.includes("gw-quick")) ?? "";

describe("say the path out loud", () => {
  it("the rule applies when a request comes without a command", () => {
    expect(pathRule()).toMatch(/without a command/i);
  });

  it("names both paths: quick and card", () => {
    expect(pathRule()).toContain("gw-quick");
    expect(pathRule()).toMatch(/\bcard\b/i);
  });

  it("says the choice in one line before starting", () => {
    expect(pathRule()).toMatch(/one line/i);
  });

  it("lets the human override it", () => {
    expect(pathRule()).toMatch(/override|switch/i);
  });

  it("is one merged rule, so How we work still has 9 items", () => {
    expect(section(agents, "How we work").match(/^\d+\. /gm)?.length).toBe(9);
  });

  it("keeps the AGENTS.md template at about 400 tokens", () => {
    expect(estimateTokens(agents)).toBeLessThan(450);
  });
});

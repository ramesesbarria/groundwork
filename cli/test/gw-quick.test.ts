// Card 4.1: a light path for small changes (L-013).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("gw-quick", () => {
  const quick = () => core("commands/gw-quick.md");

  it("says when to use it and when to make a card instead", () => {
    const text = section(quick(), "When to use it");
    expect(text).toMatch(/small/i);
    expect(text).toMatch(/card instead/i);
  });

  it("stops and suggests a card if the change grows", () => {
    expect(section(quick(), "Steps")).toMatch(/stop[^\n]*card|card[^\n]*stop/i);
  });

  it("needs no card file or separate roles", () => {
    expect(section(quick(), "Purpose")).toMatch(/no card/i);
    expect(section(quick(), "Purpose")).toMatch(/no separate roles/i);
  });

  it("requires tests, lint and build to pass before committing", () => {
    const steps = section(quick(), "Steps");
    expect(steps).toMatch(/test/i);
    expect(steps).toMatch(/pass/i);
    expect(steps).toMatch(/before[^\n]*commit/i);
  });

  it("follows LESSONS and the approval mode", () => {
    const steps = section(quick(), "Steps");
    expect(steps).toContain(".groundwork/LESSONS.md");
    expect(steps).toContain("`per-card`");
    expect(steps).toContain("`per-phase`");
  });

  it("uses a [quick] commit message and leaves one line in HANDOFF", () => {
    const steps = section(quick(), "Steps");
    expect(steps).toContain("[quick]");
    expect(steps).toContain(".groundwork/HANDOFF.md");
  });

  it("is mentioned in the workflow and the AGENTS.md template", () => {
    expect(core("workflow.md")).toContain("gw-quick");
    expect(core("templates/AGENTS.md")).toContain("gw-quick");
  });
});

// Card 9.1: bugs go through the quick path, cause first.
describe("gw-quick: fixing a bug", () => {
  const bug = () => section(core("commands/gw-quick.md"), "Fixing a bug");
  const numbered = () => bug().split("\n").filter((line) => /^\d+\. /.test(line));

  it("has a bug branch", () => {
    expect(bug()).not.toBe("");
  });

  it("reproduces the bug with a failing test first", () => {
    expect(numbered()[0]).toMatch(/reproduce/i);
    expect(numbered()[0]).toMatch(/failing test/i);
  });

  it("states the cause in one sentence, with evidence, before any fix", () => {
    const cause = numbered().findIndex((line) => /cause/i.test(line));
    const fix = numbered().findIndex((line) => /\bfix\b/i.test(line) && !/cause/i.test(line));
    expect(cause).toBeGreaterThan(0);
    expect(numbered()[cause]).toMatch(/one sentence/i);
    expect(numbered()[cause]).toMatch(/evidence/i);
    expect(fix).toBeGreaterThan(cause);
  });

  it("stops and suggests a card after two honest attempts without a cause", () => {
    expect(bug()).toMatch(/two (honest )?attempts/i);
    expect(bug()).toMatch(/stop[^\n]*card|card[^\n]*stop/i);
  });

  it("When to use it sends unclear bugs here instead of to a card", () => {
    const when = section(core("commands/gw-quick.md"), "When to use it");
    expect(when).toMatch(/Fixing a bug/);
    expect(when).not.toMatch(/its cause isn't clear/);
  });

  it("the AGENTS.md routing rule mentions bugs", () => {
    const rule = core("templates/AGENTS.md").split("\n").find((line) => line.includes("gw-quick")) ?? "";
    expect(rule).toMatch(/bug/i);
  });
});

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

// Card 9.5: a third size for feasibility questions. The answer is kept, not the code.
describe("gw-quick: trying something out", () => {
  const trySection = () => section(core("commands/gw-quick.md"), "Trying something out");
  const rule = () => core("templates/AGENTS.md").split("\n").find((line) => line.includes("gw-quick")) ?? "";

  it("has a try branch that starts from a one-line question", () => {
    expect(trySection()).toMatch(/question in one line/i);
  });

  it("works on a throwaway branch or scratch folder, never the main branch", () => {
    expect(trySection()).toMatch(/throwaway branch|scratch folder/i);
    expect(trySection()).toMatch(/never[^\n]*main branch/i);
  });

  it("reports an answer and a recommendation", () => {
    expect(trySection()).toMatch(/answer/i);
    expect(trySection()).toMatch(/recommendation/i);
  });

  it("never merges the code; keeping it means a card", () => {
    expect(trySection()).toMatch(/(don't|never) merge/i);
    expect(trySection()).toMatch(/keep[^\n]*card/i);
  });

  it("the routing rule names all three paths: try, quick and card", () => {
    expect(rule()).toMatch(/\btry\b/i);
    expect(rule()).toMatch(/\bquick\b/i);
    expect(rule()).toMatch(/\bcard\b/i);
  });

  it("the AGENTS.md template stays at about 400 tokens", () => {
    expect(Math.ceil(core("templates/AGENTS.md").length / 4)).toBeLessThan(450);
  });
});

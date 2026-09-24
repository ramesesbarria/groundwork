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

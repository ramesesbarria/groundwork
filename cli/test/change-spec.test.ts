// Card 9.9: on an existing project, you spec the change you want, not the whole app.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("the spec template", () => {
  const changes = () => section(core("templates/SPEC.md"), "Changes");

  it("has a Changes section with one sub-section per change", () => {
    expect(changes()).not.toBe("");
    expect(changes()).toMatch(/one sub-section per change/i);
  });

  it("each change has a goal, rules, edge cases and what must not break", () => {
    for (const part of ["Goal", "Rules", "Edge cases", "Must not break"]) expect(changes()).toContain(part);
  });

  it("keeps the new-project sections", () => {
    for (const s of ["## Problem", "## Users", "## Goals", "## Non-goals", "## Features", "## Open questions"]) {
      expect(core("templates/SPEC.md")).toContain(s);
    }
  });
});

describe("gw-spec on an existing project", () => {
  const existing = () => section(core("commands/gw-spec.md"), "Existing project");

  it("starts by asking what to change or add first", () => {
    expect(existing()).toContain("What do you want to change or add first?");
  });

  it("writes one change section, including what must not break", () => {
    expect(existing()).toMatch(/Changes/);
    expect(existing()).toMatch(/must not break/i);
  });

  it("keeps the smallest-useful-version rule", () => {
    expect(existing()).toMatch(/smallest/i);
  });

  it("the new-project steps are unchanged in shape: scope first, then batches of questions", () => {
    const steps = section(core("commands/gw-spec.md"), "Steps");
    expect(steps).toMatch(/smallest version that would be useful/i);
    expect(steps).toMatch(/batch of 3–5 specific questions/i);
  });
});

describe("planning and routing one change at a time", () => {
  it("gw-plan plans cards for one change at a time", () => {
    expect(section(core("commands/gw-plan.md"), "Steps")).toMatch(/one change at a time/i);
  });

  it("after existing-project setup, the next step is a question about what to change", () => {
    const steps = section(core("commands/gw-setup.md"), "Steps");
    expect(steps).toMatch(/what do you want to change/i);
    expect(steps).not.toMatch(/`gw-plan` \(existing project\)/);
  });

  it("/gw asks what to work on when an existing project has no open change", () => {
    const rows = section(core("commands/gw.md"), "Steps").split("\n").filter((l) => l.startsWith("| ") && /no open change/i.test(l));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatch(/what to change/i);
  });
});

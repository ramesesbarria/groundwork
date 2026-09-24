// Card 9.10: setup leaves a short map of where things live, and the roles load it first.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("the codebase map", () => {
  const step = () =>
    section(core("guides/existing-project.md"), "Existing project")
      .split(/\n(?=\d+\. )/)
      .find((s) => /Codebase map/.test(s)) ?? "";

  it("existing-project setup writes it into SPEC.md", () => {
    expect(step()).toContain(".groundwork/SPEC.md");
  });

  it("covers main folders, entry points, where tests live and anything unusual", () => {
    for (const thing of [/main folders/i, /entry points/i, /tests live/i, /unusual/i]) expect(step()).toMatch(thing);
  });

  it("marks each item found or guessed, and stays under about 20 lines", () => {
    expect(step()).toContain("*found*");
    expect(step()).toContain("*guessed*");
    expect(step()).toMatch(/20 lines/);
  });

  it("the spec template has a place for it", () => {
    expect(core("templates/SPEC.md")).toContain("## Codebase map");
  });

  it("gw-plan keeps it current when a card adds a new area", () => {
    expect(section(core("commands/gw-plan.md"), "Steps")).toMatch(/Codebase map/);
  });
});

describe("roles load the map first", () => {
  it.each(["tester", "implementer", "reviewer"])("%s names it in its Load list", (role) => {
    const load = section(core(`roles/${role}.md`), "Load");
    expect(load).toMatch(/Codebase map/);
    expect(load).toMatch(/only the files it points to/i);
  });
});

// Every stop for approval shows what changed, how to check it yourself, and caveats.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const PARTS = [/what changed/i, /how to check/i, /caveats/i];
const stopStep = () => section(core("commands/gw-next.md"), "Steps").split(/\n(?=\d+\. )/).find((s) => s.startsWith("7.")) ?? "";

describe("the approval summary", () => {
  it("gw-next's stop step names all three parts", () => {
    for (const part of PARTS) expect(stopStep()).toMatch(part);
  });

  it("gw-next uses it for both the per-card and the per-phase stop", () => {
    const step = stopStep();
    const perCard = step.slice(step.indexOf("`per-card`"), step.indexOf("`per-phase`"));
    const perPhase = step.slice(step.indexOf("`per-phase`"));
    expect(perCard).toMatch(/summary/i);
    expect(perPhase).toMatch(/summary/i);
  });

  it("gw-approve shows the same summary before committing", () => {
    const steps = section(core("commands/gw-approve.md"), "Steps");
    for (const part of PARTS) expect(steps).toMatch(part);
    expect(steps.search(/how to check/i)).toBeLessThan(steps.search(/commit/i));
  });

  it("the card template has an optional How to check section", () => {
    const card = core("templates/card.md");
    expect(card).toContain("## How to check");
    expect(section(card, "How to check")).toMatch(/optional/i);
  });

  it("the reviewer writes How to check for the human", () => {
    const reviewer = core("roles/reviewer.md");
    expect(section(reviewer, "Job")).toMatch(/how to check/i);
    expect(section(reviewer, "Writes")).toMatch(/how to check/i);
  });
});

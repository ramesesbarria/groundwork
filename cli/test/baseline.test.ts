// Card 9.8: existing projects get a test baseline, and the rule becomes "no new failures".
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("recording a baseline", () => {
  const guide = () => section(core("guides/existing-project.md"), "Existing project");

  it("setup runs test, lint and build once and saves the result", () => {
    expect(guide()).toMatch(/test, lint and build once/i);
    expect(guide()).toContain(".groundwork/evidence/baseline/");
  });

  it("links the baseline from HANDOFF as known failing", () => {
    expect(guide()).toMatch(/Known failing/);
    expect(guide()).toMatch(/HANDOFF/);
  });

  it("with no tests at all, it leads to a decision, not a dead end", () => {
    expect(guide()).toMatch(/no tests/i);
    expect(guide()).toContain("gw-decide");
    expect(guide()).toMatch(/first card/i);
    expect(guide()).toMatch(/manual checks/i);
  });
});

describe("judging with a baseline", () => {
  it("the workflow defines both rules: all pass, or no new failures against a baseline", () => {
    const checks = section(core("workflow.md"), "Checks");
    expect(checks).toMatch(/all pass/i);
    expect(checks).toMatch(/no new failures/i);
    expect(checks).toMatch(/baseline/i);
    expect(checks).toMatch(/fixes a baseline failure/i);
  });

  it.each(["roles/implementer.md", "roles/reviewer.md", "commands/gw-quick.md"])("%s uses no new failures when there's a baseline", (path) => {
    expect(core(path)).toMatch(/no new failures/i);
    expect(core(path)).toMatch(/baseline/i);
  });
});

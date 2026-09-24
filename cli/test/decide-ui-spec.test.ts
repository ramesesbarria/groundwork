// Card 4.5: gw-decide and gw-ui-spec.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const command = (name: string) =>
  readFileSync(new URL(`../../core/commands/${name}.md`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("gw-decide", () => {
  const steps = () => section(command("gw-decide"), "Steps");

  it("writes a decision record from the template with 2–4 options and trade-offs", () => {
    expect(steps()).toContain(".groundwork/templates/decision.md");
    expect(steps()).toContain(".groundwork/decisions/");
    expect(steps()).toMatch(/2–4 options/);
    expect(steps()).toMatch(/trade-offs|pros/i);
  });

  it("waits for the human and records the choice in their words", () => {
    expect(steps()).toMatch(/wait/i);
    expect(steps()).toMatch(/their words/i);
    expect(steps()).toContain("`accepted`");
  });

  it("marks a replaced decision as superseded", () => {
    expect(steps()).toContain("`superseded`");
  });

  it("updates the commands when the stack changes", () => {
    expect(steps()).toContain(".groundwork/config.json");
    expect(steps()).toContain("AGENTS.md");
  });

  it("never chooses for the human", () => {
    expect(section(command("gw-decide"), "Must not")).toMatch(/choose/i);
  });

  it("is what gw-plan uses for its decisions", () => {
    expect(section(command("gw-plan"), "Steps")).toContain("gw-decide");
  });
});

describe("gw-ui-spec", () => {
  const steps = () => section(command("gw-ui-spec"), "Steps");

  it("covers states, transitions, constraints and screen sizes", () => {
    const text = steps();
    for (const word of [/states?/i, /transitions?/i, /constraints?/i, /screen sizes?/i]) expect(text).toMatch(word);
  });

  it("says which elements move, and handles long text", () => {
    expect(steps()).toMatch(/which elements move/i);
    expect(steps()).toMatch(/long text/i);
  });

  it("offers two approaches with trade-offs", () => {
    expect(steps()).toMatch(/two (implementation )?approaches/i);
  });

  it("writes the behavior as checkable criteria on the card and waits for OK before code", () => {
    const text = steps();
    expect(text).toMatch(/acceptance criteria/i);
    expect(text).toContain(".groundwork/cards/");
    expect(text).toMatch(/wait for/i);
    expect(section(command("gw-ui-spec"), "Must not")).toMatch(/code/i);
  });

  it("says how the behavior is verified: screenshots at each size, or manual checks", () => {
    expect(steps()).toMatch(/screenshot/i);
    expect(steps()).toMatch(/manual check/i);
  });

  it("records a known-good state before a redesign", () => {
    expect(steps()).toMatch(/commit/i);
  });
});

// Card 9.2: labeled recommendations (decision 0001).
describe("gw-decide: labeled recommendations", () => {
  const steps = () => section(command("gw-decide"), "Steps");
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

  it("may recommend one option, always labeled as a recommendation with its reason", () => {
    expect(steps()).toMatch(/\*\*Recommendation:\*\*/);
    expect(steps()).toMatch(/why|because/i);
  });

  it("records taking the recommendation as the human's explicit choice, in their words", () => {
    expect(steps()).toMatch(/accepted the recommendation/i);
    expect(steps()).toMatch(/their words/i);
  });

  it("still doesn't accept \"you decide\" as a choice without a clear yes", () => {
    expect(steps()).toMatch(/"you decide"|"your call"/i);
    expect(steps()).toMatch(/yes/i);
    expect(section(command("gw-decide"), "Must not")).toMatch(/silently|without (their|the human's) (answer|yes)/i);
  });

  it("the planner may recommend but never chooses silently", () => {
    const mustNot = section(read("core/roles/planner.md"), "Must not");
    expect(mustNot).toMatch(/recommend/i);
    expect(mustNot).toMatch(/silently/i);
  });

  it("gw-plan still never chooses for the human", () => {
    expect(section(command("gw-plan"), "Must not")).toMatch(/choose/i);
  });

  it("the decision template records whether the recommendation was taken", () => {
    expect(section(read("core/templates/decision.md"), "Decision")).toMatch(/recommendation/i);
  });

  it("README and SPEC describe the labeled recommendation", () => {
    const readme = read("README.md");
    expect(readme.split("\n").find((l) => l.includes("**Stack-neutral.**")) ?? "").toMatch(/labeled recommendation/i);
    expect(read(".groundwork/SPEC.md").split("\n").find((l) => l.includes("**Stack-neutral.**")) ?? "").toMatch(/labeled recommendation/i);
  });
});

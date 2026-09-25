// Checks that see the running app, and decisions that don't quietly switch checks off.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("the run command", () => {
  it("the config template and schema have it, with a description", () => {
    expect(JSON.parse(core("templates/config.json")).commands).toHaveProperty("run", "");
    const run = JSON.parse(core("templates/config.schema.json")).properties.commands.properties.run;
    expect(run.type).toBe("string");
    expect(run.description).toMatch(/start the app/i);
  });

  it("AGENTS.md lists it with the other commands, within budget", () => {
    const agents = core("templates/AGENTS.md");
    expect(section(agents, "Commands")).toContain("- Run: `{{run_command}}`");
    expect(estimateTokens(agents)).toBeLessThan(450);
  });

  it("setup asks for it, and planning fills it in after checking it works", () => {
    expect(section(core("commands/gw-setup.md"), "Steps")).toMatch(/build and run commands/);
    const plan = section(core("commands/gw-plan.md"), "Steps");
    expect(plan).toMatch(/`run`/);
    expect(plan).toMatch(/check each command works on this machine/i);
  });

  it("stop summaries use it for How to check", () => {
    expect(section(core("commands/gw-next.md"), "Steps")).toMatch(/How to check it yourself[^\n]*`run`/);
  });
});

describe("seeing it work", () => {
  const reviewer = core("roles/reviewer.md");

  it("the reviewer checks on-screen criteria in the running app, not by reading code", () => {
    const job = section(reviewer, "Job");
    expect(job).toMatch(/sees or does on screen[^\n]*running app/);
    expect(job).toMatch(/headless browser/);
    expect(job).toMatch(/Reading the code isn't proof/);
  });

  it("when it truly can't, the gap is marked and shown to the human first", () => {
    expect(section(reviewer, "Job")).toMatch(/\*not verified live\*[^\n]*first caveat/);
    expect(section(reviewer, "Must not")).toMatch(/can't run the app before trying/);
  });

  it("the implementer tries changes a person sees", () => {
    expect(section(core("roles/implementer.md"), "Job")).toMatch(/changes what a person sees[^\n]*`run`/);
  });

  it("the runner passes roles only checked facts, never guesses about their tools", () => {
    const steps = section(core("commands/gw-next.md"), "Steps");
    expect(steps).toMatch(/only facts you've checked/);
    expect(steps).toMatch(/Don't pass on guesses/);
  });
});

describe("decisions that switch off part of the workflow", () => {
  it("gw-decide names what's switched off and recommends, at any experience", () => {
    const steps = section(core("commands/gw-decide.md"), "Steps");
    expect(steps).toMatch(/at any experience[^\n]*switches off part of the workflow[^\n]*include the Recommendation/);
  });

  it("the workflow's experience table says so too", () => {
    expect(section(core("workflow.md"), "Experience")).toMatch(/unless asked or a check is lost/);
  });

  it("the planner keeps logic testable and every stack option says how its tests run", () => {
    const job = section(core("roles/planner.md"), "Job");
    expect(job).toMatch(/Testable by default/);
    expect(job).toMatch(/node --test/);
    expect(job).toMatch(/Every stack option says how its tests run/);
    expect(section(core("commands/gw-plan.md"), "Steps")).toMatch(/without the UI goes in its own files/);
  });
});

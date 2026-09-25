// Behavior tests, one HANDOFF writer, and always saying what's next.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("tests that check behavior", () => {
  const tester = core("roles/tester.md");

  it("the tester doesn't write tests that only check a file or its source text", () => {
    expect(section(tester, "Must not")).toMatch(/only check a file exists or its source contains some text/);
  });

  it("browser checks are saved in the repo and rerun by the same command", () => {
    const job = section(tester, "Job");
    expect(job).toMatch(/browser check/);
    expect(job).toMatch(/in the repo next to the tests, not in a temp folder/);
    expect(job).toMatch(/How to check/);
    expect(section(core("roles/reviewer.md"), "Job")).toMatch(/rerun the tester's browser checks/);
  });

  it("the tester loads the run command", () => {
    expect(section(tester, "Load")).toMatch(/test and run commands/);
  });
});

describe("one HANDOFF writer", () => {
  it.each(["tester", "implementer", "reviewer"])("the %s leaves HANDOFF to the runner when it's a subagent", (name) => {
    expect(section(core(`roles/${name}.md`), "Writes")).toMatch(/As a subagent, put what HANDOFF needs in your report/);
  });

  it("gw-next says the runner is the only writer with subagents", () => {
    expect(section(core("commands/gw-next.md"), "Steps")).toMatch(/With subagents, only you write it/);
  });

  it("the reviewer knows the runner commits right after a pass in per-phase mode", () => {
    expect(section(core("roles/reviewer.md"), "Job")).toMatch(/`per-phase` mode, where the runner commits as soon as you pass/);
  });
});

describe("the next step is always obvious", () => {
  it("AGENTS.md: every stop ends with the next step", () => {
    expect(core("templates/AGENTS.md")).toMatch(/end each stop with the next step/);
  });

  it("gw-retro ends by saying what's next", () => {
    expect(section(core("commands/gw-retro.md"), "Steps")).toMatch(/tell the human the next step/);
  });

  it("gw never names a card that doesn't exist", () => {
    const steps = section(core("commands/gw.md"), "Steps");
    expect(steps).toMatch(/With no card in progress/);
    expect(steps).toMatch(/Don't mention a card that doesn't exist/);
  });
});

describe("asking questions", () => {
  it("spec and setup use the tool's clickable choices when it has them", () => {
    expect(section(core("commands/gw-spec.md"), "Steps")).toMatch(/clickable choices/);
    expect(section(core("commands/gw-setup.md"), "Steps")).toMatch(/clickable choices/);
  });

  it("a copy of a known product gets that product's behavior as the suggested default", () => {
    expect(section(core("commands/gw-spec.md"), "Steps")).toMatch(/copies a product people know, suggest how that product behaves/);
  });
});

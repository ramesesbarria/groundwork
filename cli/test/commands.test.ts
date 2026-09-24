import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const commandsDir = new URL("../../core/commands/", import.meta.url);
const command = (name: string) => readFileSync(new URL(`${name}.md`, commandsDir), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

function frontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

// Each card adds its commands here.
const COMMANDS = ["gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject", "gw-handoff", "gw-resume"];

describe("command files", () => {
  it.each(COMMANDS)("%s exists", (name) => {
    expect(existsSync(new URL(`${name}.md`, commandsDir))).toBe(true);
  });

  it.each(COMMANDS)("%s has name and description frontmatter (used by adapters)", (name) => {
    const fm = frontmatter(command(name));
    expect(fm.name).toBe(name);
    expect(fm.description?.length ?? 0).toBeGreaterThan(20);
  });

  it.each(COMMANDS)("%s has purpose, steps and writes sections", (name) => {
    const text = command(name);
    for (const heading of ["Purpose", "Steps", "Writes"]) {
      expect(section(text, heading), `${name}.md is missing "## ${heading}"`).not.toBe("");
    }
  });

  it.each(COMMANDS)("%s stays under 800 tokens", (name) => {
    expect(estimateTokens(command(name))).toBeLessThan(800);
  });
});

describe("gw-spec", () => {
  it("asks specific questions in batches", () => {
    const steps = section(command("gw-spec"), "Steps");
    expect(steps).toMatch(/batch/i);
    expect(steps).toMatch(/specific/i);
  });

  it("forbids section-level questions", () => {
    expect(command("gw-spec")).toContain("do you agree with section");
    expect(section(command("gw-spec"), "Must not")).toMatch(/section/i);
  });

  it("runs as the planner", () => {
    expect(command("gw-spec")).toContain(".groundwork/roles/planner.md");
  });
});

describe("gw-plan", () => {
  it("writes one card file per card from the template, with criteria and depends_on", () => {
    const text = command("gw-plan");
    expect(text).toMatch(/one (card )?file per card/i);
    expect(text).toContain(".groundwork/cards/");
    expect(text).toMatch(/acceptance criteria/i);
    expect(text).toContain("depends_on");
  });

  it("gets the human's OK before writing cards", () => {
    expect(section(command("gw-plan"), "Steps")).toMatch(/wait for/i);
  });

  it("runs as the planner", () => {
    expect(command("gw-plan")).toContain(".groundwork/roles/planner.md");
  });
});

describe("gw-setup", () => {
  it("writes AGENTS.md and config.json from a short interview", () => {
    const text = command("gw-setup");
    expect(section(text, "Writes")).toContain("AGENTS.md");
    expect(section(text, "Writes")).toContain(".groundwork/config.json");
    expect(section(text, "Steps")).toMatch(/ask/i);
  });

  it("never picks a stack for the user", () => {
    expect(section(command("gw-setup"), "Must not")).toMatch(/stack/i);
  });

  it("handles only new projects in v0.1 and says so", () => {
    expect(command("gw-setup")).toMatch(/existing project/i);
  });
});

describe("gw-next", () => {
  const steps = () => section(command("gw-next"), "Steps");

  it("picks the lowest-numbered todo or rejected card whose dependencies are all done", () => {
    const text = steps();
    expect(text).toMatch(/lowest/i);
    expect(text).toContain("depends_on");
    expect(text).toContain("`done`");
    expect(text).toContain("`rejected`");
  });

  it("compares card IDs as numbers, so 1.2 comes before 1.10", () => {
    expect(steps()).toMatch(/1\.2.*before.*1\.10/);
  });

  it("runs tester, then implementer, then reviewer", () => {
    const text = steps();
    const order = ["roles/tester.md", "roles/implementer.md", "roles/reviewer.md"].map((r) => text.indexOf(r));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("sends a rejected card straight to the implementer", () => {
    expect(steps()).toMatch(/rejected[^\n]*implementer/i);
  });

  it("stops at awaiting-approval in per-card mode", () => {
    const text = steps();
    expect(text).toContain("`per-card`");
    expect(text).toContain("`awaiting-approval`");
    expect(text).toMatch(/stop/i);
  });
});

describe("gw-approve", () => {
  it("refuses when Evidence is empty or a linked file is missing", () => {
    const text = section(command("gw-approve"), "Steps");
    expect(text).toMatch(/refuse/i);
    expect(text).toMatch(/empty/i);
    expect(text).toMatch(/missing/i);
  });

  it("commits with the card-ID format and marks the card done", () => {
    const text = command("gw-approve");
    expect(text).toContain("[<card-id>] <card title>");
    expect(text).toContain("`done`");
  });

  it("can approve a whole phase in per-phase mode", () => {
    const text = command("gw-approve");
    expect(text).toContain("`per-phase`");
    expect(text).toMatch(/phase <n> approved/i);
  });

  it("only approves a card that is awaiting approval", () => {
    expect(section(command("gw-approve"), "Steps")).toContain("`awaiting-approval`");
  });
});

describe("gw-reject", () => {
  it("records the reason under History and marks the card rejected", () => {
    const text = section(command("gw-reject"), "Steps");
    expect(text).toContain("History");
    expect(text).toMatch(/reason/i);
    expect(text).toContain("`rejected`");
  });

  it("asks for a reason if none is given", () => {
    expect(section(command("gw-reject"), "Steps")).toMatch(/no reason|without a reason/i);
  });

  it("says the implementer picks it up next", () => {
    expect(command("gw-reject")).toMatch(/implementer/i);
  });
});

const handoffTemplate = readFileSync(new URL("../../core/templates/HANDOFF.md", import.meta.url), "utf8");
const handoffFields = [...handoffTemplate.matchAll(/^- \*\*(.+?):\*\*/gm)].map((m) => m[1]);

describe("gw-handoff", () => {
  it("writes every field in the HANDOFF template", () => {
    expect(handoffFields).toEqual(
      expect.arrayContaining(["Current card", "Status", "Last step", "Next step", "Failing checks"]),
    );
    const steps = section(command("gw-handoff"), "Steps");
    for (const field of handoffFields) expect(steps, `gw-handoff doesn't mention "${field}"`).toContain(field);
  });

  it("overwrites HANDOFF instead of appending", () => {
    expect(section(command("gw-handoff"), "Steps")).toMatch(/overwrite/i);
  });

  it("is also run before stopping", () => {
    expect(command("gw-handoff")).toMatch(/before (you )?stop/i);
  });
});

describe("gw-resume", () => {
  const steps = () => section(command("gw-resume"), "Steps");

  it("restarts from HANDOFF and the current card only", () => {
    expect(steps()).toContain(".groundwork/HANDOFF.md");
    expect(steps()).toMatch(/current card/i);
    expect(steps()).toMatch(/only/i);
  });

  it("doesn't redo finished steps", () => {
    expect(steps()).toMatch(/don't redo|do not redo/i);
  });

  it("treats the card's status as the truth when HANDOFF disagrees", () => {
    expect(steps()).toMatch(/disagree/i);
  });

  it("continues with the role that matches the card's status", () => {
    const text = steps();
    for (const status of ["`testing`", "`implementing`", "`review`"]) expect(text).toContain(status);
  });
});

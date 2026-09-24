// Card 7.4: setup asks without config words, and the README has a short glossary.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const setup = read("core/commands/gw-setup.md");
const readme = read("README.md");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

// The questions asked in step 2, one per bullet.
const questions = () => {
  const steps = section(setup, "Steps");
  const step2 = steps.slice(steps.indexOf("\n2. "), steps.indexOf("\n3. "));
  return step2.split("\n").filter((line) => line.trim().startsWith("- "));
};

describe("setup without jargon", () => {
  it("asks about approval in plain words", () => {
    const approval = questions().find((q) => /check/i.test(q)) ?? "";
    expect(approval).toMatch(/every piece of work/i);
    expect(approval).toMatch(/milestone/i);
  });

  it("uses no config words in the questions", () => {
    for (const q of questions()) expect(q).not.toMatch(/per-card|per-phase|approvalMode/);
  });

  it("still writes the config value", () => {
    const steps = section(setup, "Steps");
    expect(steps).toContain("`approvalMode`");
    expect(steps).toMatch(/every piece of work[^\n]*`per-card`/i);
    expect(steps).toMatch(/milestone[^\n]*`per-phase`/i);
  });

  it("the existing-project path asks the same plain question", () => {
    expect(section(setup, "Existing project")).not.toMatch(/approval-mode question/i);
  });
});

describe("README glossary", () => {
  it("defines the five words, one line each", () => {
    const glossary = section(readme, "Glossary");
    for (const word of ["Card", "Phase", "Evidence", "Handoff", "Lesson"]) {
      expect(glossary).toMatch(new RegExp(`^- \\*\\*${word}\\*\\*`, "m"));
    }
  });
});

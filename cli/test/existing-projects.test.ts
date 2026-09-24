// Card 4.4: gw-setup on a repo that already has code (SPEC §11).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { planInit } from "../src/init.js";
import { readCore } from "../src/core.js";

const setup = readFileSync(new URL("../../core/commands/gw-setup.md", import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("gw-setup for existing projects", () => {
  const existing = () => section(setup, "Existing project");

  it("no longer tells the human existing projects aren't supported", () => {
    expect(setup).not.toMatch(/arrives in Groundwork v0\.2/);
  });

  it("reads the manifest, layout, tests, CI and recent git log", () => {
    const text = existing();
    for (const thing of [/manifest|package\.json/i, /folder/i, /tests?/i, /\bCI\b/, /git log/i]) {
      expect(text).toMatch(thing);
    }
  });

  it("marks what it drafts as found or guessed, and asks about the guesses", () => {
    const text = existing();
    expect(text).toContain("*found*");
    expect(text).toContain("*guessed*");
    expect(text).toMatch(/confirm/i);
  });

  it("drafts a current-state spec from the code", () => {
    expect(existing()).toMatch(/current state/i);
    expect(existing()).toContain(".groundwork/SPEC.md");
  });

  it("offers to import existing agent instructions as imported lessons", () => {
    const text = existing();
    expect(text).toMatch(/CLAUDE\.md|AGENTS\.md/);
    expect(text).toContain(".groundwork/LESSONS.md");
    expect(text).toMatch(/imported/);
  });

  it("records the existing stack as accepted decisions without proposing changes", () => {
    const text = existing();
    expect(text).toMatch(/accepted/);
    expect(text).toContain(".groundwork/decisions/");
    expect(section(setup, "Must not")).toMatch(/propose|change the stack/i);
  });

  it("keeps a copy of the AGENTS.md template, so a kept AGENTS.md can be rebuilt", () => {
    const paths = planInit(readCore(fileURLToPath(new URL("../../core/", import.meta.url))), "none").map((f) => f.path);
    expect(paths).toContain(".groundwork/templates/AGENTS.md");
    expect(existing()).toContain(".groundwork/templates/AGENTS.md");
  });
});

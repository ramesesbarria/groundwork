// A short recap when a phase ends, then a nudge to run a retro.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the journal", () => {
  const journal = () => core("templates/JOURNAL.md");
  // The example recap inside the template's comment.
  const example = () => journal().slice(journal().indexOf("## Phase"), journal().indexOf("-->"));

  it("the template has an example recap with the five parts", () => {
    for (const part of ["Shipped", "Try it", "Decisions", "Calls", "Lessons"]) expect(example()).toContain(part);
  });

  it("the example is under about 150 words and links to cards instead of copying them", () => {
    expect(example().split(/\s+/).filter(Boolean).length).toBeLessThan(150);
    expect(example()).toMatch(/\]\(cards\/[\d.]+-[\w-]+\.md\)/);
  });

  it("init installs it as .groundwork/JOURNAL.md", async () => {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-journal-"));
    temps.push(dir);
    await run(["init", "--adapter", "none"], { cwd: dir, ask: async () => "" });
    expect(existsSync(join(dir, ".groundwork/JOURNAL.md"))).toBe(true);
  });
});

describe("closing a phase", () => {
  const approve = () => core("commands/gw-approve.md");

  it("phase approval appends exactly one recap to the journal", () => {
    const phase = approve().slice(approve().indexOf("**Approving a phase"));
    expect(phase).toContain(".groundwork/JOURNAL.md");
    expect(phase).toMatch(/exactly one recap/i);
  });

  it("in per-card mode, approving a phase's last card closes the phase with a recap too", () => {
    expect(section(approve(), "Steps")).toMatch(/last card of its phase[^\n]*recap/i);
  });

  it("gw-approve lists the journal under Writes", () => {
    expect(section(approve(), "Writes")).toContain(".groundwork/JOURNAL.md");
  });
});

describe("/gw after a phase closes", () => {
  it("suggests a retro", () => {
    const rows = section(core("commands/gw.md"), "Steps").split("\n").filter((l) => l.startsWith("| ") && /phase/i.test(l));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatch(/recap/i);
    expect(rows[0]).toContain("gw-retro");
  });
});

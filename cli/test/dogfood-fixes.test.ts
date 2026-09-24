// Card 3.2: fixes for what the dogfood run found (card 3.1, lessons L-003 and L-007 to L-012).
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const root = new URL("../../core/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

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
function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-fixes-"));
  temps.push(dir);
  return dir;
}
const noQuestions = async () => "";

describe("scope check (L-003)", () => {
  it("gw-spec asks for the smallest first version and moves the rest to later phases", () => {
    const steps = section(read("commands/gw-spec.md"), "Steps");
    expect(steps).toMatch(/smallest/i);
    expect(steps).toMatch(/later phase/i);
  });

  it("the planner role keeps the first phase small", () => {
    expect(read("roles/planner.md")).toMatch(/smallest/i);
  });
});

describe("'you decide' (L-011)", () => {
  it("gw-spec uses its suggestions, marks them as defaults, and lists extra choices", () => {
    const steps = section(read("commands/gw-spec.md"), "Steps");
    expect(steps).toMatch(/you decide|your call/i);
    expect(steps).toContain("*(default)*");
    expect(steps).toMatch(/list/i);
  });
});

describe("gw-plan (L-007, L-008)", () => {
  const steps = () => section(read("commands/gw-plan.md"), "Steps");

  it("checks the spec was confirmed", () => {
    expect(steps()).toMatch(/confirmed/i);
  });

  it("updates HANDOFF before stopping to wait for decisions", () => {
    expect(steps()).toMatch(/HANDOFF[^\n]*before[^\n]*(wait|stop)|before[^\n]*(wait|stop)[^\n]*HANDOFF/i);
  });
});

describe("tester (L-009)", () => {
  it("adds manual checks only for criteria that can't be automated", () => {
    const text = read("roles/tester.md");
    expect(text).toMatch(/only for criteria that can't be (tested|automated)/i);
  });
});

describe("AGENTS.md template (L-010)", () => {
  it("states the commit rule for both approval modes", () => {
    const agents = read("templates/AGENTS.md");
    expect(agents).not.toContain("Don't commit until the human approves");
    expect(agents).toContain("`per-card`");
    expect(agents).toContain("`per-phase`");
  });
});

describe("commit-ready install (L-012)", () => {
  it("init writes a .gitattributes that keeps Groundwork's files LF", async () => {
    const dir = tempProject();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: noQuestions });
    const attributes = readFileSync(join(dir, ".gitattributes"), "utf8");
    expect(attributes).toContain(".groundwork/** text eol=lf");
    expect(attributes).toContain("AGENTS.md text eol=lf");
  });

  it("init adds its lines to an existing .gitattributes without asking or removing anything", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, ".gitattributes"), "*.png binary\n");
    const asked: string[] = [];
    await run(["init", "--adapter", "none"], {
      cwd: dir,
      ask: async (q) => {
        asked.push(q);
        return "";
      },
    });
    const attributes = readFileSync(join(dir, ".gitattributes"), "utf8");
    expect(attributes.startsWith("*.png binary\n")).toBe(true);
    expect(attributes).toContain(".groundwork/** text eol=lf");
    expect(asked).toEqual([]);
  });

  it("running init again doesn't duplicate the .gitattributes lines", async () => {
    const dir = tempProject();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
    await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
    const attributes = readFileSync(join(dir, ".gitattributes"), "utf8");
    expect(attributes.split(".groundwork/** text eol=lf").length).toBe(2);
  });

  it("gw-setup ends by suggesting a commit", () => {
    expect(section(read("commands/gw-setup.md"), "Steps")).toMatch(/commit/i);
  });
});

// /gw is the one command to remember. It replaces gw-resume.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { NEXT_STEPS } from "../src/init.js";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(repo, path), "utf8");
const gw = () => read("core/commands/gw.md");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

// Rows of the routing table in gw.md: [state, action].
const routes = () =>
  section(gw(), "Steps")
    .split("\n")
    .filter((line) => line.startsWith("| ") && !/^\|\s*-/.test(line) && !/^\| State \|/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

const STATES: [string, RegExp][] = [
  ["nothing set up", /\.groundwork\/|placeholders/i],
  ["no spec", /no spec|spec is still/i],
  ["spec not confirmed", /not confirmed/i],
  ["no cards", /no cards/i],
  ["a card in progress", /`testing`, `implementing` or `review`/],
  ["awaiting approval", /`awaiting-approval`/],
  ["otherwise", /^otherwise/i],
];

describe("/gw", () => {
  it("exists and is listed as a command", () => {
    expect(existsSync(join(repo, "core/commands/gw.md"))).toBe(true);
  });

  it.each(STATES)("maps '%s' to exactly one row with one action", (_, pattern) => {
    const rows = routes().filter(([state]) => pattern.test(state));
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).not.toBe("");
  });

  it("sends each state to the right place", () => {
    const action = (pattern: RegExp) => routes().find(([state]) => pattern.test(state))?.[1] ?? "";
    expect(action(/placeholders/)).toContain("gw-setup");
    expect(action(/no spec|spec is still/i)).toContain("gw-spec");
    expect(action(/no cards/i)).toContain("gw-plan");
    expect(action(/`awaiting-approval`/)).toMatch(/summary/i);
    expect(action(/`awaiting-approval`/)).toMatch(/don't run either/i);
    expect(action(/^otherwise/i)).toContain("gw-next");
  });

  it("says where things stand in plain words before acting", () => {
    expect(section(gw(), "Steps")).toMatch(/plain/i);
  });

  it("never approves or rejects itself", () => {
    expect(section(gw(), "Must not")).toMatch(/gw-approve/);
  });
});

describe("gw-resume is gone", () => {
  it("has no command file", () => {
    expect(existsSync(join(repo, "core/commands/gw-resume.md"))).toBe(false);
  });

  it("no file refers to it, apart from upgrade, which removes it from older projects", () => {
    const allowed = [":!cli/test/gw-entry.test.ts", ":!cli/src/upgrade.ts", ":!cli/test/upgrade.test.ts"];
    const args = ["grep", "--untracked", "-l", "gw-resume", "--", ".", ...allowed];
    let hits = "";
    try {
      hits = execFileSync("git", args, { cwd: repo, encoding: "utf8" });
    } catch (error) {
      if ((error as { status?: number }).status !== 1) throw error; // 1 means no matches
    }
    expect(hits).toBe("");
  });
});

describe("pointing newcomers to /gw", () => {
  it("init's closing message says to type /gw", () => {
    expect(NEXT_STEPS["claude-code"]).toMatch(/type \/gw\b/);
    expect(NEXT_STEPS.opencode).toMatch(/type \/gw\b/);
    expect(NEXT_STEPS.none).toContain(".groundwork/commands/gw.md");
  });

  it("the README points newcomers to /gw and the command reference", () => {
    const readme = read("README.md");
    expect(readme).toMatch(/type `\/gw`/);
    expect(readme).toContain("/reference/agent-commands");
  });

  it("a fresh install tells you to type /gw", async () => {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-gw-"));
    try {
      const { output } = await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: async () => "" });
      expect(output).toMatch(/type \/gw\b/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { planInit } from "../src/init.js";
import { readCore } from "../src/core.js";

const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));
const core = readCore(coreDir);

const temps: string[] = [];
function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-init-"));
  temps.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Answers questions in order; records what was asked.
function answers(...replies: string[]) {
  const asked: string[] = [];
  return {
    asked,
    ask: async (question: string) => {
      asked.push(question);
      return replies.shift() ?? "";
    },
  };
}

const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

describe("planInit", () => {
  it("maps core files to their places in a project", () => {
    const paths = planInit(core, "none").map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        ".groundwork/SPEC.md",
        ".groundwork/HANDOFF.md",
        ".groundwork/LESSONS.md",
        ".groundwork/config.json",
        ".groundwork/config.schema.json",
        ".groundwork/workflow.md",
        ".groundwork/templates/card.md",
        ".groundwork/templates/decision.md",
        ".groundwork/roles/reviewer.md",
        ".groundwork/commands/gw-next.md",
        ".groundwork/cards/.gitkeep",
        ".groundwork/decisions/.gitkeep",
        ".groundwork/evidence/.gitkeep",
      ]),
    );
    expect(paths.some((p) => p.startsWith(".claude/") || p === "CLAUDE.md")).toBe(false);
  });

  it("adds the Claude Code files when that adapter is chosen", () => {
    const paths = planInit(core, "claude-code").map((f) => f.path);
    expect(paths).toContain("CLAUDE.md");
    expect(paths).toContain(".claude/skills/gw-next/SKILL.md");
    expect(paths).toContain(".claude/agents/gw-reviewer.md");
  });
});

describe("groundwork init", () => {
  it("installs into an empty project, asking which adapter", async () => {
    const dir = tempProject();
    const io = answers("1");
    const { code } = await run(["init"], { cwd: dir, ask: io.ask });

    expect(code).toBe(0);
    expect(io.asked[0]).toMatch(/Claude Code/);
    expect(read(dir, ".groundwork/workflow.md")).toBe(core["workflow.md"]);
    expect(read(dir, "AGENTS.md")).toBe(core["templates/AGENTS.md"]);
    expect(existsSync(join(dir, ".claude/skills/gw-setup/SKILL.md"))).toBe(true);
    expect(read(dir, "CLAUDE.md")).toContain("@AGENTS.md");
  });

  it("installs no adapter files with --adapter none", async () => {
    const dir = tempProject();
    const { code } = await run(["init", "--adapter", "none"], { cwd: dir, ask: answers().ask });
    expect(code).toBe(0);
    expect(existsSync(join(dir, ".claude"))).toBe(false);
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(dir, ".groundwork/roles/tester.md"))).toBe(true);
  });

  it("rejects an unknown adapter", async () => {
    const { code, output } = await run(["init", "--adapter", "vim"], { cwd: tempProject(), ask: answers().ask });
    expect(code).toBe(1);
    expect(output).toContain("vim");
  });

  it("asks before overwriting an existing file, and keeps it when told no", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "CLAUDE.md"), "my own rules\n");
    const io = answers("n");
    const { code, output } = await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: io.ask });

    expect(code).toBe(0);
    expect(io.asked.some((q) => q.includes("CLAUDE.md"))).toBe(true);
    expect(read(dir, "CLAUDE.md")).toBe("my own rules\n");
    expect(output).toMatch(/skip.*CLAUDE\.md/i);
    expect(output).toContain("@AGENTS.md"); // tells the user how to connect it by hand
  });

  it("overwrites an existing file when told yes", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "AGENTS.md"), "old\n");
    await run(["init", "--adapter", "none"], { cwd: dir, ask: answers("y").ask });
    expect(read(dir, "AGENTS.md")).toBe(core["templates/AGENTS.md"]);
  });

  it("doesn't ask about files that are already identical", async () => {
    const dir = tempProject();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: answers().ask });
    const io = answers();
    const { code, output } = await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: io.ask });
    expect(code).toBe(0);
    expect(io.asked).toEqual([]);
    expect(output).toMatch(/already up to date/i);
  });

  it("--dry-run lists what it would write and writes nothing", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "AGENTS.md"), "old\n");
    const io = answers();
    const { code, output } = await run(["init", "--dry-run", "--adapter", "claude-code"], { cwd: dir, ask: io.ask });

    expect(code).toBe(0);
    expect(io.asked).toEqual([]);
    expect(readdirSync(dir)).toEqual(["AGENTS.md"]);
    expect(read(dir, "AGENTS.md")).toBe("old\n");
    expect(output).toContain(".groundwork/workflow.md");
    expect(output).toMatch(/AGENTS\.md.*(exists|ask)/i);
  });

  it("tells the user what to do next", async () => {
    const { output } = await run(["init", "--adapter", "claude-code"], { cwd: tempProject(), ask: answers().ask });
    expect(output).toContain("/gw-setup");
  });

  it("works from the built CLI, finding the core files on its own", () => {
    const dir = tempProject();
    mkdirSync(join(dir, "sub"));
    const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
    const output = execFileSync(process.execPath, [bin, "init", "--dry-run", "--adapter", "none"], {
      cwd: join(dir, "sub"),
      encoding: "utf8",
    });
    expect(output).toContain(".groundwork/workflow.md");
  });
});

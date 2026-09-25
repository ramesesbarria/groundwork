// Init never overwrites a project's CLAUDE.md or AGENTS.md; it adds Groundwork's pointer lines.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { readCore } from "../src/core.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const AGENTS_POINTER = "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md.";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-keep-"));
  temps.push(dir);
  return dir;
}
function recorder() {
  const asked: string[] = [];
  return { asked, ask: async (q: string) => (asked.push(q), "y") }; // would say yes to any overwrite
}
const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

const THEIR_CLAUDE = "# Our rules\n- Use pnpm, never npm\n- British spelling in the UI\n";
const THEIR_AGENTS = "# Agents\nRun the linter before every commit.\n";

describe("existing instruction files", () => {
  it("keeps every line of an existing CLAUDE.md and AGENTS.md, plus the pointer lines", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "CLAUDE.md"), THEIR_CLAUDE);
    writeFileSync(join(dir, "AGENTS.md"), THEIR_AGENTS);
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: recorder().ask });

    const claude = read(dir, "CLAUDE.md");
    const agents = read(dir, "AGENTS.md");
    expect(claude.startsWith(THEIR_CLAUDE)).toBe(true);
    expect(claude).toContain("@AGENTS.md");
    expect(agents.startsWith(THEIR_AGENTS)).toBe(true);
    expect(agents).toContain(AGENTS_POINTER);
  });

  it("never asks to overwrite them, even when the answer would be yes", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "CLAUDE.md"), THEIR_CLAUDE);
    writeFileSync(join(dir, "AGENTS.md"), THEIR_AGENTS);
    const io = recorder();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: io.ask });
    expect(io.asked.filter((q) => /CLAUDE\.md|AGENTS\.md/.test(q))).toEqual([]);
  });

  it("adds the pointer only once when init runs again", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "AGENTS.md"), THEIR_AGENTS);
    await run(["init", "--adapter", "none"], { cwd: dir, ask: recorder().ask });
    await run(["init", "--adapter", "none"], { cwd: dir, ask: recorder().ask });
    expect(read(dir, "AGENTS.md").split(AGENTS_POINTER).length - 1).toBe(1);
  });

  it("a fresh folder still gets the full templates", async () => {
    const dir = tempProject();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: recorder().ask });
    expect(read(dir, "AGENTS.md")).toBe(core["templates/AGENTS.md"]);
    expect(read(dir, "CLAUDE.md")).toMatch(/^@AGENTS\.md\n\n## Claude Code/);
  });

  it("adding an adapter later keeps an existing CLAUDE.md too", async () => {
    const dir = tempProject();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: recorder().ask });
    writeFileSync(join(dir, "CLAUDE.md"), THEIR_CLAUDE);
    const io = recorder();
    await run(["adapter", "add", "claude-code"], { cwd: dir, ask: io.ask });
    expect(read(dir, "CLAUDE.md").startsWith(THEIR_CLAUDE)).toBe(true);
    expect(read(dir, "CLAUDE.md")).toContain("@AGENTS.md");
    expect(io.asked.filter((q) => q.includes("CLAUDE.md"))).toEqual([]);
  });

  it("doctor's CLAUDE.md check passes after init on an existing CLAUDE.md", async () => {
    const dir = tempProject();
    writeFileSync(join(dir, "CLAUDE.md"), THEIR_CLAUDE);
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: recorder().ask });
    const { output } = await run(["doctor"], { cwd: dir, ask: recorder().ask });
    expect(output).not.toMatch(/CLAUDE\.md doesn't load AGENTS\.md/);
  });
});

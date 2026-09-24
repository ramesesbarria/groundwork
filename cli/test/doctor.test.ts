// Card 5.1: `groundwork doctor` (SPEC §10).
import { afterEach, describe, expect, it } from "vitest";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-doctor-"));
  temps.push(dir);
  return dir;
}
const noQuestions = async () => "";

async function installed(adapter = "claude-code"): Promise<string> {
  const dir = tempDir();
  await run(["init", "--adapter", adapter], { cwd: dir, ask: noQuestions });
  return dir;
}

const doctor = (dir: string) => run(["doctor"], { cwd: dir, ask: noQuestions });

function setConfig(dir: string, change: (c: Record<string, unknown>) => void) {
  const path = join(dir, ".groundwork/config.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  change(config);
  writeFileSync(path, JSON.stringify(config, null, 2));
}

describe("groundwork doctor", () => {
  it("says to run init when Groundwork isn't installed", async () => {
    const { code, output } = await doctor(tempDir());
    expect(code).toBe(1);
    expect(output).toMatch(/groundwork init/);
  });

  it("passes on a fresh install and reports the always-loaded token estimate", async () => {
    const { code, output } = await doctor(await installed());
    expect(code).toBe(0);
    expect(output).toMatch(/Always loaded: ≈\d+ tokens \(budget 2000\)/);
    expect(output).toMatch(/no problems/i);
  });

  it("fails when the always-loaded files are over the token budget, and says what to do", async () => {
    const dir = await installed();
    appendFileSync(join(dir, "AGENTS.md"), "\n" + "- An extra rule that keeps going and going.\n".repeat(250));
    const { code, output } = await doctor(dir);
    expect(code).toBe(1);
    expect(output).toMatch(/over the \d+-token budget/i);
    expect(output).toMatch(/LESSONS/);
  });

  it("flags a guard listed in config that doesn't exist", async () => {
    const dir = await installed();
    setConfig(dir, (c) => (c.guards = ["no-ai-trailers", "no-secrets"]));
    const { code, output } = await doctor(dir);
    expect(code).toBe(1);
    expect(output).toContain("no-secrets");
    expect(output).not.toMatch(/no-ai-trailers[^\n]*doesn't exist/);
  });

  it("flags adapter files that differ from what the core would generate", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".claude/skills/gw-next/SKILL.md"), "stale\n");
    const { code, output } = await doctor(dir);
    expect(code).toBe(1);
    expect(output).toContain(".claude/skills/gw-next/SKILL.md");
    expect(output).toMatch(/groundwork adapter add claude-code/);
  });

  it("flags a Claude Code settings file that lost the guard hook", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".claude/settings.json"), "{}\n");
    const { code, output } = await doctor(dir);
    expect(code).toBe(1);
    expect(output).toContain(".claude/settings.json");
  });

  it("flags a card whose History says approved but whose status isn't done", async () => {
    const dir = await installed();
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-thing.md"),
      "---\nid: 1.1\ntitle: Thing\nphase: 1\nstatus: testing\ndepends_on: []\n---\n## History\n- 2026-09-24 approved by human\n",
    );
    const { code, output } = await doctor(dir);
    expect(code).toBe(1);
    expect(output).toMatch(/1\.1[^\n]*approved[^\n]*testing|1\.1[^\n]*testing[^\n]*approved/i);
  });

  it("flags rules in AGENTS.md without a lesson ID", async () => {
    const dir = await installed();
    appendFileSync(join(dir, "AGENTS.md"), "- Always use tabs.\n- L-002: Pull before analyzing.\n");
    const { output } = await doctor(dir);
    expect(output).toContain("Always use tabs.");
    expect(output).not.toMatch(/Pull before analyzing[^\n]*lesson ID/);
  });

  it("suggests archiving lessons no card has cited, without failing", async () => {
    const dir = await installed();
    appendFileSync(
      join(dir, ".groundwork/LESSONS.md"),
      "\n### L-001 · Cited lesson\n- Level: NOTE\n\n### L-002 · Never cited\n- Level: NOTE\n",
    );
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-thing.md"),
      "---\nid: 1.1\ntitle: Thing\nphase: 1\nstatus: done\ndepends_on: []\n---\n## Evidence\n- Checked against L-001\n",
    );
    const { code, output } = await doctor(dir);
    expect(code).toBe(0);
    expect(output).toMatch(/L-002[^\n]*never cited/i);
    expect(output).not.toMatch(/L-001[^\n]*never cited/i);
  });
});

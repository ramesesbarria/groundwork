// Every new session, /clear or compaction starts with a few lines from HANDOFF.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { estimateTokens } from "../src/tokens.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { orientation } from "../../core/hooks/session-start.mjs";

const hookScript = fileURLToPath(new URL("../../core/hooks/session-start.mjs", import.meta.url));
const claudeDocs = readFileSync(new URL("../../docs/content/docs/adapters/claude-code.mdx", import.meta.url), "utf8");
const opencodeDocs = readFileSync(new URL("../../docs/content/docs/adapters/opencode.mdx", import.meta.url), "utf8");
const agentsTemplate = readFileSync(new URL("../../core/templates/AGENTS.md", import.meta.url), "utf8");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-session-"));
  temps.push(dir);
  return dir;
}
function projectWith(handoff?: string): string {
  const dir = tempDir();
  mkdirSync(join(dir, ".groundwork"));
  if (handoff !== undefined) writeFileSync(join(dir, ".groundwork/HANDOFF.md"), handoff);
  return dir;
}
const handoff = (fields: Record<string, string>) =>
  ["# Handoff", "", ...Object.entries(fields).map(([k, v]) => `- **${k}:** ${v}`), ""].join("\n");

const SAMPLE = handoff({
  Phase: "1",
  "Current card": "1.3 Login flow",
  Status: "implementing",
  "Last step": "tester wrote 4 failing tests",
  "Next step": "make the session test pass",
  "Failing checks": "4 new tests",
});

describe("orientation text", () => {
  it("gives the card, its state in plain words, the next step and /gw", () => {
    const text: string = orientation(projectWith(SAMPLE));
    expect(text).toContain("1.3 Login flow");
    expect(text).toMatch(/being built/);
    expect(text).toContain("make the session test pass");
    expect(text).toMatch(/type \/gw/i);
    expect(text.split("\n").length).toBeLessThanOrEqual(3);
  });

  it("says so when no card is in progress", () => {
    const text: string = orientation(projectWith(handoff({ "Current card": "none", Status: "—", "Next step": "`gw-next` for card 2.1" })));
    expect(text).toMatch(/no card in progress/i);
    expect(text).toContain("`gw-next` for card 2.1");
  });

  it("falls back to one line when HANDOFF is missing", () => {
    const text: string = orientation(projectWith());
    expect(text.split("\n")).toHaveLength(1);
    expect(text).toMatch(/HANDOFF/);
    expect(text).toMatch(/\/gw/);
  });

  it("says nothing when the folder doesn't use Groundwork", () => {
    expect(orientation(tempDir())).toBe("");
  });

  it("stays under about 80 tokens, even with long fields", () => {
    const long = "x".repeat(2000);
    expect(estimateTokens(orientation(projectWith(SAMPLE)))).toBeLessThan(80);
    expect(estimateTokens(orientation(projectWith(handoff({ "Current card": long, Status: long, "Next step": long }))))).toBeLessThan(80);
  });
});

describe("the hook script", () => {
  // The hook is tool-neutral. The adapter passes the project folder, and the output is plain
  // text, which Claude Code adds as context for a SessionStart hook.
  const runHook = (projectDir: string) => spawnSync(process.execPath, [hookScript, projectDir], { encoding: "utf8" });

  it("prints the orientation as plain text for the folder it's given", () => {
    const dir = projectWith(SAMPLE);
    const result = runHook(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${orientation(dir)}\n`);
  });

  it("uses the current folder when none is given", () => {
    const dir = projectWith(SAMPLE);
    const result = spawnSync(process.execPath, [hookScript], { encoding: "utf8", cwd: dir });
    expect(result.stdout).toBe(`${orientation(dir)}\n`);
  });

  it("prints nothing outside a Groundwork project", () => {
    const result = runHook(tempDir());
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});

describe("wiring", () => {
  async function installed(adapter: string): Promise<string> {
    const dir = tempDir();
    await run(["init", "--adapter", adapter], { cwd: dir, ask: async () => "" });
    return dir;
  }

  it("init installs the hook script into .groundwork/hooks/", async () => {
    expect(existsSync(join(await installed("none"), ".groundwork/hooks/session-start.mjs"))).toBe(true);
  });

  it("the Claude Code adapter runs it on startup, clear and compact", async () => {
    const settings = JSON.parse(readFileSync(join(await installed("claude-code"), ".claude/settings.json"), "utf8"));
    const entries = settings.hooks.SessionStart;
    expect(entries).toHaveLength(1);
    expect(entries[0].matcher).toBe("startup|clear|compact");
    expect(entries[0].hooks[0].command).toContain(".groundwork/hooks/session-start.mjs");
  });

  it("doctor warns when the hook is missing", async () => {
    const dir = await installed("claude-code");
    const path = join(dir, ".claude/settings.json");
    const settings = JSON.parse(readFileSync(path, "utf8"));
    delete settings.hooks.SessionStart;
    writeFileSync(path, JSON.stringify(settings, null, 2));
    const { output } = await run(["doctor"], { cwd: dir, ask: async () => "" });
    expect(output).toMatch(/session-start/i);
  });

  it("without an adapter, AGENTS.md still says to read HANDOFF first", () => {
    expect(agentsTemplate).toMatch(/Start by reading `\.groundwork\/HANDOFF\.md`/);
  });

  it("both adapters' docs describe how a session is told where things stand", () => {
    expect(claudeDocs).toMatch(/session-start/i);
    expect(claudeDocs).toMatch(/startup\|clear\|compact/);
    expect(opencodeDocs).toMatch(/## Session start[\s\S]*session-start\.mjs/);
  });
});

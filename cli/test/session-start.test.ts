// Every new or resumed session, /clear or compaction starts with the project brief.
import { afterEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { estimateTokens } from "../src/tokens.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { orientation } from "../../core/hooks/session-start.mjs";

const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));
const hookScript = join(coreDir, "hooks/session-start.mjs");
const claudeDocs = readFileSync(new URL("../../docs/content/docs/adapters/claude-code.mdx", import.meta.url), "utf8");
const opencodeDocs = readFileSync(new URL("../../docs/content/docs/adapters/opencode.mdx", import.meta.url), "utf8");
const agentsTemplate = readFileSync(new URL("../../core/templates/AGENTS.md", import.meta.url), "utf8");
const contextAgents = readFileSync(new URL("../../core/context/templates/AGENTS.md", import.meta.url), "utf8");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-session-"));
  temps.push(dir);
  return dir;
}
// A project with the flow: its guards folder is what switches the flow's lines on.
function projectWith(handoff?: string, { flow = true } = {}): string {
  const dir = tempDir();
  mkdirSync(join(dir, ".groundwork"));
  if (flow) cpSync(join(coreDir, "guards"), join(dir, ".groundwork/guards"), { recursive: true });
  if (handoff !== undefined) writeFileSync(join(dir, ".groundwork/HANDOFF.md"), handoff);
  return dir;
}
const handoff = (fields: Record<string, string>) =>
  ["# Handoff", "", ...Object.entries(fields).map(([k, v]) => `- **${k}:** ${v}`), ""].join("\n");

// A handoff as 1.x wrote it: bullets, no stamp.
const SAMPLE = handoff({
  Phase: "1",
  "Current card": "1.3 Login flow",
  Status: "implementing",
  "Last step": "tester wrote 4 failing tests",
  "Next step": "make the session test pass",
  "Failing checks": "4 new tests",
});

describe("the brief at session start, with the flow", () => {
  it("gives the card, its state in plain words, the next step and /gw", async () => {
    const text: string = await orientation(projectWith(SAMPLE));
    expect(text).toContain("Groundwork: card 1.3 Login flow is being built.");
    expect(text).toContain("make the session test pass");
    expect(text).toMatch(/type \/gw/i);
    // Agents told people to type helpers such as /gw-next or /gw-plan; every session hears the real list.
    expect(text).toContain("the only other commands: /gw-approve, /gw-reject");
  });

  it("says so when no card is in progress", async () => {
    const text: string = await orientation(projectWith(handoff({ "Current card": "none", Status: "—", "Next step": "`gw-next` for card 2.1" })));
    expect(text).toMatch(/no card in progress/i);
    expect(text).toContain("`gw-next` for card 2.1");
  });

  it("says a handoff from before 2.0 has no stamp to check it against", async () => {
    expect(await orientation(projectWith(SAMPLE))).toMatch(/Handoff: UNSTAMPED/);
  });

  it("says the handoff is missing, and how to write it", async () => {
    const text: string = await orientation(projectWith());
    expect(text).toMatch(/Handoff: MISSING/);
    expect(text).toContain("npx groundwork-ai checkpoint");
  });

  it("says nothing when the folder doesn't use Groundwork", async () => {
    expect(await orientation(tempDir())).toBe("");
  });

  it("reads the per-task handoff on branch gw/<id>", async () => {
    const dir = projectWith(SAMPLE);
    mkdirSync(join(dir, ".groundwork/work/1.4"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/work/1.4/HANDOFF.md"),
      handoff({ Phase: "1", "Current card": "1.4 Profile", Status: "review", "Next step": "approve profile" }),
    );
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["switch", "-q", "-c", "gw/1.4"], { cwd: dir });
    const text: string = await orientation(dir);
    expect(text).toContain("1.4 Profile");
    expect(text).toContain("approve profile");
    expect(text).not.toContain("make the session test pass");
    expect(text).toContain("(worker 1.4)");
  });

  it("stays inside the brief's token budget, even with long fields", async () => {
    const long = "word ".repeat(4000);
    const dir = projectWith(handoff({ "Current card": long, Status: long, "Next step": long }));
    writeFileSync(join(dir, ".groundwork/MAP.md"), `# Map\n\n## Layout\n${long}\n`);
    expect(estimateTokens(await orientation(dir))).toBeLessThan(1500 * 1.1);
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ budgets: { brief: 400 } }));
    expect(estimateTokens(await orientation(dir))).toBeLessThan(400 * 1.1);
  });
});

describe("the brief at session start, without the flow", () => {
  it("says nothing about cards or the flow's commands", async () => {
    const text: string = await orientation(projectWith(SAMPLE, { flow: false }));
    expect(text).toContain("make the session test pass");
    expect(text).not.toMatch(/Groundwork: (no )?card/);
    expect(text).not.toMatch(/gw-approve/);
  });

  it("tells a compacted session to trust memory over what it recalls", async () => {
    const text: string = await orientation(projectWith(SAMPLE, { flow: false }), { source: "compact" });
    expect(text).toMatch(/just compacted/);
  });
});

describe("the hook script", () => {
  // The hook is tool-neutral. The adapter passes the project folder, and the output is plain
  // text, which Claude Code adds as context for a SessionStart hook. It imports ../lib/, as installed.
  function installedHook(dir: string): string {
    cpSync(join(coreDir, "hooks"), join(dir, ".groundwork/hooks"), { recursive: true });
    cpSync(join(coreDir, "lib"), join(dir, ".groundwork/lib"), { recursive: true });
    return join(dir, ".groundwork/hooks/session-start.mjs");
  }
  const runHook = (script: string, args: string[], options: { cwd?: string; input?: string } = {}) =>
    spawnSync(process.execPath, [script, ...args], { encoding: "utf8", input: "", ...options });

  it("prints the brief as plain text for the folder it's given", async () => {
    const dir = projectWith(SAMPLE);
    const result = runHook(installedHook(dir), [dir]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`${await orientation(dir)}\n`);
  });

  it("uses the current folder when none is given", async () => {
    const dir = projectWith(SAMPLE);
    const result = runHook(installedHook(dir), [], { cwd: dir });
    expect(result.stdout).toBe(`${await orientation(dir)}\n`);
  });

  it("prints nothing outside a Groundwork project", () => {
    const result = runHook(hookScript, [tempDir()]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("remembers the session and model a tool passes on stdin, for later checkpoints", () => {
    const dir = projectWith(SAMPLE);
    const result = runHook(installedHook(dir), [dir], { input: JSON.stringify({ session_id: "ses_1", model: "model-x", source: "startup" }) });
    expect(result.status).toBe(0);
    const state = JSON.parse(readFileSync(join(dir, ".groundwork/.state.json"), "utf8"));
    expect(state).toMatchObject({ session: "ses_1", model: "model-x" });
  });

  it("exits 0 and still prints something when the handoff can't be read as text", () => {
    const dir = projectWith();
    mkdirSync(join(dir, ".groundwork/HANDOFF.md")); // a folder where the file should be
    const result = runHook(installedHook(dir), [dir]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Groundwork/);
  });
});

describe("wiring", () => {
  async function installed(adapter: string, flow = true): Promise<string> {
    const dir = tempDir();
    await run(["init", ...(flow ? ["--flow"] : []), "--adapter", adapter], { cwd: dir, ask: async () => "" });
    return dir;
  }

  it.each([true, false])("init installs the hook script and its library (flow: %s)", async (flow) => {
    const dir = await installed("none", flow);
    expect(existsSync(join(dir, ".groundwork/hooks/session-start.mjs"))).toBe(true);
    expect(existsSync(join(dir, ".groundwork/lib/brief.mjs"))).toBe(true);
  });

  it.each([true, false])("the Claude Code adapter runs it on startup, resume, clear and compact (flow: %s)", async (flow) => {
    const settings = JSON.parse(readFileSync(join(await installed("claude-code", flow), ".claude/settings.json"), "utf8"));
    const entries = settings.hooks.SessionStart;
    expect(entries).toHaveLength(1);
    expect(entries[0].matcher).toBe("startup|resume|clear|compact");
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

  it("without an adapter, AGENTS.md says to run the brief first", () => {
    expect(agentsTemplate).toMatch(/Start with `npx groundwork-ai brief`/);
    expect(contextAgents).toMatch(/Start every session with `npx groundwork-ai brief`/);
  });

  it("both adapters' docs describe how a session is told where things stand", () => {
    expect(claudeDocs).toMatch(/session-start/i);
    expect(claudeDocs).toMatch(/startup\|resume\|clear\|compact/);
    expect(opencodeDocs).toMatch(/## Session start[\s\S]*session-start\.mjs/);
  });
});

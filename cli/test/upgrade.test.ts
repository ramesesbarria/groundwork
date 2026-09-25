// `groundwork upgrade` and a version stamp.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { readCore } from "../src/core.js";
import { VERSION } from "../src/version.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-upgrade-"));
  temps.push(dir);
  return dir;
}
function answers(...replies: string[]) {
  const asked: string[] = [];
  return { asked, ask: async (q: string) => (asked.push(q), replies.shift() ?? "") };
}
const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");
const write = (dir: string, path: string, text: string) => {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), text);
};
const config = (dir: string) => JSON.parse(read(dir, ".groundwork/config.json"));

// The user's own state. None of it may change during an upgrade.
const STATE: Record<string, string> = {
  "AGENTS.md": "# My project\nRead .groundwork/HANDOFF.md first.\n## Rules\n- RULE L-001: no trailers\n",
  ".groundwork/SPEC.md": "# Spec\nA book club voting page.\n",
  ".groundwork/HANDOFF.md": "# Handoff\n- **Current card:** 1.2 Voting\n",
  ".groundwork/LESSONS.md": "# Lessons\n### L-001 · No trailers\n",
  ".groundwork/cards/1.1-list.md": "---\nid: 1.1\ntitle: List\nphase: 1\nstatus: done\ndepends_on: []\n---\n",
  ".groundwork/decisions/0001-db.md": "---\nid: 0001\ntitle: SQLite\nstatus: accepted\n---\n",
  ".groundwork/evidence/1.1/test-output.txt": "12 passed\n",
};

// A project as Groundwork 0.3 left it: no version stamp, an older role, gw-resume, no hooks.
async function v03Project(): Promise<string> {
  const dir = tempDir();
  await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: answers().ask });
  const cfg = config(dir);
  delete cfg.version;
  cfg.approvalMode = "per-phase";
  cfg.commands.test = "npm test";
  write(dir, ".groundwork/config.json", JSON.stringify(cfg, null, 2) + "\n");
  write(dir, ".groundwork/roles/tester.md", "# Role: Tester\nOld text.\n");
  write(dir, ".groundwork/commands/gw-resume.md", "---\nname: gw-resume\ndescription: Continue unfinished work.\n---\n");
  write(dir, ".claude/skills/gw-resume/SKILL.md", "---\nname: gw-resume\n---\nRead `.groundwork/commands/gw-resume.md`.\n");
  rmSync(join(dir, ".groundwork/hooks"), { recursive: true });
  rmSync(join(dir, ".claude/skills/gw"), { recursive: true });
  write(dir, "CLAUDE.md", "@AGENTS.md\n\n## Claude Code\nGroundwork commands are skills: /gw-next, /gw-resume.\nWhen a command says to run a role, use its subagent: gw-tester.\n");
  const settings = JSON.parse(read(dir, ".claude/settings.json"));
  delete settings.hooks.SessionStart;
  write(dir, ".claude/settings.json", JSON.stringify(settings, null, 2));
  for (const [path, text] of Object.entries(STATE)) write(dir, path, text);
  return dir;
}

describe("version stamp", () => {
  it("init writes the CLI version into config.json", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: answers().ask });
    expect(config(dir).version).toBe(VERSION);
  });

  it("the config schema allows it", () => {
    expect(JSON.parse(core["templates/config.schema.json"]).properties.version.type).toBe("string");
  });
});

describe("groundwork upgrade", () => {
  it("brings a 0.3 project up to date and leaves its state byte-identical", async () => {
    const dir = await v03Project();
    const { code, output } = await run(["upgrade"], { cwd: dir, ask: answers("y").ask });
    expect(code).toBe(0);

    expect(read(dir, ".groundwork/roles/tester.md")).toBe(core["roles/tester.md"]);
    expect(read(dir, ".groundwork/commands/gw.md")).toBe(core["commands/gw.md"]);
    expect(existsSync(join(dir, ".groundwork/commands/gw-resume.md"))).toBe(false);
    expect(read(dir, ".groundwork/hooks/session-start.mjs")).toBe(core["hooks/session-start.mjs"]);
    for (const [path, text] of Object.entries(STATE)) expect(read(dir, path), path).toBe(text);
    expect(output).toMatch(/0\.3|older/);
  });

  it("stamps the new version and keeps every other config value", async () => {
    const dir = await v03Project();
    await run(["upgrade"], { cwd: dir, ask: answers("y").ask });
    const cfg = config(dir);
    expect(cfg.version).toBe(VERSION);
    expect(cfg.approvalMode).toBe("per-phase");
    expect(cfg.commands.test).toBe("npm test");
  });

  it("adds command keys a newer version introduced, empty, and says so", async () => {
    const dir = await v03Project();
    const cfg = config(dir);
    delete cfg.commands.run;
    write(dir, ".groundwork/config.json", JSON.stringify(cfg, null, 2) + "\n");

    const dry = await run(["upgrade", "--dry-run"], { cwd: dir, ask: answers().ask });
    expect(dry.output).toMatch(/add\s+commands\.run \(empty\)/);
    expect(config(dir).commands).not.toHaveProperty("run");

    const { output } = await run(["upgrade"], { cwd: dir, ask: answers("y").ask });
    expect(config(dir).commands).toEqual({ install: "", test: "npm test", lint: "", build: "", run: "" });
    expect(output).toMatch(/New command to fill in: run/);
  });

  it("leaves a command the project already set alone", async () => {
    const dir = await v03Project();
    const cfg = config(dir);
    cfg.commands.run = "npm run dev";
    write(dir, ".groundwork/config.json", JSON.stringify(cfg, null, 2) + "\n");
    const { output } = await run(["upgrade"], { cwd: dir, ask: answers("y").ask });
    expect(config(dir).commands.run).toBe("npm run dev");
    expect(output).not.toMatch(/commands\.run/);
  });

  it("refreshes the installed adapter: new skills, retired skills removed, new hooks merged", async () => {
    const dir = await v03Project();
    await run(["upgrade"], { cwd: dir, ask: answers("y").ask });
    expect(existsSync(join(dir, ".claude/skills/gw/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/skills/gw-resume"))).toBe(false);
    expect(JSON.parse(read(dir, ".claude/settings.json")).hooks.SessionStart).toHaveLength(1);
  });

  it("replaces a CLAUDE.md that Groundwork generated, but never one the user wrote", async () => {
    const generated = await v03Project();
    await run(["upgrade"], { cwd: generated, ask: answers("y").ask });
    expect(read(generated, "CLAUDE.md")).not.toContain("/gw-resume");
    expect(read(generated, "CLAUDE.md")).toContain("Start with /gw");

    const theirs = await v03Project();
    write(theirs, "CLAUDE.md", "# Our rules\n- pnpm only\n@AGENTS.md\n");
    await run(["upgrade"], { cwd: theirs, ask: answers("y").ask });
    expect(read(theirs, "CLAUDE.md")).toBe("# Our rules\n- pnpm only\n@AGENTS.md\n");
  });

  it("asks once first, and changes nothing when told no", async () => {
    const dir = await v03Project();
    const io = answers("n");
    const { output } = await run(["upgrade"], { cwd: dir, ask: io.ask });
    expect(io.asked).toHaveLength(1);
    expect(io.asked[0]).toMatch(/spec|cards/i);
    expect(read(dir, ".groundwork/roles/tester.md")).toBe("# Role: Tester\nOld text.\n");
    expect(output).toMatch(/nothing (was )?changed/i);
  });

  it("--dry-run lists the changes and writes nothing", async () => {
    const dir = await v03Project();
    const io = answers();
    const { output } = await run(["upgrade", "--dry-run"], { cwd: dir, ask: io.ask });
    expect(io.asked).toEqual([]);
    expect(output).toContain(".groundwork/roles/tester.md");
    expect(output).toMatch(/remove[^\n]*gw-resume/);
    expect(read(dir, ".groundwork/roles/tester.md")).toBe("# Role: Tester\nOld text.\n");
  });

  it("says so when the project is already up to date", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: answers().ask });
    const io = answers();
    const { output } = await run(["upgrade"], { cwd: dir, ask: io.ask });
    expect(output).toMatch(/already up to date/i);
    expect(io.asked).toEqual([]);
  });

  it("says to run init when Groundwork isn't installed", async () => {
    const { code, output } = await run(["upgrade"], { cwd: tempDir(), ask: answers().ask });
    expect(code).toBe(1);
    expect(output).toMatch(/npx groundwork-ai init/);
  });

  it("is listed in the CLI help and the README", async () => {
    expect((await run(["--help"])).output).toMatch(/upgrade/);
    expect(readme).toContain("`npx groundwork-ai upgrade`");
  });
});

describe("doctor and versions", () => {
  it("suggests an upgrade when the project is older than the CLI", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: answers().ask });
    const cfg = config(dir);
    cfg.version = "0.1.0";
    write(dir, ".groundwork/config.json", JSON.stringify(cfg));
    expect((await run(["doctor"], { cwd: dir })).output).toMatch(/0\.1\.0[^\n]*npx groundwork-ai upgrade/);
  });

  it("suggests an upgrade when there's no version stamp at all", async () => {
    const dir = await v03Project();
    expect((await run(["doctor"], { cwd: dir })).output).toMatch(/npx groundwork-ai upgrade/);
  });

  it("points out-of-date adapter files at upgrade, not adapter add, when the project is behind", async () => {
    const output = (await run(["doctor"], { cwd: await v03Project() })).output;
    expect(output).toMatch(/session-start hook[^\n]*npx groundwork-ai upgrade/);
    expect(output).not.toMatch(/adapter add/);
  });

  it("says nothing about versions on a current install", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: answers().ask });
    expect((await run(["doctor"], { cwd: dir })).output).not.toMatch(/upgrade/);
  });
});

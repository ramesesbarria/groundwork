// `groundwork uninstall`: remove what Groundwork added, keep everything the user wrote or changed.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";
import { unmergeSettings, withoutGroundworkAttributes } from "../src/uninstall.js";
import { GITATTRIBUTES } from "../src/init.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-uninstall-"));
  temps.push(dir);
  return dir;
}
const say = (answer: string) => async () => answer;
const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

// A project with its own Claude Code settings, CLAUDE.md, AGENTS.md and .gitattributes.
async function projectWithOwnFiles() {
  const dir = tempDir();
  mkdirSync(join(dir, ".git"));
  mkdirSync(join(dir, ".claude/skills/mine"), { recursive: true });
  const settings = JSON.stringify(
    {
      permissions: { allow: ["Bash(npm test)"] },
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo mine" }] }] },
    },
    null,
    2,
  ) + "\n";
  const own = {
    ".claude/settings.json": settings,
    ".claude/skills/mine/SKILL.md": "---\nname: mine\n---\nMy skill.\n",
    "CLAUDE.md": "# My rules\n\nBe kind.\n",
    "AGENTS.md": "# My agents file\n\nUse tabs.\n",
    ".gitattributes": "*.png binary\n*.sh text eol=lf\n",
  };
  for (const [path, text] of Object.entries(own)) writeFileSync(join(dir, path), text);
  await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: say("") });
  return { dir, own };
}

describe("groundwork uninstall", () => {
  it("puts the user's own files back exactly as they were", async () => {
    const { dir, own } = await projectWithOwnFiles();
    expect(read(dir, ".claude/settings.json")).not.toBe(own[".claude/settings.json"]); // init merged its hooks
    const { code } = await run(["uninstall"], { cwd: dir, ask: say("y") });
    expect(code).toBe(0);
    expect(read(dir, ".claude/settings.json")).toBe(own[".claude/settings.json"]);
    expect(read(dir, ".claude/skills/mine/SKILL.md")).toBe(own[".claude/skills/mine/SKILL.md"]);
    expect(read(dir, "AGENTS.md")).toBe(own["AGENTS.md"]);
    expect(read(dir, ".gitattributes")).toBe(own[".gitattributes"]);
    expect(read(dir, "CLAUDE.md")).toContain("Be kind.");
    expect(existsSync(join(dir, ".claude/skills/gw"))).toBe(false);
    expect(existsSync(join(dir, ".claude/agents"))).toBe(false);
    expect(existsSync(join(dir, ".groundwork"))).toBe(false);
  });

  it("removes a fresh install completely when told yes", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "opencode"], { cwd: dir, ask: say("") });
    await run(["uninstall"], { cwd: dir, ask: say("y") });
    expect(readdirSync(dir).sort()).toEqual(["AGENTS.md"]); // filled in by setup, so it's the project's to delete
  });

  it("keeps .groundwork/ unless the human says yes, and with --keep-state", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "none"], { cwd: dir, ask: say("") });
    const noAnswer = await run(["uninstall"], { cwd: dir, ask: say("") });
    expect(existsSync(join(dir, ".groundwork/SPEC.md"))).toBe(true);
    expect(noAnswer.output).toMatch(/\.groundwork\/ \(you chose to keep it\)/);
    const asked: string[] = [];
    await run(["uninstall", "--keep-state"], { cwd: dir, ask: async (q) => (asked.push(q), "y") });
    expect(asked).toEqual([]);
    expect(existsSync(join(dir, ".groundwork"))).toBe(true);
  });

  it("keeps an adapter file the user changed, and says so", async () => {
    const dir = tempDir();
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: say("") });
    const skill = join(dir, ".claude/skills/gw/SKILL.md");
    writeFileSync(skill, `${readFileSync(skill, "utf8")}\nMy extra line.\n`);
    const { output } = await run(["uninstall", "--keep-state"], { cwd: dir, ask: say("") });
    expect(existsSync(skill)).toBe(true);
    expect(output).toMatch(/\.claude\/skills\/gw\/SKILL\.md \(changed since Groundwork wrote it\)/);
  });

  it("--dry-run lists the changes and writes nothing", async () => {
    const { dir } = await projectWithOwnFiles();
    const before = read(dir, ".claude/settings.json");
    const { output } = await run(["uninstall", "--dry-run"], { cwd: dir, ask: say("y") });
    expect(output).toMatch(/Dry run/);
    expect(output).toMatch(/edit {7}\.claude\/settings\.json/);
    expect(read(dir, ".claude/settings.json")).toBe(before);
    expect(existsSync(join(dir, ".groundwork"))).toBe(true);
  });

  it("says so when there's nothing to remove", async () => {
    expect((await run(["uninstall"], { cwd: tempDir(), ask: say("y") })).output).toMatch(/isn't installed here/);
  });
});

describe("uninstall helpers", () => {
  it("unmergeSettings drops only entries whose commands run Groundwork's files", () => {
    const settings = {
      model: "opus",
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "echo mine" }] },
          { matcher: "Bash|Write", hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/guards/run.mjs" claude-code' }] },
        ],
        SessionStart: [{ hooks: [{ type: "command", command: "node .groundwork/hooks/session-start.mjs" }] }],
      },
    };
    expect(unmergeSettings(settings)).toEqual({
      model: "opus",
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo mine" }] }] },
    });
    expect(unmergeSettings({ hooks: { SessionStart: settings.hooks.SessionStart } })).toEqual({});
  });

  it("withoutGroundworkAttributes keeps the user's identical lines outside Groundwork's blocks", () => {
    const text = `*.png binary\n${GITATTRIBUTES}`;
    expect(withoutGroundworkAttributes(text).trim()).toBe("*.png binary");
  });
});

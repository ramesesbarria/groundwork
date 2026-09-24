// Card 4.2: guards (the GUARD level of the lessons ladder) and their Claude Code wiring.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { run } from "../src/index.js";
import { mergeSettings } from "../src/settings.js";
import { readCore } from "../src/core.js";
import { generateClaudeCode } from "../src/adapters/claude-code.js";

const guardsDir = fileURLToPath(new URL("../../core/guards/", import.meta.url));
const load = async (name: string) => import(pathToFileURL(join(guardsDir, name)).href);

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-guards-"));
  temps.push(dir);
  return dir;
}

const commitWith = (message: string) => ({ kind: "command", command: `git commit -F - <<'EOF'\n${message}\nEOF` });

describe("no-ai-trailers guard", () => {
  it("blocks a commit with an AI Co-Authored-By trailer", async () => {
    const { check } = await load("no-ai-trailers.mjs");
    const result = check(commitWith("Fix bug\n\nCo-Authored-By: Claude Opus <noreply@anthropic.com>"));
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/attribution/i);
  });

  it("blocks a 'Generated with' line", async () => {
    const { check } = await load("no-ai-trailers.mjs");
    expect(check(commitWith("Fix bug\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)")).block).toBe(true);
  });

  it("allows a normal commit and a human co-author", async () => {
    const { check } = await load("no-ai-trailers.mjs");
    expect(check(commitWith("Fix bug")).block).toBe(false);
    expect(check(commitWith("Fix bug\n\nCo-Authored-By: Jane Doe <jane@example.com>")).block).toBe(false);
  });

  it("ignores commands that aren't commits, and file writes", async () => {
    const { check } = await load("no-ai-trailers.mjs");
    expect(check({ kind: "command", command: "npm test" }).block).toBe(false);
    expect(check({ kind: "write", path: "notes.md", content: "Co-Authored-By: Claude" }).block).toBe(false);
  });
});

describe("guard runner", () => {
  it("turns Claude Code hook input into actions", async () => {
    const { toAction } = await load("run.mjs");
    expect(toAction("claude-code", { tool_name: "Bash", tool_input: { command: "ls" } })).toEqual({
      kind: "command",
      command: "ls",
    });
    expect(toAction("claude-code", { tool_name: "Write", tool_input: { file_path: "a.ts", content: "x" } })).toEqual({
      kind: "write",
      path: "a.ts",
      content: "x",
    });
    expect(
      toAction("claude-code", { tool_name: "Edit", tool_input: { file_path: "a.ts", old_string: "x", new_string: "y" } }),
    ).toEqual({ kind: "write", path: "a.ts", content: "y" });
    expect(toAction("claude-code", { tool_name: "Read", tool_input: { file_path: "a.ts" } })).toBeNull();
  });

  it("runs only the guards it's given", async () => {
    const { runGuards } = await load("run.mjs");
    const action = commitWith("x\n\nCo-Authored-By: Claude <noreply@anthropic.com>");
    expect((await runGuards(action, [], guardsDir)).block).toBe(false);
    expect((await runGuards(action, ["no-ai-trailers"], guardsDir)).block).toBe(true);
  });

  it("warns about a guard that doesn't exist, without blocking", async () => {
    const { runGuards } = await load("run.mjs");
    const result = await runGuards({ kind: "command", command: "ls" }, ["missing-guard"], guardsDir);
    expect(result.block).toBe(false);
    expect(result.warnings.join(" ")).toContain("missing-guard");
  });

  it("as a Claude Code hook: exits 2 with the reason when blocked, 0 otherwise", () => {
    const project = tempDir();
    cpSync(guardsDir, join(project, ".groundwork/guards"), { recursive: true });
    writeFileSync(join(project, ".groundwork/config.json"), JSON.stringify({ guards: ["no-ai-trailers"] }));
    const hook = (input: object) =>
      spawnSync(process.execPath, [join(project, ".groundwork/guards/run.mjs"), "claude-code"], {
        input: JSON.stringify(input),
        encoding: "utf8",
      });

    const blocked = hook({
      tool_name: "Bash",
      tool_input: { command: "git commit -m 'x' -m 'Co-Authored-By: Claude <noreply@anthropic.com>'" },
    });
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toMatch(/attribution/i);

    expect(hook({ tool_name: "Bash", tool_input: { command: "git commit -m 'Fix bug'" } }).status).toBe(0);
  });
});

describe("config", () => {
  const template = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../core/templates/${name}`, import.meta.url), "utf8"));

  it("lists guards, empty by default", () => {
    expect(template("config.json").guards).toEqual([]);
    expect(template("config.schema.json").properties.guards.type).toBe("array");
  });
});

describe("Claude Code wiring", () => {
  const ours = generateClaudeCode(readCore(fileURLToPath(new URL("../../core/", import.meta.url))));

  it("the adapter adds a PreToolUse hook that runs the guard runner", () => {
    const settings = JSON.parse(ours[".claude/settings.json"]);
    const commands = settings.hooks.PreToolUse.flatMap((e: { hooks: { command: string }[] }) =>
      e.hooks.map((h) => h.command),
    );
    expect(commands.some((c: string) => c.includes(".groundwork/guards/run.mjs") && c.includes("claude-code"))).toBe(
      true,
    );
  });

  it("mergeSettings keeps the user's settings and adds our hook once", () => {
    const user = {
      permissions: { allow: ["Bash(npm test)"] },
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo mine" }] }] },
    };
    const merged = mergeSettings(user, JSON.parse(ours[".claude/settings.json"]));
    expect(merged.permissions).toEqual(user.permissions);
    expect(JSON.stringify(merged)).toContain("echo mine");
    expect(JSON.stringify(merged)).toContain("run.mjs");
    const twice = mergeSettings(merged, JSON.parse(ours[".claude/settings.json"]));
    expect(twice).toEqual(merged);
  });

  it("init merges into an existing .claude/settings.json without asking", async () => {
    const project = tempDir();
    mkdirSync(join(project, ".claude"));
    writeFileSync(join(project, ".claude/settings.json"), JSON.stringify({ permissions: { allow: ["Bash(ls)"] } }));
    const asked: string[] = [];
    await run(["init", "--adapter", "claude-code"], {
      cwd: project,
      ask: async (q) => {
        asked.push(q);
        return "";
      },
    });
    const settings = JSON.parse(readFileSync(join(project, ".claude/settings.json"), "utf8"));
    expect(settings.permissions.allow).toEqual(["Bash(ls)"]);
    expect(JSON.stringify(settings)).toContain("run.mjs");
    expect(asked).toEqual([]);
  });
});

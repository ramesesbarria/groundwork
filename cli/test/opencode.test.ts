// The OpenCode adapter. Formats checked against opencode.ai/docs (commands, agents, tools, rules)
// on 2026-09-24; the plugin format against OpenCode 2.0.16 on 2026-09-25.
import { afterEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readCore } from "../src/core.js";
import { generateOpenCode } from "../src/adapters/opencode.js";
import { run } from "../src/index.js";

const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));
const core = readCore(coreDir);
const out = generateOpenCode(core);

const COMMANDS = ["gw", "gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject", "gw-handoff", "gw-quick", "gw-decide", "gw-ui-spec", "gw-retro"];
const ROLES = ["planner", "tester", "implementer", "reviewer"];

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-opencode-"));
  temps.push(dir);
  return dir;
}

function frontmatter(md: string): string {
  return md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

describe("OpenCode adapter", () => {
  it("generates exactly the expected files, and no CLAUDE.md (OpenCode reads AGENTS.md itself)", () => {
    expect(Object.keys(out).sort()).toEqual(
      [
        ".opencode/plugins/groundwork-guards.js",
        ...COMMANDS.map((c) => `.opencode/commands/${c}.md`),
        ...ROLES.map((r) => `.opencode/agents/gw-${r}.md`),
      ].sort(),
    );
  });

  it.each(COMMANDS)("command %s points to the core command and passes arguments", (name) => {
    const command = out[`.opencode/commands/${name}.md`];
    expect(frontmatter(command)).toMatch(/^description: .{20,}/m);
    expect(command).toContain(`.groundwork/commands/${name}.md`);
    expect(command).toContain("$ARGUMENTS");
    expect(command).not.toContain("## Steps");
  });

  it.each(ROLES)("agent gw-%s is a subagent that points to its role file", (role) => {
    const agent = out[`.opencode/agents/gw-${role}.md`];
    expect(frontmatter(agent)).toMatch(/^mode: subagent$/m);
    expect(frontmatter(agent)).toMatch(/^description: .{20,}/m);
    expect(agent).toContain(`.groundwork/roles/${role}.md`);
  });

  it("limits tools per role with OpenCode permissions", () => {
    const fm = (role: string) => frontmatter(out[`.opencode/agents/gw-${role}.md`]);
    expect(fm("reviewer")).toMatch(/^\s+edit: deny$/m); // covers edit, write and apply_patch
    expect(fm("planner")).toMatch(/^\s+bash: deny$/m);
    expect(fm("tester")).not.toContain("deny");
    expect(fm("implementer")).not.toContain("deny");
  });

  it("is pure and matches the snapshot", () => {
    expect(generateOpenCode(Object.freeze({ ...core }))).toEqual(out);
    expect(out).toMatchSnapshot();
  });
});

describe("OpenCode guard plugin", () => {
  async function installedPlugin(guards: string[]) {
    const project = tempDir();
    cpSync(join(coreDir, "guards"), join(project, ".groundwork/guards"), { recursive: true });
    writeFileSync(join(project, ".groundwork/config.json"), JSON.stringify({ guards }));
    mkdirSync(join(project, ".opencode/plugins"), { recursive: true });
    const file = join(project, ".opencode/plugins/groundwork-guards.js");
    writeFileSync(file, out[".opencode/plugins/groundwork-guards.js"]);
    const { default: plugin } = await import(pathToFileURL(file).href);
    // OpenCode 2.x rejects a plugin unless the default export has a string id and a setup function.
    expect(typeof plugin.id).toBe("string");
    expect(typeof plugin.setup).toBe("function");
    const hooks: Record<string, (call: object) => Promise<void>> = {};
    await plugin.setup({
      tool: {
        hook: async (name: string, callback: (call: object) => Promise<void>) => {
          hooks[name] = callback;
          return { dispose: async () => {} };
        },
      },
    });
    return hooks["execute.before"];
  }

  const trailerCommit = "git commit -m x -m 'Co-Authored-By: Claude <noreply@anthropic.com>'";

  it("throws to block a commit with an AI trailer when the guard is on", async () => {
    const before = await installedPlugin(["no-ai-trailers"]);
    await expect(before({ tool: "shell", input: { command: trailerCommit } })).rejects.toThrow(/attribution/i);
    await expect(before({ tool: "shell", input: { command: "git commit -m 'Fix'" } })).resolves.toBeUndefined();
  });

  it("does nothing when no guards are on", async () => {
    const before = await installedPlugin([]);
    await expect(before({ tool: "shell", input: { command: trailerCommit } })).resolves.toBeUndefined();
  });

  it("the runner understands OpenCode's tool names and arguments", async () => {
    const { toAction } = await import(pathToFileURL(join(coreDir, "guards/run.mjs")).href);
    expect(toAction("opencode", { tool: "shell", args: { command: "ls" } })).toEqual({ kind: "command", command: "ls" });
    expect(toAction("opencode", { tool: "bash", args: { command: "ls" } })).toEqual({ kind: "command", command: "ls" });
    expect(toAction("opencode", { tool: "write", args: { filePath: "a.ts", content: "x" } })).toEqual({
      kind: "write",
      path: "a.ts",
      content: "x",
    });
    expect(toAction("opencode", { tool: "edit", args: { filePath: "a.ts", oldString: "x", newString: "y" } })).toEqual({
      kind: "write",
      path: "a.ts",
      content: "y",
    });
    // OpenCode 2.x names the file argument path.
    expect(toAction("opencode", { tool: "write", args: { path: "a.ts", content: "x" } })).toEqual({
      kind: "write",
      path: "a.ts",
      content: "x",
    });
    expect(toAction("opencode", { tool: "edit", args: { path: "a.ts", oldString: "x", newString: "y" } })).toEqual({
      kind: "write",
      path: "a.ts",
      content: "y",
    });
    expect(toAction("opencode", { tool: "read", args: { path: "a.ts" } })).toBeNull();
  });
});

describe("init --adapter opencode", () => {
  it("installs the OpenCode files and no Claude Code files", async () => {
    const project = tempDir();
    const { code, output } = await run(["init", "--adapter", "opencode"], { cwd: project, ask: async () => "" });
    expect(code).toBe(0);
    expect(existsSync(join(project, ".opencode/commands/gw-next.md"))).toBe(true);
    expect(existsSync(join(project, ".opencode/plugins/groundwork-guards.js"))).toBe(true);
    expect(existsSync(join(project, "CLAUDE.md"))).toBe(false);
    expect(existsSync(join(project, ".claude"))).toBe(false);
    expect(readFileSync(join(project, ".gitattributes"), "utf8")).toContain(".opencode/** text eol=lf");
    expect(output).toMatch(/OpenCode/);
  });

  it("offers OpenCode when asking which tool to set up", async () => {
    const asked: string[] = [];
    await run(["init"], {
      cwd: tempDir(),
      ask: async (q) => {
        asked.push(q);
        return "";
      },
    });
    expect(asked[0]).toMatch(/OpenCode/);
  });
});

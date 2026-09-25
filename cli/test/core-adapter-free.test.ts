// core/ never depends on one tool. Everything tool-specific stays in cli/src/adapters/.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { run } from "../src/index.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));

// Words and paths that only make sense for one tool.
const TOOL_SPECIFIC = [/\.claude\//, /\.opencode\//, /CLAUDE_PROJECT_DIR/, /Skill tool/, /subagent_type/, /Claude Code/, /OpenCode/i, /claude-code/];

// The one allowed exception: the guard runner translates each tool's hook input into a Groundwork
// action, so every adapter can share the same guards. It works without any tool.
const ALLOWED = new Set(["guards/run.mjs"]);

describe("core is adapter-free", () => {
  it("no core file mentions a specific tool, apart from the allow-list", () => {
    const leaks = Object.entries(core)
      .filter(([path]) => !ALLOWED.has(path))
      .flatMap(([path, text]) =>
        text
          .split("\n")
          .map((line, i) => ({ path, line: i + 1, text: line }))
          .filter(({ text }) => TOOL_SPECIFIC.some((re) => re.test(text))),
      )
      .map(({ path, line, text }) => `${path}:${line}: ${text.trim()}`);
    expect(leaks).toEqual([]);
  });

  it("the allow-list only holds files that exist", () => {
    for (const path of ALLOWED) expect(core[path], path).toBeDefined();
  });
});

describe("plain markdown install", () => {
  const MAIN = ["gw", "gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject", "gw-quick"];
  const temps: string[] = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it("AGENTS.md leads to every main command without an adapter", async () => {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-none-"));
    temps.push(dir);
    const { output } = await run(["init", "--adapter", "none"], { cwd: dir, ask: async () => "" });
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain(".groundwork/commands/gw.md");
    expect(agents).toMatch(/every command is a file in `?\.groundwork\/commands\/`?/i);
    for (const name of MAIN) expect(existsSync(join(dir, `.groundwork/commands/${name}.md`)), name).toBe(true);
    expect(output).toContain(".groundwork/commands/gw.md");
  });
});

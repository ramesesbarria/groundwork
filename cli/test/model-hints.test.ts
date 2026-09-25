// Card 10.4: optional model hints per role. Adapters write them into agent files; the core ignores them.
// Fields checked against code.claude.com/docs/en/sub-agents and opencode.ai/docs/agents on 2026-09-25.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { generateClaudeCode } from "../src/adapters/claude-code.js";
import { generateOpenCode } from "../src/adapters/opencode.js";
import { planAdapter } from "../src/init.js";
import { run } from "../src/index.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const MODELS = { reviewer: "opus", tester: { "claude-code": "haiku", opencode: "anthropic/claude-haiku-4-5" } };
const modelLine = (md: string) => md.match(/^model: (.*)$/m)?.[1];

describe("generated agent files", () => {
  it("no hints gives exactly today's output", () => {
    expect(generateClaudeCode(core, {})).toEqual(generateClaudeCode(core));
    expect(generateOpenCode(core, {})).toEqual(generateOpenCode(core));
  });

  it("Claude Code agents get a model line for each role that has a hint", () => {
    const out = generateClaudeCode(core, MODELS);
    expect(modelLine(out[".claude/agents/gw-reviewer.md"])).toBe("opus");
    expect(modelLine(out[".claude/agents/gw-tester.md"])).toBe("haiku");
    expect(modelLine(out[".claude/agents/gw-planner.md"])).toBeUndefined();
  });

  it("OpenCode agents get their own value when the hint is per tool", () => {
    const out = generateOpenCode(core, MODELS);
    expect(modelLine(out[".opencode/agents/gw-tester.md"])).toBe("anthropic/claude-haiku-4-5");
    expect(modelLine(out[".opencode/agents/gw-reviewer.md"])).toBe("opus");
    expect(modelLine(out[".opencode/agents/gw-implementer.md"])).toBeUndefined();
  });

  it("a per-tool hint without this tool's key leaves the line out", () => {
    const out = generateOpenCode(core, { tester: { "claude-code": "haiku" } });
    expect(modelLine(out[".opencode/agents/gw-tester.md"])).toBeUndefined();
  });

  it("the none adapter is unaffected", () => {
    expect(planAdapter(core, "none", MODELS).map((f) => f.path)).toEqual([".gitattributes"]);
  });

  it("the schema documents the optional models setting", () => {
    const prop = JSON.parse(core["templates/config.schema.json"]).properties.models;
    expect(Object.keys(prop.properties)).toEqual(["planner", "tester", "implementer", "reviewer"]);
    expect(prop.description).toMatch(/adapter/i);
  });
});

describe("in a project", () => {
  const temps: string[] = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  async function installedWith(models: unknown): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-models-"));
    temps.push(dir);
    await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: async () => "" });
    const path = join(dir, ".groundwork/config.json");
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), models }, null, 2));
    return dir;
  }

  it("adapter add writes the project's hints, and doctor sees no drift afterwards", async () => {
    const dir = await installedWith(MODELS);
    await run(["adapter", "add", "claude-code"], { cwd: dir, ask: async () => "y" });
    expect(modelLine(readFileSync(join(dir, ".claude/agents/gw-reviewer.md"), "utf8"))).toBe("opus");
    expect((await run(["doctor"], { cwd: dir })).output).not.toMatch(/gw-reviewer\.md differs/);
  });

  it("doctor warns about a hint for a role that doesn't exist", async () => {
    const dir = await installedWith({ designer: "opus" });
    expect((await run(["doctor"], { cwd: dir })).output).toMatch(/models[^\n]*designer/);
  });
});

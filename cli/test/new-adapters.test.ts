// The Codex, Cursor and Gemini CLI adapters: what they generate, that it is deterministic, and that init,
// doctor, upgrade, flow and uninstall treat their files as Groundwork's and the user's config as the user's.
// Formats: learn.chatgpt.com/docs/hooks, cursor.com/docs/hooks, geminicli.com/docs/hooks (read 2026-11-15).
// None of this ran inside the tools themselves.
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { generateCodex } from "../src/adapters/codex.js";
import { generateCursor } from "../src/adapters/cursor.js";
import { generateGemini } from "../src/adapters/gemini.js";
import { run } from "../src/index.js";
import { layerOf } from "../src/init.js";
import { coreDir, repo, tempDir, write } from "./support.js";

const core = readCore(coreDir);
const yes = { ask: async () => "y" };
const COMMANDS = ["gw", "gw-approve", "gw-reject"];
const ROLES = ["tester", "implementer", "reviewer"];

const CASES = [
  {
    tool: "codex",
    generate: generateCodex,
    context: [".agents/skills/gw-approve/SKILL.md", ".agents/skills/gw-approve/agents/openai.yaml", ".agents/skills/gw-reject/SKILL.md", ".agents/skills/gw-reject/agents/openai.yaml", ".agents/skills/gw/SKILL.md", ".codex/hooks.json"],
    flowOnly: ROLES.map((r) => `.codex/agents/gw-${r}.toml`),
    config: ".codex/hooks.json",
  },
  {
    tool: "cursor",
    generate: generateCursor,
    context: [...COMMANDS.map((c) => `.cursor/skills/${c}/SKILL.md`), ".cursor/hooks.json", ".cursor/hooks/groundwork.mjs"],
    flowOnly: ROLES.map((r) => `.cursor/agents/gw-${r}.md`),
    config: ".cursor/hooks.json",
  },
  {
    tool: "gemini",
    generate: generateGemini,
    context: ["GEMINI.md", ...COMMANDS.map((c) => `.gemini/commands/${c}.toml`), ".gemini/hooks/groundwork.mjs", ".gemini/settings.json"],
    flowOnly: ROLES.map((r) => `.gemini/agents/gw-${r}.md`),
    config: ".gemini/settings.json",
  },
] as const;

const hooksOf = (text: string): Record<string, any[]> => JSON.parse(text).hooks;
const allCommands = (text: string) =>
  Object.values(hooksOf(text))
    .flat()
    .flatMap((e) => (e.hooks ? e.hooks : [e]).map((h: any) => h.command as string));

describe.each(CASES)("$tool adapter", ({ tool, generate, context, flowOnly, config }) => {
  it("generates the context files, and the flow's roles only with the flow", () => {
    expect(Object.keys(generate(core, {}, false)).sort()).toEqual([...context].sort());
    expect(Object.keys(generate(core, {}, true)).sort()).toEqual([...context, ...flowOnly].sort());
  });

  it("is deterministic and pure", () => {
    const frozen = Object.freeze({ ...core });
    expect(generate(frozen, {}, true)).toEqual(generate(frozen, {}, true));
    expect(generate(core, {}, false)).toEqual(generate(core, {}, false));
  });

  it("runs the session-start and checkpoint hooks, none fail-closed, none over 15 seconds", () => {
    const hooks = hooksOf(generate(core, {}, false)[config]);
    expect(Object.keys(hooks).length).toBe(4);
    for (const entry of Object.values(hooks).flat()) {
      for (const h of entry.hooks ?? [entry]) {
        expect(h.failClosed).toBeUndefined();
        expect(h.onFailure).toBeUndefined();
        const seconds = tool === "gemini" ? h.timeout / 1000 : h.timeout;
        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThanOrEqual(15);
      }
    }
  });

  it("wires the guard only with the flow", () => {
    const text = (flow: boolean) => allCommands(generate(core, {}, flow)[config]).join("\n");
    expect(text(false)).not.toMatch(/guards\/run\.mjs|guard/);
    expect(text(true)).toMatch(/guard/);
  });

  it("names no flow concept in a context-only install", () => {
    for (const [path, content] of Object.entries(generate(core, {}, false))) {
      if (/gw-approve|gw-reject/.test(path)) continue; // the commands are installed in every layer
      expect(content, path).not.toMatch(/\bcards?\b|\broles?\b|approv/i);
    }
  });

  it.each(COMMANDS)("exposes %s by pointing at the core command", (name) => {
    const files = generate(core, {}, true);
    const file = Object.entries(files).find(([p]) => p.includes(`/${name}/SKILL.md`) || p.endsWith(`/${name}.toml`));
    expect(file, name).toBeDefined();
    expect(file![1]).toContain(`.groundwork/commands/${name}.md`);
  });

  it("matches the snapshot, context only and with the flow", () => {
    expect(generate(core, {}, false)).toMatchSnapshot("context");
    expect(generate(core, {}, true)).toMatchSnapshot("flow");
  });
});

describe("Codex specifics", () => {
  const files = generateCodex(core, {}, true);
  it("makes approve and reject explicit-invocation only, and leaves /gw implicit", () => {
    expect(files[".agents/skills/gw-approve/agents/openai.yaml"]).toContain("allow_implicit_invocation: false");
    expect(files[".agents/skills/gw-reject/agents/openai.yaml"]).toContain("allow_implicit_invocation: false");
    expect(files[".agents/skills/gw/agents/openai.yaml"]).toBeUndefined();
  });
  it("uses the documented events, matchers and second-based timeouts", () => {
    const hooks = hooksOf(files[".codex/hooks.json"]);
    expect(Object.keys(hooks).sort()).toEqual(["PreCompact", "PreToolUse", "SessionEnd", "SessionStart", "Stop"]);
    expect(hooks.SessionStart[0].matcher).toBe("startup|resume|clear|compact|fork");
    expect(hooks.SessionEnd[0].hooks[0].timeout).toBeLessThanOrEqual(3);
    expect(hooks.Stop[0].hooks[0].command).toContain("--block-json");
    expect(hooks.PreToolUse[0].matcher).toBe("Bash|apply_patch");
    expect(hooks.SessionStart[0].hooks[0].commandWindows).toBe("node .groundwork/hooks/session-start.mjs . codex");
  });
  it("writes valid TOML custom agents that say the reviewer must not edit", () => {
    const reviewer = files[".codex/agents/gw-reviewer.toml"];
    expect(reviewer).toMatch(/^name = "gw-reviewer"$/m);
    expect(reviewer).toContain('developer_instructions = """');
    expect(reviewer).toContain("never edit files");
    expect(files[".codex/agents/gw-tester.toml"]).not.toContain("never edit");
  });
  it("takes a model hint under its own name", () => {
    expect(generateCodex(core, { tester: { codex: "gpt-x" } }, true)[".codex/agents/gw-tester.toml"]).toContain('model = "gpt-x"');
  });
});

describe("Cursor specifics", () => {
  const files = generateCursor(core, {}, true);
  it("uses skills, human-only for approve and reject", () => {
    expect(files[".cursor/skills/gw-approve/SKILL.md"]).toContain("disable-model-invocation: true");
    expect(files[".cursor/skills/gw-reject/SKILL.md"]).toContain("disable-model-invocation: true");
    expect(files[".cursor/skills/gw/SKILL.md"]).not.toContain("disable-model-invocation");
  });
  it("is version 1, flat entries, and only the guard fails closed", () => {
    const parsed = JSON.parse(files[".cursor/hooks.json"]);
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.hooks).sort()).toEqual(["beforeShellExecution", "preCompact", "sessionEnd", "sessionStart", "stop"]);
    expect(parsed.hooks.beforeShellExecution[0].failClosed).toBe(true);
    for (const event of ["sessionStart", "stop", "preCompact", "sessionEnd"]) expect(parsed.hooks[event][0].failClosed).toBeUndefined();
  });
  it("makes only the reviewer read-only", () => {
    expect(files[".cursor/agents/gw-reviewer.md"]).toContain("readonly: true");
    expect(files[".cursor/agents/gw-tester.md"]).not.toContain("readonly");
  });
});

describe("Gemini CLI specifics", () => {
  const files = generateGemini(core, {}, true);
  it("uses the documented events and millisecond timeouts", () => {
    const hooks = hooksOf(files[".gemini/settings.json"]);
    expect(Object.keys(hooks).sort()).toEqual(["AfterAgent", "BeforeTool", "PreCompress", "SessionEnd", "SessionStart"]);
    expect(hooks.BeforeTool[0].matcher).toBe("run_shell_command|write_file|replace");
    expect(hooks.SessionStart[0].hooks[0].timeout).toBe(15000);
  });
  it("makes TOML commands that pass arguments, and GEMINI.md that imports AGENTS.md", () => {
    expect(files[".gemini/commands/gw-approve.toml"]).toMatch(/^prompt = ".*\{\{args\}\}"$/m);
    expect(files["GEMINI.md"].startsWith("@AGENTS.md\n")).toBe(true);
  });
  it("gives the reviewer a tool allow-list and the others the session's tools", () => {
    expect(files[".gemini/agents/gw-reviewer.md"]).toMatch(/tools:\n {2}- read_file\n {2}- grep_search\n {2}- run_shell_command/);
    expect(files[".gemini/agents/gw-tester.md"]).not.toContain("tools:");
  });
});

// The scripts Cursor and Gemini CLI call, run as the tools would: JSON in on stdin, JSON out.
describe.each([
  ["cursor", ".cursor/hooks/groundwork.mjs", generateCursor],
  ["gemini", ".gemini/hooks/groundwork.mjs", generateGemini],
] as const)("%s hook script", (tool, shimPath, generate) => {
  async function project(flow: boolean) {
    const dir = repo();
    await run(["init", "--adapter", tool, ...(flow ? ["--flow"] : [])], { cwd: dir, ...yes });
    return dir;
  }
  const call = (dir: string, event: string, input: object) =>
    spawnSync(process.execPath, [join(dir, shimPath), event], { cwd: dir, input: JSON.stringify(input), encoding: "utf8" });

  it("puts the brief where the tool reads model context", async () => {
    const dir = await project(false);
    const result = call(dir, "session-start", { session_id: "s1", conversation_id: "c1", source: "startup" });
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout);
    const text = tool === "cursor" ? out.additional_context : out.hookSpecificOutput.additionalContext;
    expect(text).toContain("Project memory");
    if (tool === "gemini") expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
  });

  it("asks once to save a handoff that is behind, in the shape the tool continues from", async () => {
    const dir = await project(false);
    write(dir, ".groundwork/HANDOFF.md", readFileSync(join(dir, ".groundwork/HANDOFF.md"), "utf8").replace(/## Now\n[\s\S]*?\n## Next/, "## Now\nWorking on the parser.\n\n## Next"));
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-qm", "chore: add Groundwork"], { cwd: dir });
    write(dir, "src.txt", "x\n");
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-qm", "feat: more"], { cwd: dir });
    const first = JSON.parse(call(dir, "stop", { session_id: "s1", conversation_id: "c1", loop_count: 0, stop_hook_active: false }).stdout);
    const message = tool === "cursor" ? first.followup_message : first.reason;
    expect(message ?? "").toMatch(/checkpoint/);
    if (tool === "gemini") expect(first.decision).toBe("deny");
    const again = JSON.parse(call(dir, "stop", { session_id: "s1", conversation_id: "c1", loop_count: 1, stop_hook_active: true }).stdout);
    expect(again).toEqual({});
  });

  it("never fails: bad input, a missing project or an unknown event still exits 0", async () => {
    const dir = await project(false);
    expect(spawnSync(process.execPath, [join(dir, shimPath), "stop"], { cwd: dir, input: "not json", encoding: "utf8" }).status).toBe(0);
    expect(call(dir, "nonsense", {}).status).toBe(0);
    for (const event of ["pre-compact", "pre-compress", "session-end"]) expect(call(dir, event, {}).status).toBe(0);
  });

  it("the file is exactly what the adapter generates", async () => {
    const dir = await project(true);
    expect(readFileSync(join(dir, shimPath), "utf8")).toBe(generate(core, {}, true)[shimPath]);
  });
});

describe("guard runner input for the new tools", () => {
  it("reads each tool's shell and write calls, and ignores what it can't read", async () => {
    const { toAction } = await import(pathToFileURLOf("guards/run.mjs"));
    expect(toAction("codex", { tool_name: "Bash", tool_input: { command: "git commit -m x" } })).toEqual({ kind: "command", command: "git commit -m x" });
    const patch = toAction("codex", { tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: .groundwork/config.json\n+x\n*** End Patch" } });
    expect(patch.kind).toBe("write");
    expect(patch.paths).toEqual([".groundwork/config.json"]);
    expect(toAction("codex", { tool_name: "WebSearch", tool_input: {} })).toBeNull();
    expect(toAction("cursor", { hook_event_name: "beforeShellExecution", command: "ls" })).toEqual({ kind: "command", command: "ls" });
    expect(toAction("cursor", { hook_event_name: "preToolUse", tool_name: "Write", tool_input: {} })).toBeNull();
    expect(toAction("gemini", { tool_name: "run_shell_command", tool_input: { command: "ls" } })).toEqual({ kind: "command", command: "ls" });
    expect(toAction("gemini", { tool_name: "write_file", tool_input: { file_path: "a.txt", content: "hi" } })).toMatchObject({ kind: "write", path: "a.txt", whole: true });
    expect(toAction("gemini", { tool_name: "replace", tool_input: { file_path: "a.txt", old_string: "a", new_string: "b" } })).toMatchObject({ kind: "write", path: "a.txt" });
    expect(toAction("gemini", { tool_name: "read_file", tool_input: {} })).toBeNull();
  });

  it("protects each tool's hook config, hook script and the Codex config from the agent", async () => {
    const { protectHarness } = await import(pathToFileURLOf("guards/lib/harness.mjs"));
    const dir = tempDir();
    const blocked = (path: string) => protectHarness({ kind: "write", path, content: "x", whole: true }, dir).block;
    for (const path of [".codex/hooks.json", ".codex/config.toml", ".cursor/hooks.json", ".cursor/hooks/groundwork.mjs", ".gemini/settings.json", ".gemini/hooks/groundwork.mjs"]) {
      expect(blocked(path), path).toBe(true);
    }
    expect(blocked("src/app.ts")).toBe(false);
    expect(protectHarness({ kind: "command", command: "echo hooks=false > .codex/config.toml" }, dir).block).toBe(true);
    // Taking Groundwork's hook out of Cursor's file is refused; adding the user's own is not.
    const ours = generateCursor(core, {}, true)[".cursor/hooks.json"];
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(join(dir, ".cursor/hooks.json"), ours);
    const edit = (next: object) => protectHarness({ kind: "write", path: ".cursor/hooks.json", content: JSON.stringify(next), whole: true }, dir);
    const parsed = JSON.parse(ours);
    expect(edit({ version: 1, hooks: {} }).block).toBe(true);
    const weakened = structuredClone(parsed);
    delete weakened.hooks.beforeShellExecution[0].failClosed;
    expect(edit(weakened).block).toBe(true);
    expect(edit(parsed).block).toBe(false);
    writeFileSync(join(dir, ".gemini-settings-probe"), "");
    mkdirSync(join(dir, ".gemini"), { recursive: true });
    writeFileSync(join(dir, ".gemini/settings.json"), generateGemini(core, {}, true)[".gemini/settings.json"]);
    const off = protectHarness({ kind: "write", path: ".gemini/settings.json", content: JSON.stringify({ hooksConfig: { enabled: false }, ...JSON.parse(generateGemini(core, {}, true)[".gemini/settings.json"]) }), whole: true }, dir);
    expect(off.block).toBe(true);
  });

  it("evaluate blocks a commit through the Gemini and Codex shapes in a flow project", async () => {
    const dir = repo();
    await run(["init", "--adapter", "gemini,codex", "--flow"], { cwd: dir, ...yes });
    const guards = join(dir, ".groundwork/guards");
    const { evaluate } = await import(pathToFileURLOf(join(dir, ".groundwork/guards/run.mjs"), true));
    const g = await evaluate("gemini", { tool_name: "run_shell_command", tool_input: { command: "git commit -m 'x'" } }, guards);
    const c = await evaluate("codex", { tool_name: "Bash", tool_input: { command: "git commit -m 'x'" } }, guards);
    expect(g.block).toBe(true);
    expect(c.block).toBe(true);
    const w = await evaluate("gemini", { tool_name: "write_file", tool_input: { file_path: ".groundwork/guards/run.mjs", content: "" } }, guards);
    expect(w.block).toBe(true);
  });
});

function pathToFileURLOf(path: string, absolute = false): string {
  const full = absolute ? path : join(coreDir, path);
  return new URL(`file:///${full.replace(/\\/g, "/").replace(/^\//, "")}`).href;
}

describe.each(CASES)("$tool lifecycle", ({ tool, generate, context, flowOnly, config }) => {
  const initArgs = (flow: boolean) => ["init", "--adapter", tool, ...(flow ? ["--flow"] : [])];

  it.each([false, true])("init (flow %s) installs exactly the generated files and a re-run changes nothing", async (flow) => {
    const dir = repo();
    const first = await run(initArgs(flow), { cwd: dir, ...yes });
    expect(first.code).toBe(0);
    const expected = Object.keys(generate(layerOf(core, flow), {}, flow));
    for (const path of expected) expect(existsSync(join(dir, path)), path).toBe(true);
    if (!flow) for (const path of flowOnly) expect(existsSync(join(dir, path)), path).toBe(false);
    const second = await run(initArgs(flow), { cwd: dir, ...yes });
    expect(second.output).toContain("already up to date");
  });

  it("says what the tool does not enforce with the flow, and only with the flow", async () => {
    const withFlow = await run(initArgs(true), { cwd: repo(), ...yes });
    expect(withFlow.output).toMatch(/Not enforced by (Codex|Cursor|Gemini CLI)/);
    expect(withFlow.output).toContain("Approvals are not bound to the human's message");
    const without = await run(initArgs(false), { cwd: repo(), ...yes });
    expect(without.output).not.toMatch(/Not enforced/);
  });

  it("merges into the user's own config without clobbering it, and uninstall takes only ours out", async () => {
    const dir = repo();
    const mine = { setting: { keep: true }, hooks: { Notification: [{ hooks: [{ type: "command", command: "echo mine" }] }], ...(tool === "cursor" ? { afterFileEdit: [{ command: "echo mine" }] } : {}) } };
    write(dir, config, JSON.stringify(tool === "cursor" ? { version: 1, ...mine } : mine, null, 2));
    await run(initArgs(false), { cwd: dir, ...yes });
    const merged = JSON.parse(readFileSync(join(dir, config), "utf8"));
    expect(merged.setting).toEqual({ keep: true });
    expect(JSON.stringify(merged.hooks)).toContain("echo mine");
    expect(allCommands(JSON.stringify(merged)).some((c) => /session-start|groundwork\.mjs/.test(c))).toBe(true);
    await run(initArgs(false), { cwd: dir, ...yes });
    expect(JSON.parse(readFileSync(join(dir, config), "utf8"))).toEqual(merged);

    const out = await run(["uninstall"], { cwd: dir, ask: async () => "n" });
    expect(out.code).toBe(0);
    const left = JSON.parse(readFileSync(join(dir, config), "utf8"));
    expect(left.setting).toEqual({ keep: true });
    expect(JSON.stringify(left.hooks)).toContain("echo mine");
    expect(JSON.stringify(left.hooks)).not.toMatch(/session-start|groundwork/);
  });

  it("uninstall removes every generated file and leaves no empty folder; a changed file is kept", async () => {
    const dir = repo();
    await run(initArgs(true), { cwd: dir, ...yes });
    const changed = flowOnly[0];
    writeFileSync(join(dir, changed), readFileSync(join(dir, changed), "utf8") + "\nMine.\n");
    const out = await run(["uninstall"], { cwd: dir, ask: async () => "y" });
    expect(out.output).toContain(changed);
    expect(existsSync(join(dir, changed))).toBe(true);
    for (const path of Object.keys(generate(core, {}, true))) {
      if (path === changed) continue;
      expect(existsSync(join(dir, path)), path).toBe(false);
    }
    for (const folder of [".codex", ".cursor", ".gemini", ".agents"]) {
      if (existsSync(join(dir, folder))) {
        const files: string[] = [];
        const walk = (d: string) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : files.push(join(d, e.name))));
        walk(join(dir, folder));
        expect(files.map((f) => f.replace(dir, "")).every((f) => f.includes("gw-reviewer") || f.includes("gw-tester") || f.includes("gw-implementer"))).toBe(true);
      }
    }
  });

  it("doctor passes, then names the missing hook and a modified file", async () => {
    const dir = repo();
    await run(initArgs(true), { cwd: dir, ...yes });
    expect((await run(["doctor"], { cwd: dir, ...yes })).output).not.toMatch(new RegExp(`${config.replace(/\./g, "\\.")}`));
    const stripped = JSON.parse(readFileSync(join(dir, config), "utf8"));
    const first = Object.keys(stripped.hooks)[0];
    delete stripped.hooks[first];
    writeFileSync(join(dir, config), JSON.stringify(stripped));
    const missing = await run(["doctor"], { cwd: dir, ...yes });
    expect(missing.code).toBe(1);
    expect(missing.output).toContain(`${config} is missing Groundwork's`);
    await run(["adapter", "add", tool], { cwd: dir, ...yes });
    const other = context.find((p) => /\/gw\/SKILL\.md$|\/gw\.toml$/.test(p)) as string;
    writeFileSync(join(dir, other), "changed\n");
    expect((await run(["doctor"], { cwd: dir, ...yes })).output).toContain(`${other} differs from what Groundwork would generate`);
  });

  it("upgrade finds the adapter, restores a damaged file and keeps the user's edit", async () => {
    const dir = repo();
    await run(initArgs(false), { cwd: dir, ...yes });
    const skill = context.find((p) => /\/gw\/SKILL\.md$|\/gw\.toml$/.test(p)) as string;
    const original = readFileSync(join(dir, skill), "utf8");
    writeFileSync(join(dir, skill), original + "\n# team note\n");
    const result = await run(["upgrade", "--yes"], { cwd: dir, ...yes });
    expect(result.code).toBe(0);
    expect(readFileSync(join(dir, skill), "utf8")).toContain("# team note");
    expect(existsSync(join(dir, `${skill}.new`))).toBe(true);
  });

  it("flow on and off swap the layers and keep the tool's own hooks", async () => {
    const dir = repo();
    write(dir, config, JSON.stringify(tool === "cursor" ? { version: 1, hooks: { afterFileEdit: [{ command: "echo mine" }] } } : { hooks: { Notification: [{ hooks: [{ type: "command", command: "echo mine" }] }] } }));
    await run(initArgs(false), { cwd: dir, ...yes });
    const on = await run(["flow", "on", "--yes"], { cwd: dir, ...yes });
    expect(on.output).toMatch(/Not enforced by/);
    for (const path of flowOnly) expect(existsSync(join(dir, path)), path).toBe(true);
    expect(allCommands(readFileSync(join(dir, config), "utf8")).join("\n")).toMatch(/guard/);
    await run(["flow", "off", "--yes"], { cwd: dir, ...yes });
    for (const path of flowOnly) expect(existsSync(join(dir, path)), path).toBe(false);
    const text = readFileSync(join(dir, config), "utf8");
    expect(allCommands(text).join("\n")).not.toMatch(/guard/);
    expect(text).toContain("echo mine");
  });
});

describe("several adapters at once", () => {
  it("init takes a comma-separated list and installs each, with each tool's next step", async () => {
    const dir = repo();
    const out = await run(["init", "--adapter", "codex,cursor,gemini"], { cwd: dir, ...yes });
    expect(out.code).toBe(0);
    expect(out.output).toContain("(adapter: codex, cursor, gemini)");
    for (const path of [".codex/hooks.json", ".cursor/hooks.json", ".gemini/settings.json", "GEMINI.md"]) expect(existsSync(join(dir, path)), path).toBe(true);
    expect(out.output).toMatch(/Codex[\s\S]*Cursor[\s\S]*Gemini CLI/);
    expect((await run(["doctor"], { cwd: dir, ...yes })).code).toBe(0);
  });
  it("refuses an unknown name and `none` mixed with a tool", async () => {
    expect((await run(["init", "--adapter", "codex,vim"], { cwd: tempDir(), ...yes })).output).toContain("Unknown adapter: vim");
    expect((await run(["init", "--adapter", "none,codex"], { cwd: tempDir(), ...yes })).code).toBe(1);
  });
  it("the interactive question accepts several numbers", async () => {
    const dir = repo();
    const out = await run(["init"], { cwd: dir, ask: async () => "3,5" });
    expect(out.output).toContain("(adapter: codex, gemini)");
  });
  it("GEMINI.md the user already has keeps its text and gains the import", async () => {
    const dir = repo();
    write(dir, "GEMINI.md", "# Mine\nUse tabs.\n");
    await run(["init", "--adapter", "gemini"], { cwd: dir, ...yes });
    const text = readFileSync(join(dir, "GEMINI.md"), "utf8");
    expect(text).toContain("Use tabs.");
    expect(text).toContain("@AGENTS.md");
  });
});

void cpSync;

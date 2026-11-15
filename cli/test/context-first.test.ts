// Groundwork 2.0: the context layer is the product and the default install. The development flow
// is an add-on: `init --flow` or `flow on`. A 1.x install upgrades with the flow on and loses nothing.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { cli, commit, coreDir, git, install, read, repo, tempDir, write } from "./support.js";
import { readCore } from "../src/core.js";
import { isContextFile, layerOf, planInit } from "../src/init.js";
import { fingerprint } from "../src/manifest.js";
import { run } from "../src/index.js";
import { VERSION } from "../src/version.js";

const core = readCore(coreDir);
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

// The flow's vocabulary. A context-only install must not use any of it.
const FLOW_WORDS = /\bcards?\b|\broles?\b|approv/i;

function filesUnder(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === ".git" || name === "node_modules") return [];
    return statSync(path).isDirectory() ? filesUnder(path, root) : [relative(root, path).split("\\").join("/")];
  });
}

describe("the default install is the context layer", () => {
  it("installs exactly project memory: handoff, map, decisions, lessons, journal, their library and hooks", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    expect(filesUnder(dir).filter((path) => path !== ".groundwork/.manifest.json").sort()).toEqual(
      [
        ".gitattributes",
        ".groundwork/.gitignore",
        ".groundwork/DECISIONS.md",
        ".groundwork/HANDOFF.md",
        ".groundwork/JOURNAL.md",
        ".groundwork/LESSONS.md",
        ".groundwork/MAP.md",
        ".groundwork/commands/gw.md",
        ".groundwork/config.json",
        ".groundwork/config.schema.json",
        ".groundwork/decisions/.gitkeep",
        ".groundwork/hooks/checkpoint.mjs",
        ".groundwork/hooks/session-start.mjs",
        ".groundwork/lib/brief.mjs",
        ".groundwork/lib/checkpoint.mjs",
        ".groundwork/lib/compact.mjs",
        ".groundwork/lib/freshness.mjs",
        ".groundwork/lib/git.mjs",
        ".groundwork/lib/memory.mjs",
        ".groundwork/memory.md",
        ".groundwork/templates/AGENTS.md",
        ".groundwork/templates/decision.md",
        "AGENTS.md",
      ].sort(),
    );
  });

  it("records the choice in config.json, with the budgets and no flow settings", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    expect(config).toEqual({
      $schema: "./config.schema.json",
      version: VERSION,
      flow: false,
      tokenBudget: 2000,
      budgets: { brief: 1500, handoff: 600, map: 800, decisions: 600, lessons: 1200, journal: 2500 },
      staleAfterDays: 14,
      nudge: true,
    });
    const schema = JSON.parse(read(dir, ".groundwork/config.schema.json"));
    for (const key of Object.keys(config)) expect(schema.properties, key).toHaveProperty(key);
    expect(Object.keys(schema.properties.budgets.properties)).toEqual(Object.keys(config.budgets));
  });

  it.each(["none", "claude-code", "opencode"])("no installed file mentions cards, roles or approvals (adapter: %s)", async (adapter) => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", adapter);
    const leaks = filesUnder(dir).flatMap((path) =>
      read(dir, path)
        .split("\n")
        .map((line, i) => ({ line, at: `${path}:${i + 1}` }))
        .filter(({ line }) => FLOW_WORDS.test(line))
        .map(({ line, at }) => `${at}: ${line.trim().slice(0, 100)}`),
    );
    expect(leaks).toEqual([]);
  });

  it("no text a session is given mentions them either: the brief, the hooks' messages, status, doctor, init", async () => {
    const dir = repo();
    const init = await cli(dir, "init", "--adapter", "claude-code");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: add Groundwork");
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    commit(dir, "a.txt", "a", "feat: a");
    const { onEvent, COMPACT_INSTRUCTIONS } = await import(pathToFileURL(join(dir, ".groundwork/hooks/checkpoint.mjs")).href);
    const texts = {
      init: init.output,
      brief: (await cli(dir, "brief")).output,
      status: (await cli(dir, "status")).output,
      doctor: (await cli(dir, "doctor")).output,
      stop: onEvent(dir, "stop", { tool: "test-tool" }).say,
      compact: COMPACT_INSTRUCTIONS,
    };
    for (const [name, text] of Object.entries(texts)) {
      expect(text, name).toBeTruthy();
      expect(text, name).not.toMatch(FLOW_WORDS);
    }
  });

  it("the Claude Code adapter gets the memory hooks, the /gw skill, and no guard, recorder or subagents", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "claude-code");
    const hooks = JSON.parse(read(dir, ".claude/settings.json")).hooks;
    expect(Object.keys(hooks).sort()).toEqual(["PreCompact", "SessionEnd", "SessionStart", "Stop"]);
    expect(readdirSync(join(dir, ".claude/skills"))).toEqual(["gw"]);
    expect(existsSync(join(dir, ".claude/agents"))).toBe(false);
    expect(read(dir, "CLAUDE.md")).toBe("@AGENTS.md\n\n## Claude Code\nEach session starts with the project brief from .groundwork/ (a hook prints it). /gw resumes from it and saves.\n");
    expect((await cli(dir, "doctor")).code).toBe(0);
  });

  it("the OpenCode adapter gets the memory plugin and the /gw command only", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "opencode");
    expect(filesUnder(join(dir, ".opencode")).sort()).toEqual(["commands/gw.md", "plugins/groundwork-memory.js"]);
    expect((await cli(dir, "doctor")).code).toBe(0);
  });

  it("without an adapter, AGENTS.md says to run the brief first", async () => {
    const dir = tempDir();
    const { output } = await cli(dir, "init", "--adapter", "none");
    expect(read(dir, "AGENTS.md")).toMatch(/Start every session with `npx groundwork-ai brief`/);
    expect(output).toContain("Next: ask your AI tool to run `npx groundwork-ai brief`");
    expect(output).toContain("npx groundwork-ai flow on");
  });

  it("a project's own AGENTS.md is kept, and gets one line that leads to the brief", async () => {
    const dir = tempDir();
    write(dir, "AGENTS.md", "# Mine\n\nMy rules.\n");
    await cli(dir, "init", "--adapter", "none");
    expect(read(dir, "AGENTS.md")).toBe(
      "# Mine\n\nMy rules.\nRun `npx groundwork-ai brief` first: it prints this project's memory (.groundwork/HANDOFF.md and more). Then follow .groundwork/memory.md.\n",
    );
    // And uninstall takes exactly that line out again.
    await run(["uninstall", "--keep-state"], { cwd: dir, ask: async () => "n" });
    expect(read(dir, "AGENTS.md")).toBe("# Mine\n\nMy rules.\n");
  });

  it("the context layer's own command keeps the shape adapters and agents rely on", () => {
    const gw = core["context/commands/gw.md"];
    expect(gw).toMatch(/^---\nname: gw\ndescription: .+\n---\n/);
    for (const heading of ["## Purpose", "## Steps", "## Writes", "## Must not"]) expect(gw).toContain(heading);
    expect(gw).toContain("npx groundwork-ai brief");
    expect(gw).toContain("npx groundwork-ai checkpoint");
  });
});

describe("the flow sits on top of the context layer", () => {
  it("init --flow installs everything the default does, plus the flow", () => {
    const paths = (flow: boolean) => planInit(core, "none", undefined, flow).map((f) => f.path);
    const context = paths(false);
    const flow = paths(true);
    for (const path of context) expect(flow, path).toContain(path);
    for (const path of [".groundwork/workflow.md", ".groundwork/commands/gw-next.md", ".groundwork/roles/tester.md", ".groundwork/guards/run.mjs", ".groundwork/hooks/user-prompt.mjs", ".groundwork/SPEC.md", ".groundwork/cards/.gitkeep"]) {
      expect(flow, path).toContain(path);
      expect(context, path).not.toContain(path);
    }
  });

  it("the shared files are the same in both installs; only five differ", () => {
    const byPath = (flow: boolean) => Object.fromEntries(planInit(core, "none", "x", flow).map((f) => [f.path, f.content]));
    const context = byPath(false);
    const flow = byPath(true);
    const differing = Object.keys(context).filter((path) => context[path] !== flow[path]);
    expect(differing.sort()).toEqual([
      ".groundwork/.gitignore",
      ".groundwork/HANDOFF.md",
      ".groundwork/JOURNAL.md",
      ".groundwork/commands/gw.md",
      ".groundwork/config.json",
      ".groundwork/config.schema.json",
      ".groundwork/templates/AGENTS.md",
      "AGENTS.md",
    ]);
  });

  it("every core file belongs to exactly one layer", () => {
    for (const path of Object.keys(core)) {
      const inContext = Object.keys(layerOf(core, false)).includes(path.replace(/^context\//, ""));
      const inFlow = Object.keys(layerOf(core, true)).includes(path);
      if (path.startsWith("context/")) expect(inFlow, path).toBe(false);
      else if (isContextFile(path)) expect(inContext && inFlow, path).toBe(true);
      else expect(inFlow, path).toBe(true);
    }
    // The library and the hooks that load and save memory are never flow-only.
    for (const path of Object.keys(core).filter((p) => p.startsWith("lib/"))) expect(isContextFile(path), path).toBe(true);
    expect(isContextFile("hooks/user-prompt.mjs")).toBe(false);
    expect(isContextFile("guards/run.mjs")).toBe(false);
  });

  it("init --flow records flow: true and wires the guard, as 1.0 did", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--flow", "--adapter", "claude-code");
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    expect(config).toMatchObject({ flow: true, setup: "pending", approvalMode: "per-card", guards: ["no-ai-trailers"], enforce: { commitGate: true, protectHarness: true } });
    const hooks = JSON.parse(read(dir, ".claude/settings.json")).hooks;
    expect(Object.keys(hooks).sort()).toEqual(["PreCompact", "PreToolUse", "SessionEnd", "SessionStart", "Stop", "UserPromptSubmit"]);
    expect(readdirSync(join(dir, ".claude/skills")).sort()).toEqual(["gw", "gw-approve", "gw-reject"]);
    expect((await cli(dir, "doctor")).code).toBe(0);
  });

  it("init on an installed project keeps its layers, and points --flow at `flow on`", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    const again = await cli(dir, "init", "--adapter", "none");
    expect(again.output).toMatch(/already up to date/);
    const withFlow = await cli(dir, "init", "--flow", "--adapter", "none");
    expect(withFlow.code).toBe(1);
    expect(withFlow.output).toContain("npx groundwork-ai flow on");
    expect(existsSync(join(dir, ".groundwork/workflow.md"))).toBe(false);
    // And a flow project stays one when init is run again without the flag.
    const flowDir = tempDir();
    await cli(flowDir, "init", "--flow", "--adapter", "none");
    rmSync(join(flowDir, ".groundwork/workflow.md"));
    await cli(flowDir, "init", "--adapter", "none");
    expect(existsSync(join(flowDir, ".groundwork/workflow.md"))).toBe(true);
  });
});

describe("groundwork flow", () => {
  async function contextProject(adapter = "claude-code"): Promise<string> {
    const dir = repo();
    await cli(dir, "init", "--adapter", adapter);
    if (adapter === "claude-code") await cli(dir, "init", "--adapter", "opencode");
    return dir;
  }

  it("shows whether the flow is on", async () => {
    const dir = await contextProject("none");
    expect((await cli(dir, "flow")).output).toMatch(/^Flow: off\./);
    expect((await cli(dir, "flow", "sideways")).code).toBe(1);
    expect((await cli(dir, "flow", "off")).output).toBe("The flow is already off.");
  });

  it("changes nothing without a yes when nobody can answer", async () => {
    const dir = await contextProject("none");
    const { code, output } = await run(["flow", "on"], { cwd: dir, interactive: false });
    expect(code).toBe(1);
    expect(output).toMatch(/Nothing was changed\. Run `npx groundwork-ai flow on --yes`/);
    expect(existsSync(join(dir, ".groundwork/workflow.md"))).toBe(false);
  });

  it("on: installs the flow, adds its settings without touching the project's own, and rewires the adapters", async () => {
    const dir = await contextProject();
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config, budgets: { ...config.budgets, handoff: 900 }, staleAfterDays: 3 }, null, 2));
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const handoff = read(dir, ".groundwork/HANDOFF.md");
    const agents = read(dir, "AGENTS.md");

    const { code, output } = await cli(dir, "flow", "on", "--yes");
    expect(code).toBe(0);
    expect(output).toMatch(/^The flow is now on\./);
    const after = JSON.parse(read(dir, ".groundwork/config.json"));
    expect(after).toMatchObject({ flow: true, setup: "pending", approvalMode: "per-card", staleAfterDays: 3, guards: ["no-ai-trailers"] });
    expect(after.budgets.handoff).toBe(900);
    for (const path of [".groundwork/workflow.md", ".groundwork/guards/run.mjs", ".groundwork/roles/reviewer.md", ".groundwork/SPEC.md", ".groundwork/rules/tester.md", ".claude/agents/gw-tester.md", ".claude/skills/gw-approve/SKILL.md", ".opencode/plugins/groundwork-guards.js"]) {
      expect(existsSync(join(dir, path)), path).toBe(true);
    }
    expect(existsSync(join(dir, ".opencode/plugins/groundwork-memory.js"))).toBe(false);
    expect(read(dir, ".groundwork/commands/gw.md")).toBe(core["commands/gw.md"]);
    const hooks = JSON.parse(read(dir, ".claude/settings.json")).hooks;
    expect(hooks.PreToolUse[0].hooks[0].onFailure).toBe("block");
    expect(hooks.SessionStart).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
    // The project's own memory is untouched.
    expect(read(dir, ".groundwork/HANDOFF.md")).toBe(handoff);
    expect(read(dir, "AGENTS.md")).toBe(agents);
    expect((await cli(dir, "doctor")).code).toBe(0);
    expect((await cli(dir, "flow")).output).toMatch(/^Flow: on\./);
  });

  it("off: removes Groundwork's flow files, keeps what the project made and what it edited", async () => {
    const dir = repo();
    await cli(dir, "init", "--flow", "--adapter", "claude-code");
    write(dir, ".groundwork/cards/1.1-list.md", "---\nid: 1.1\ntitle: List\nphase: 1\nstatus: todo\ndepends_on: []\n---\n");
    write(dir, ".groundwork/SPEC.md", "# Spec\nA book club voting page.\n");
    write(dir, ".groundwork/roles/tester.md", `${read(dir, ".groundwork/roles/tester.md")}\nOur own addition.\n`);
    write(dir, ".claude/settings.json", JSON.stringify({ ...JSON.parse(read(dir, ".claude/settings.json")), permissions: { allow: ["Bash(npm test)"] } }, null, 2));

    const { code, output } = await cli(dir, "flow", "off", "--yes");
    expect(code).toBe(0);
    expect(output).toContain("keep       .groundwork/roles/tester.md (you changed it; it is no longer used)");
    for (const gone of [".groundwork/workflow.md", ".groundwork/guards/run.mjs", ".groundwork/roles/reviewer.md", ".groundwork/commands/gw-next.md", ".groundwork/hooks/user-prompt.mjs", ".claude/agents/gw-tester.md", ".claude/skills/gw-approve/SKILL.md"]) {
      expect(existsSync(join(dir, gone)), gone).toBe(false);
    }
    for (const kept of [".groundwork/cards/1.1-list.md", ".groundwork/SPEC.md", ".groundwork/roles/tester.md", ".groundwork/rules/tester.md", ".groundwork/lib/memory.mjs", ".groundwork/hooks/checkpoint.mjs"]) {
      expect(existsSync(join(dir, kept)), kept).toBe(true);
    }
    expect(read(dir, ".groundwork/SPEC.md")).toBe("# Spec\nA book club voting page.\n");
    expect(read(dir, ".groundwork/commands/gw.md")).toBe(core["context/commands/gw.md"]);
    const settings = JSON.parse(read(dir, ".claude/settings.json"));
    expect(Object.keys(settings.hooks).sort()).toEqual(["PreCompact", "SessionEnd", "SessionStart", "Stop"]);
    expect(settings.permissions).toEqual({ allow: ["Bash(npm test)"] });
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    expect(config.flow).toBe(false);
    expect(config.approvalMode).toBe("per-card"); // kept, so turning it on again continues where it stopped
    expect((await cli(dir, "doctor")).code).toBe(0);
    expect((await cli(dir, "brief")).output).not.toMatch(/gw-approve/);

    // And back on: the card is still there.
    expect((await cli(dir, "flow", "on", "--yes")).code).toBe(0);
    expect((await cli(dir, "status")).output).toContain("Cards:         1 to do");
  });

  it("asks before turning the flow off, and takes anything but yes as no", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--flow", "--adapter", "none");
    const asked: string[] = [];
    const { output } = await run(["flow", "off"], { cwd: dir, ask: async (q) => (asked.push(q), "") });
    expect(asked[0]).toMatch(/Turn the flow off\?.*commits are no longer checked or approved/);
    expect(output).toBe("Nothing was changed.");
    expect(existsSync(join(dir, ".groundwork/guards/run.mjs"))).toBe(true);
  });
});

describe("the guard keeps the agent from weakening 2.0's setup", () => {
  async function guarded() {
    const dir = tempDir();
    await cli(dir, "init", "--flow", "--adapter", "claude-code");
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config, setup: "done" }, null, 2));
    const { evaluate } = await import(pathToFileURL(join(dir, ".groundwork/guards/run.mjs")).href);
    const guardsDir = join(dir, ".groundwork/guards");
    const bash = (command: string) => evaluate("claude-code", { tool_name: "Bash", tool_input: { command } }, guardsDir);
    const writeFile = (path: string, content: string) => evaluate("claude-code", { tool_name: "Write", tool_input: { file_path: join(dir, path), content } }, guardsDir);
    return { dir, bash, writeFile, config };
  }

  it("refuses the agent's `flow off`, and lets it turn nothing else off through config.json", async () => {
    const { bash, writeFile, config } = await guarded();
    for (const command of ["npx groundwork-ai flow off", "npx groundwork-ai@2.0.0 flow off --yes", "groundwork flow off"]) {
      const result = await bash(command);
      expect(result.block, command).toBe(true);
      expect(result.reason).toMatch(/Turning the flow off is the human's call/);
    }
    expect((await bash("npx groundwork-ai flow")).block).toBe(false);
    const result = await writeFile(".groundwork/config.json", JSON.stringify({ ...config, setup: "done", flow: false }));
    expect(result.block).toBe(true);
    expect(result.reason).toMatch(/turn the flow off/);
  });

  it("locks the library the hooks import, like the hooks themselves", async () => {
    const { bash, writeFile } = await guarded();
    expect((await writeFile(".groundwork/lib/memory.mjs", "export {}")).block).toBe(true);
    expect((await writeFile(".groundwork/hooks/checkpoint.mjs", "")).block).toBe(true);
    expect((await bash("rm -rf .groundwork/lib")).block).toBe(true);
    expect((await bash("echo x > .groundwork/lib/brief.mjs")).block).toBe(true);
  });

  it("lets the agent use the memory commands and write the memory files", async () => {
    const { bash, writeFile } = await guarded();
    for (const command of ['npx groundwork-ai checkpoint --now "tests pass" --next "review"', "npx groundwork-ai brief --json", 'npx groundwork-ai decide "Use SQLite"', "npx groundwork-ai compact", "npx groundwork-ai worker start a --goal b"]) {
      expect((await bash(command)).block, command).toBe(false);
    }
    expect((await writeFile(".groundwork/HANDOFF.md", "# Handoff\n")).block).toBe(false);
    expect((await writeFile(".groundwork/MAP.md", "# Map\n")).block).toBe(false);
  });
});

describe("upgrading a 1.0 install", () => {
  const OLD_SETTINGS = {
    permissions: { allow: ["Bash(npm test)"] },
    hooks: {
      SessionStart: [{ matcher: "startup|clear|compact", hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/session-start.mjs" "$CLAUDE_PROJECT_DIR"' }] }],
      PreToolUse: [{ matcher: "Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/guards/run.mjs" claude-code', onFailure: "block" }] }],
      UserPromptSubmit: [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/user-prompt.mjs" "$CLAUDE_PROJECT_DIR"' }] }],
    },
  };
  const STATE: Record<string, string> = {
    ".groundwork/SPEC.md": "# Spec\nA book club voting page.\n\n## Codebase map\n- `src/` the app (found)\n",
    ".groundwork/HANDOFF.md": "# Handoff\n\n- **Phase:** 1 Voting\n- **Current card:** 1.2 Voting\n- **Status:** implementing\n- **Last step:** tests written\n- **Next step:** make them pass\n- **Failing checks:** none\n- **Notes:**\n",
    ".groundwork/LESSONS.md": "# Lessons\n\n### L-001 · No trailers\n- Level: RULE\n",
    ".groundwork/JOURNAL.md": "# Journal\n\n## Phase 0: Setup (2026-10-01)\n- **Shipped:** the skeleton.\n",
    ".groundwork/cards/1.1-list.md": "---\nid: 1.1\ntitle: List\nphase: 1\nstatus: todo\ndepends_on: []\n---\n## Goal\nx\n",
    ".groundwork/decisions/0001-db.md": "---\nid: 0001\ntitle: SQLite\nstatus: accepted\ndate: 2026-10-01\n---\n",
    ".groundwork/evidence/1.1/test-output.txt": "12 passed\n",
    "AGENTS.md": "# My project\n\nRead .groundwork/HANDOFF.md first and follow .groundwork/workflow.md.\n\n## Rules\n- L-001: no trailers\n",
  };

  // A project as 1.0.0 left it: its config (no `flow` key), its session-start hook, its three
  // Claude Code hooks, a bullet handoff, and none of 2.0's files.
  async function v1Project(): Promise<string> {
    const dir = repo();
    await cli(dir, "init", "--flow", "--adapter", "claude-code");
    for (const path of [".groundwork/lib", ".groundwork/memory.md", ".groundwork/hooks/checkpoint.mjs", ".groundwork/MAP.md", ".groundwork/DECISIONS.md", ".groundwork/guards/lib/orientation.mjs"]) {
      rmSync(join(dir, path), { recursive: true, force: true });
    }
    const config = { ...JSON.parse(fixture("config-1.0.0.json")), version: "1.0.0", setup: "done", commands: { install: "npm ci", test: "npm test", lint: "", build: "", run: "" } };
    write(dir, ".groundwork/config.json", JSON.stringify(config, null, 2) + "\n");
    write(dir, ".groundwork/hooks/session-start.mjs", fixture("session-start-1.0.0.mjs"));
    write(dir, ".claude/settings.json", JSON.stringify(OLD_SETTINGS, null, 2) + "\n");
    for (const [path, text] of Object.entries(STATE)) write(dir, path, text);
    // The manifest says Groundwork wrote the 1.0 hook, so it isn't mistaken for the user's edit.
    const manifestPath = join(dir, ".groundwork/.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.version = "1.0.0";
    manifest.files[".groundwork/hooks/session-start.mjs"] = fingerprint(fixture("session-start-1.0.0.mjs"));
    for (const path of Object.keys(manifest.files)) if (!existsSync(join(dir, path))) delete manifest.files[path];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[setup] Groundwork 1.0");
    return dir;
  }

  it("the fixture really is a 1.0 config: no flow key, no budgets", () => {
    const config = JSON.parse(fixture("config-1.0.0.json"));
    expect(config).not.toHaveProperty("flow");
    expect(config).not.toHaveProperty("budgets");
    expect(config.approvalMode).toBe("per-card");
  });

  it("keeps the flow on and loses nothing", async () => {
    const dir = await v1Project();
    const { code, output } = await cli(dir, "upgrade", "--yes");
    expect(code).toBe(0);
    expect(output).toMatch(/^Upgraded Groundwork from version 1\.0\.0 to 2\.0\.0\./);
    expect(output).toContain("The flow you were using stays on, unchanged.");
    // Every byte of the project's own state.
    for (const [path, text] of Object.entries(STATE)) expect(read(dir, path), path).toBe(text);
    // The flow's files and settings.
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    expect(config).toMatchObject({
      version: "2.0.0",
      flow: true,
      setup: "done",
      approvalMode: "per-card",
      guards: ["no-ai-trailers"],
      enforce: { commitGate: true, protectHarness: true },
      commands: { install: "npm ci", test: "npm test" },
      budgets: { brief: 1500, handoff: 600 },
      staleAfterDays: 14,
    });
    for (const path of [".groundwork/workflow.md", ".groundwork/commands/gw-next.md", ".groundwork/roles/tester.md", ".groundwork/guards/run.mjs", ".groundwork/guards/lib/commit-gate.mjs", ".claude/agents/gw-reviewer.md", ".claude/skills/gw-approve/SKILL.md"]) {
      expect(existsSync(join(dir, path)), path).toBe(true);
    }
    expect(read(dir, ".groundwork/commands/gw.md")).toBe(core["commands/gw.md"]);
  });

  it("adds the context layer underneath: the library, the hooks, a map and a decisions index", async () => {
    const dir = await v1Project();
    const { output } = await cli(dir, "upgrade", "--yes");
    for (const path of [".groundwork/lib/memory.mjs", ".groundwork/lib/brief.mjs", ".groundwork/hooks/checkpoint.mjs", ".groundwork/memory.md", ".groundwork/MAP.md", ".groundwork/DECISIONS.md", ".groundwork/guards/lib/orientation.mjs"]) {
      expect(existsSync(join(dir, path)), path).toBe(true);
    }
    expect(read(dir, ".groundwork/hooks/session-start.mjs")).toBe(core["hooks/session-start.mjs"]);
    expect(existsSync(join(dir, ".groundwork/hooks/session-start.mjs.new"))).toBe(false);
    // The index is generated from the decisions the project already had.
    expect(read(dir, ".groundwork/DECISIONS.md")).toContain("| 0001 | SQLite | accepted | 2026-10-01 |");
    expect(output).toContain("add        flow: true to .groundwork/config.json");
    expect(output).toContain("add        budgets: (defaults) to .groundwork/config.json");
    expect(output).toMatch(/New in 2\.0: project memory/);
  });

  it("rewires Claude Code without doubling a hook or dropping the user's settings", async () => {
    const dir = await v1Project();
    await cli(dir, "upgrade", "--yes");
    const settings = JSON.parse(read(dir, ".claude/settings.json"));
    expect(settings.permissions).toEqual(OLD_SETTINGS.permissions);
    expect(Object.keys(settings.hooks).sort()).toEqual(["PreCompact", "PreToolUse", "SessionEnd", "SessionStart", "Stop", "UserPromptSubmit"]);
    for (const event of Object.keys(settings.hooks)) expect(settings.hooks[event], event).toHaveLength(1);
    expect(settings.hooks.SessionStart[0].matcher).toBe("startup|resume|clear|compact");
    expect(settings.hooks.PreToolUse[0]).toEqual(OLD_SETTINGS.hooks.PreToolUse[0]);
  });

  it("the guards behave as before: an untagged commit is refused, harness files are locked", async () => {
    const dir = await v1Project();
    await cli(dir, "upgrade", "--yes");
    const { evaluate } = await import(pathToFileURL(join(dir, ".groundwork/guards/run.mjs")).href);
    const guardsDir = join(dir, ".groundwork/guards");
    const bash = (command: string) => evaluate("claude-code", { tool_name: "Bash", tool_input: { command } }, guardsDir);
    const untagged = await bash('git commit -m "Add voting"');
    expect(untagged.block).toBe(true);
    expect(untagged.reason).toMatch(/^\[commit-gate\]/);
    expect((await bash("rm -rf .groundwork/guards")).block).toBe(true);
    expect((await bash("npx groundwork-ai uninstall")).block).toBe(true);
    expect((await bash("npm test")).block).toBe(false);
  });

  it("the old handoff still reads: the brief says it is unstamped, status and the card line are as before", async () => {
    const dir = await v1Project();
    await cli(dir, "upgrade", "--yes");
    const brief = (await cli(dir, "brief")).output;
    expect(brief).toMatch(/Handoff: UNSTAMPED: it was never checkpointed/);
    expect(brief).toContain("Groundwork: card 1.2 Voting is being built.");
    expect(brief).toContain("make them pass");
    expect(brief).toContain("- 0001 SQLite");
    const status = (await cli(dir, "status")).output;
    expect(status).toContain("Current card:  1.2 Voting");
    expect(status).toContain("Next step:     make them pass");
    expect(status).toContain("Next ready:    1.1 List");
    // doctor doesn't fail an upgraded project over its old handoff; it says how to convert it.
    const doctor = await cli(dir, "doctor");
    expect(doctor.code).toBe(0);
    expect(doctor.output).toMatch(/layout from before 2\.0/);
  });

  it("a first checkpoint converts the old handoff and stamps it, keeping the flow's fields", async () => {
    const dir = await v1Project();
    await cli(dir, "upgrade", "--yes");
    expect((await cli(dir, "checkpoint")).code).toBe(0);
    const text = read(dir, ".groundwork/HANDOFF.md");
    expect(text).toContain("## Now\ntests written");
    expect(text).toContain("## Next\nmake them pass");
    expect(text).toContain("## Flow\n- **Phase:** 1 Voting\n- **Current card:** 1.2 Voting\n- **Status:** implementing");
    expect((await cli(dir, "brief")).output).toMatch(/Handoff: FRESH/);
    // The phase recap the flow wrote stays in the journal, with the new entry after it.
    expect(read(dir, ".groundwork/JOURNAL.md")).toMatch(/## Phase 0: Setup[\s\S]*## \d{4}-\d\d-\d\d \d\d:\d\d UTC · main @/);
  });

  it("a second upgrade has nothing left to do", async () => {
    const dir = await v1Project();
    await cli(dir, "upgrade", "--yes");
    expect((await cli(dir, "upgrade", "--yes")).output).toBe("Groundwork is already up to date (2.0.0). Nothing to change.");
  });

  it("upgrading a context-only install keeps it context-only", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "claude-code");
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config, version: "1.9.0" }, null, 2));
    rmSync(join(dir, ".groundwork/lib/compact.mjs"));
    const { code, output } = await cli(dir, "upgrade", "--yes");
    expect(code).toBe(0);
    expect(output).toContain("create     .groundwork/lib/compact.mjs");
    expect(output).not.toMatch(FLOW_WORDS);
    expect(existsSync(join(dir, ".groundwork/workflow.md"))).toBe(false);
    expect(JSON.parse(read(dir, ".groundwork/config.json")).flow).toBe(false);
  });
});

describe("recording decisions and lessons outside any loop", () => {
  it("decide creates the next numbered record from the template and updates the index", async () => {
    const dir = await install(repo());
    const first = await cli(dir, "decide", "Use SQLite: one file, no server", "--status", "accepted");
    expect(first.code).toBe(0);
    expect(first.output).toMatch(/Created \.groundwork\/decisions\/0001-use-sqlite-one-file-no-server\.md \(accepted\)/);
    const record = read(dir, ".groundwork/decisions/0001-use-sqlite-one-file-no-server.md");
    expect(record).toMatch(/^---\nid: 0001\ntitle: "Use SQLite: one file, no server"\nstatus: accepted\ndate: \d{4}-\d\d-\d\d\n---\n## Context/);
    await cli(dir, "decide", "Host on a VPS");
    expect(read(dir, ".groundwork/DECISIONS.md")).toMatch(/\| 0001 \| Use SQLite: one file, no server \| accepted \|[^\n]*\n\| 0002 \| Host on a VPS \| proposed \|/);
    expect((await cli(dir, "decide")).code).toBe(1);
    expect((await cli(dir, "decide", "x", "--status", "maybe")).code).toBe(1);
  });

  it("lesson adds the next entry, and says where a RULE has to go", async () => {
    const dir = await install(repo());
    const note = await cli(dir, "lesson", "Run migrations before the tests", "--origin", "stale schema in CI");
    expect(note.output).toBe("Added L-001 to .groundwork/LESSONS.md as a NOTE.");
    const rule = await cli(dir, "lesson", "Never edit generated files", "--level", "rule");
    expect(rule.output).toMatch(/Added L-002 .* as a RULE\. Copy it under Rules in AGENTS\.md with its ID \(L-002\)/);
    expect(read(dir, ".groundwork/LESSONS.md")).toMatch(/### L-001 · Run migrations before the tests\n- Level: NOTE\n- Origin: stale schema in CI \(\d{4}-\d\d-\d\d\)/);
    // doctor says when a RULE isn't in AGENTS.md, where it would be in context.
    expect((await cli(dir, "doctor")).output).toMatch(/L-002 is a RULE, but AGENTS\.md doesn't cite it/);
    expect((await cli(dir, "lesson")).code).toBe(1);
  });
});

describe("the package", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  it("is 2.0.0 and describes project memory first", () => {
    expect(pkg.version).toBe("2.0.0");
    expect(pkg.name).toBe("groundwork-ai");
    expect(pkg.bin).toEqual({ groundwork: "dist/bin.js" });
    expect(pkg.description).toMatch(/^Project memory for coding agents/);
    for (const keyword of ["agent-memory", "context-management", "handoff", "claude-code", "opencode"]) expect(pkg.keywords).toContain(keyword);
  });

  it("help lists the memory commands first, and the flow's apart", async () => {
    const { output } = await run(["--help"]);
    expect(output).toMatch(/^groundwork 2\.0\.0: project memory for coding agents\./);
    const names = [...output.matchAll(/^\s{2}(\w+)\s{2}/gm)].map((m) => m[1]);
    expect(names.slice(0, 4)).toEqual(["init", "brief", "checkpoint", "status"]);
    for (const name of ["decide", "lesson", "index", "worker", "compact", "doctor", "upgrade", "adapter", "flow", "uninstall", "mode", "check", "reassess", "migrate", "retro"]) {
      expect(names, name).toContain(name);
    }
    expect(output.indexOf("With the flow on")).toBeLessThan(output.indexOf("  mode"));
    expect(output.indexOf("  flow")).toBeLessThan(output.indexOf("With the flow on"));
  });

  it("V2.md states the contract and names every command the CLI has", async () => {
    const v2 = readFileSync(new URL("../../V2.md", import.meta.url), "utf8");
    const { output } = await run(["--help"]);
    for (const name of [...output.matchAll(/^\s{2}(\w+)\s{2}/gm)].map((m) => m[1])) expect(v2, name).toMatch(new RegExp(`\`${name}\\b`));
    for (const verdict of ["fresh", "behind", "diverged", "stale", "unstamped"]) expect(v2).toContain(`**${verdict}**`);
    for (const heading of ["## What 2.0 guarantees", "## Installed files", "## Handoff schema", "## Freshness", "## Hooks", "## Budgets", "## Parallel workers", "## Upgrading from 1.x", "## The flow", "## Adapter contract", "## Known limitations"]) {
      expect(v2, heading).toContain(heading);
    }
  });
});

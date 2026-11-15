// Automation at the moments that matter: hooks checkpoint a session when it stops, is compacted or
// ends, and tell the agent to save the handoff where the tool lets a hook speak. They are fast,
// never fail the tool's work, and never ask twice for the same thing.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { cli, commit, coreDir, frontmatter, git, install, read, repo, tempDir, write } from "./support.js";
import { readCore } from "../src/core.js";
import { generateClaudeCode } from "../src/adapters/claude-code.js";
import { generateOpenCode } from "../src/adapters/opencode.js";
import { layerOf } from "../src/init.js";

const core = readCore(coreDir);

// Runs the installed hook as an adapter would: event, project folder, tool name, hook input on stdin.
function hook(dir: string, event: string, input: object = {}, flags: string[] = ["--block-json"]) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [join(dir, ".groundwork/hooks/checkpoint.mjs"), event, dir, "test-tool", ...flags], {
    encoding: "utf8",
    input: JSON.stringify(input),
  });
  return { ...result, ms: Date.now() - started };
}

async function saved(flow = false): Promise<string> {
  const dir = await install(repo(), { flow });
  await cli(dir, "checkpoint", "--now", "Login form renders", "--next", "Wire validation");
  return dir;
}

describe("the stop hook", () => {
  it("says nothing while the handoff is fresh", async () => {
    const result = hook(await saved(), "stop", { session_id: "ses_1" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("asks the agent to save a handoff that is behind, in the shape a blocking stop hook reads", async () => {
    const dir = await saved();
    const sha = commit(dir, "src/login.ts", "x", "feat: login form");
    const result = hook(dir, "stop", { session_id: "ses_1", stop_hook_active: false });
    expect(result.status).toBe(0);
    const answer = JSON.parse(result.stdout);
    expect(answer.decision).toBe("block");
    expect(answer.reason).toMatch(/the project handoff is behind: 1 commit landed after it was written/);
    expect(answer.reason).toContain(`${sha.slice(0, 7)} feat: login form`);
    expect(answer.reason).toContain('npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"');
  });

  it("asks once per commit, never in a loop", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    expect(hook(dir, "stop").stdout).not.toBe("");
    expect(hook(dir, "stop").stdout).toBe(""); // the same commit: already asked
    expect(hook(dir, "stop").stdout).toBe("");
    commit(dir, "b.txt", "b", "feat: b");
    expect(hook(dir, "stop").stdout).not.toBe(""); // a new commit: asked again, once
    expect(hook(dir, "stop").stdout).toBe("");
  });

  it("never asks while the tool is already continuing because of a stop hook", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    expect(hook(dir, "stop", { stop_hook_active: true }).stdout).toBe("");
  });

  it("stops asking once the agent has saved", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    expect(hook(dir, "stop").stdout).not.toBe("");
    await cli(dir, "checkpoint", "--now", "a is merged", "--next", "start b");
    commit(dir, ".groundwork/x.md", "memory only", "chore: save the handoff");
    expect(hook(dir, "stop").stdout).toBe("");
  });

  it("says it in plain text for a tool whose stop hook only prints", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    const result = hook(dir, "stop", {}, []);
    expect(result.stdout).toMatch(/^Groundwork: the project handoff is behind/);
  });

  it("can be told not to speak: nudge false keeps the checkpoint and drops the question", async () => {
    const dir = await saved();
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config, nudge: false }));
    commit(dir, "a.txt", "a", "feat: a");
    expect(hook(dir, "stop").stdout).toBe("");
    expect(read(dir, ".groundwork/JOURNAL.md")).toContain("feat: a");
  });

  it("asks for a first handoff once there is work to lose, and only once", async () => {
    const dir = await install(repo());
    expect(hook(dir, "stop").stdout).toBe(""); // nothing recorded, nothing changed
    write(dir, "src/new.ts", "work in progress");
    expect(JSON.parse(hook(dir, "stop").stdout).reason).toMatch(/the project handoff is still empty/);
    expect(hook(dir, "stop").stdout).toBe("");
  });

  it("checkpoints as it goes: the journal gets the commits, an edited handoff gets its stamp", async () => {
    const dir = await saved();
    commit(dir, "src/login.ts", "x", "feat: login form");
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), read(dir, ".groundwork/HANDOFF.md").replace("Wire validation", "Add the logout button"));
    const result = hook(dir, "stop", { session_id: "ses_9" });
    expect(result.stdout).toBe(""); // the agent edited it: nothing to ask
    expect(read(dir, ".groundwork/JOURNAL.md")).toContain("feat: login form");
    const meta = frontmatter(read(dir, ".groundwork/HANDOFF.md"));
    expect(meta.head).toBe(git(dir, "rev-parse", "HEAD"));
    expect(meta).toMatchObject({ tool: "test-tool", session: "ses_9" });
  });

  it("names the worker's own handoff in a linked worktree", async () => {
    const dir = await saved();
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: handoff");
    const tree = join(tempDir("groundwork-wt-"), "tree");
    git(dir, "worktree", "add", "-q", "-b", "feat/x", tree);
    const reason = JSON.parse(hook(tree, "stop").stdout).reason;
    expect(reason).toMatch(/this worker's handoff \(\.groundwork\/work\/feat-x\/HANDOFF\.md\) is still empty/);
  });
});

describe("the pre-compact and session-end hooks", () => {
  it("pre-compact tells the summary what to keep, and checkpoints", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    const result = hook(dir, "pre-compact", { trigger: "auto" });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^Keep in the summary, in these words: what is in progress right now; the very next step; open questions and blockers;/);
    expect(result.stdout).toContain("npx groundwork-ai checkpoint");
    expect(() => JSON.parse(result.stdout)).toThrow(); // plain text: it is used as instructions, never as a block
    expect(read(dir, ".groundwork/JOURNAL.md")).toContain("feat: a");
  });

  it("session-end checkpoints and says nothing", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    const result = hook(dir, "session-end", { reason: "other" });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(read(dir, ".groundwork/JOURNAL.md")).toContain("feat: a");
  });
});

describe("hooks never get in the way", () => {
  it("exit 0 and print nothing outside a Groundwork project", () => {
    const dir = tempDir();
    for (const event of ["stop", "pre-compact", "session-end"]) {
      const result = spawnSync(process.execPath, [join(coreDir, "hooks/checkpoint.mjs"), event, dir, "test-tool"], { encoding: "utf8", input: "{}" });
      expect(result.status, event).toBe(0);
      expect(result.stdout, event).toBe("");
    }
  });

  it("exit 0 with unreadable input, a broken config, a broken handoff and no git", async () => {
    const dir = await saved();
    const run = (input: string) => spawnSync(process.execPath, [join(dir, ".groundwork/hooks/checkpoint.mjs"), "stop", dir], { encoding: "utf8", input });
    expect(run("not json").status).toBe(0);
    expect(run("").status).toBe(0);
    writeFileSync(join(dir, ".groundwork/config.json"), "{ broken");
    expect(run("{}").status).toBe(0);
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), "\u0000\u0001 not a handoff");
    expect(run("{}").status).toBe(0);
    const plain = tempDir();
    await cli(plain, "init", "--adapter", "none");
    expect(hook(plain, "stop").status).toBe(0);
    expect(hook(plain, "session-end").status).toBe(0);
  });

  it("finish quickly", async () => {
    const dir = await saved();
    commit(dir, "a.txt", "a", "feat: a");
    for (const event of ["stop", "pre-compact", "session-end"]) expect(hook(dir, event).ms, event).toBeLessThan(5000);
  });
});

describe("Claude Code wiring", () => {
  const settings = (flow: boolean) => JSON.parse(generateClaudeCode(layerOf(core, flow), {}, flow)[".claude/settings.json"]).hooks;

  it.each([true, false])("runs the checkpoint hook on Stop, PreCompact and SessionEnd (flow: %s)", (flow) => {
    const hooks = settings(flow);
    expect(hooks.Stop[0].hooks[0].command).toBe('node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/checkpoint.mjs" stop "$CLAUDE_PROJECT_DIR" claude-code --block-json');
    expect(hooks.PreCompact[0].hooks[0].command).toBe('node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/checkpoint.mjs" pre-compact "$CLAUDE_PROJECT_DIR" claude-code');
    expect(hooks.SessionEnd[0].hooks[0].command).toBe('node "$CLAUDE_PROJECT_DIR/.groundwork/hooks/checkpoint.mjs" session-end "$CLAUDE_PROJECT_DIR" claude-code');
  });

  it("memory hooks can't block work: none sets onFailure, each has a short timeout", () => {
    const hooks = settings(true);
    for (const event of ["SessionStart", "Stop", "PreCompact", "SessionEnd"]) {
      for (const entry of hooks[event]) for (const h of entry.hooks) expect(h.onFailure, event).toBeUndefined();
    }
    for (const event of ["Stop", "PreCompact", "SessionEnd"]) expect(hooks[event][0].hooks[0].timeout).toBeLessThanOrEqual(15);
    // SessionEnd's default budget is 1.5 seconds; the timeout raises it.
    expect(hooks.SessionEnd[0].hooks[0].timeout).toBeGreaterThanOrEqual(5);
  });

  it("the guard hook still fails closed with the flow, and isn't installed without it", () => {
    expect(settings(true).PreToolUse[0].hooks[0]).toMatchObject({ command: 'node "$CLAUDE_PROJECT_DIR/.groundwork/guards/run.mjs" claude-code', onFailure: "block" });
    expect(settings(true).UserPromptSubmit).toHaveLength(1);
    expect(Object.keys(settings(false)).sort()).toEqual(["PreCompact", "SessionEnd", "SessionStart", "Stop"]);
  });
});

describe("OpenCode wiring", () => {
  type Hook = (event: Record<string, unknown>) => Promise<void>;

  // Mounts the generated plugin with a mock context, as opencode.test.ts does, plus an event stream.
  async function mount(flow: boolean, events: object[] = [], { withStream = true, withCompaction = true } = {}) {
    const project = await saved(flow);
    const stub = join(project, "node_modules/@opencode/plugin");
    mkdirSync(stub, { recursive: true });
    writeFileSync(join(stub, "package.json"), JSON.stringify({ name: "@opencode/plugin", type: "module", exports: "./index.js" }));
    writeFileSync(join(stub, "index.js"), "export const Plugin = { define: (definition) => definition };\n");
    const name = flow ? ".opencode/plugins/groundwork-guards.js" : ".opencode/plugins/groundwork-memory.js";
    const file = join(project, name);
    mkdirSync(join(project, ".opencode/plugins"), { recursive: true });
    writeFileSync(file, generateOpenCode(layerOf(core, flow), {}, flow)[name]);
    const { default: plugin } = await import(pathToFileURL(file).href);
    const hooks: Record<string, Hook> = {};
    const register = (prefix: string) => async (hookName: string, callback: Hook) => {
      if (!withCompaction && hookName === "compaction") throw new Error("no such hook");
      hooks[`${prefix}.${hookName}`] = callback;
    };
    let subscribed: { types?: string[] } | undefined;
    let drained: () => void = () => {};
    const done = new Promise<void>((resolve) => (drained = resolve));
    const context: Record<string, unknown> = { tool: { hook: register("tool") }, session: { hook: register("session"), get: async () => ({}) } };
    if (withStream) {
      context.event = {
        subscribe: (options: { types?: string[] }) => {
          subscribed = options;
          return (async function* () {
            for (const event of events) yield event;
            drained();
          })();
        },
      };
    }
    const warn = console.warn;
    console.warn = () => {};
    let stop: unknown;
    try {
      stop = await plugin.setup(context);
    } finally {
      console.warn = warn;
    }
    if (withStream) await done;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { project, hooks, plugin, stop, subscribed: () => subscribed };
  }

  it.each([true, false])("the plugin has a string id and a setup function, and returns a way to stop its event loop (flow: %s)", async (flow) => {
    const { plugin, stop, subscribed } = await mount(flow);
    expect(plugin.id).toBe(flow ? "groundwork-guards" : "groundwork-memory");
    expect(typeof stop).toBe("function");
    expect(subscribed()?.types).toEqual(["session.idle"]);
  });

  it("adds the project brief to the system prompt as a text part", async () => {
    const { hooks } = await mount(false);
    const input = { agent: "build", system: [] as { type: string; text: string }[], model: { id: "model-x" } };
    await hooks["session.context"](input);
    expect(input.system).toHaveLength(1);
    expect(input.system[0].type).toBe("text");
    expect(input.system[0].text).toMatch(/^# Project memory: [\s\S]*Next: Wire validation/);
  });

  it("the compaction hook checkpoints and tells the summary what to keep", async () => {
    const { hooks, project } = await mount(false);
    commit(project, "a.txt", "a", "feat: a");
    const event = { sessionID: "ses_1", system: [] as { type: string; text: string }[], messages: [] };
    await hooks["session.compaction"](event);
    expect(event.system).toHaveLength(1);
    expect(event.system[0]).toEqual({ type: "text", text: expect.stringMatching(/^Keep in the summary/) });
    expect(readFileSync(join(project, ".groundwork/JOURNAL.md"), "utf8")).toContain("feat: a");
  });

  it("an idle session is checkpointed, and a reminder to save rides on the next model call, once", async () => {
    // The stream delivers session.idle while the handoff is behind.
    const mounted = await mountBehind();
    const input = { agent: "build", system: [] as { type: string; text: string }[] };
    await mounted.hooks["session.context"](input);
    expect(input.system.map((part) => part.text.slice(0, 60))).toEqual([expect.stringMatching(/^# Project memory/), expect.stringMatching(/^Groundwork: the project handoff is behind/)]);
    const again = { agent: "build", system: [] as { type: string; text: string }[] };
    await mounted.hooks["session.context"](again);
    expect(again.system).toHaveLength(1);
    expect(readFileSync(join(mounted.project, ".groundwork/JOURNAL.md"), "utf8")).toContain("feat: behind");
  });

  // A mounted memory plugin whose project got a commit before the idle event arrived.
  async function mountBehind() {
    const project = await saved();
    commit(project, "behind.txt", "x", "feat: behind");
    const stub = join(project, "node_modules/@opencode/plugin");
    mkdirSync(stub, { recursive: true });
    writeFileSync(join(stub, "package.json"), JSON.stringify({ name: "@opencode/plugin", type: "module", exports: "./index.js" }));
    writeFileSync(join(stub, "index.js"), "export const Plugin = { define: (definition) => definition };\n");
    const file = join(project, ".opencode/plugins/groundwork-memory.js");
    mkdirSync(join(project, ".opencode/plugins"), { recursive: true });
    writeFileSync(file, generateOpenCode(layerOf(core, false), {}, false)[".opencode/plugins/groundwork-memory.js"]);
    const { default: plugin } = await import(pathToFileURL(file).href);
    const hooks: Record<string, Hook> = {};
    let drained: () => void = () => {};
    const done = new Promise<void>((resolve) => (drained = resolve));
    await plugin.setup({
      tool: { hook: async () => {} },
      session: { hook: async (name: string, callback: Hook) => void (hooks[`session.${name}`] = callback), get: async () => ({}) },
      event: {
        subscribe: () =>
          (async function* () {
            yield { type: "session.status" }; // not idle: ignored
            yield { type: "session.idle" };
            drained();
          })(),
      },
    });
    await done;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { project, hooks };
  }

  it("keeps the brief and the guards on an OpenCode with no compaction hook or event stream", async () => {
    const { hooks, stop } = await mount(true, [], { withStream: false, withCompaction: false });
    expect(typeof hooks["tool.execute.before"]).toBe("function");
    expect(typeof hooks["session.context"]).toBe("function");
    expect(typeof hooks["session.prompt"]).toBe("function");
    expect(hooks["session.compaction"]).toBeUndefined();
    expect(stop === undefined || typeof stop === "function").toBe(true);
  });

  it("without the flow the plugin has no guard, approval recorder or card wording", () => {
    const text = generateOpenCode(layerOf(core, false), {}, false)[".opencode/plugins/groundwork-memory.js"];
    expect(text).not.toMatch(/execute\.before|user-prompt|\.approvals|\bcards?\b|approv/i);
    expect(generateOpenCode(layerOf(core, false), {}, false)[".opencode/plugins/groundwork-guards.js"]).toBeUndefined();
  });
});

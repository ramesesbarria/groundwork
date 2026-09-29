// The built-in checks in the guard runner: protect-harness and commit-gate.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { run } from "../src/index.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";
const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: dir, stdio: "ignore" });

// An installed project with setup done and one commit.
async function project(config: Record<string, unknown> = {}): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-enforce-"));
  temps.push(dir);
  git(dir, "init", "-q");
  await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: noQuestions });
  const path = join(dir, ".groundwork/config.json");
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), setup: "done", ...config }, null, 2));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "Set up Groundwork");
  return dir;
}

const hook = (dir: string, input: object, tool = "claude-code") =>
  spawnSync(process.execPath, [join(dir, ".groundwork/guards/run.mjs"), tool], {
    cwd: dir,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
const bash = (command: string) => ({ tool_name: "Bash", tool_input: { command } });
const edit = (file: string, from: string, to: string) => ({ tool_name: "Edit", tool_input: { file_path: file, old_string: from, new_string: to } });
const write = (file: string, content: string) => ({ tool_name: "Write", tool_input: { file_path: file, content } });

// Each test starts real hook processes and git, which is slow on Windows runners.
const SLOW = { timeout: 30_000 };

describe("protect-harness", SLOW, () => {
  it("blocks removing a guard, and allows adding one", async () => {
    const dir = await project();
    const removed = hook(dir, edit(".groundwork/config.json", '"no-ai-trailers"', ""));
    expect(removed.status).toBe(2);
    expect(removed.stderr).toMatch(/\[protect-harness\].*remove the "no-ai-trailers" guard/);
    expect(hook(dir, edit(".groundwork/config.json", '"no-ai-trailers"', '"no-ai-trailers",\n    "mine"')).status).toBe(0);
  });

  it("blocks switching to per-phase or turning enforcement off, but allows other config changes", async () => {
    const dir = await project();
    expect(hook(dir, edit(".groundwork/config.json", '"per-card"', '"per-phase"')).stderr).toMatch(/per-phase/);
    expect(hook(dir, edit(".groundwork/config.json", '"commitGate": true', '"commitGate": false')).status).toBe(2);
    expect(hook(dir, edit(".groundwork/config.json", '"test": ""', '"test": "npm test"')).status).toBe(0);
  });

  it("lets setup write the config freely until setup is done", async () => {
    const dir = await project({ setup: "pending" });
    expect(hook(dir, edit(".groundwork/config.json", '"per-card"', '"per-phase"')).status).toBe(0);
  });

  it("blocks changing guard and hook files, but allows creating a new guard", async () => {
    const dir = await project();
    expect(hook(dir, edit(".groundwork/guards/run.mjs", "a", "b")).status).toBe(2);
    expect(hook(dir, write(".groundwork/hooks/session-start.mjs", "")).status).toBe(2);
    expect(hook(dir, write(".groundwork/guards/no-secrets.mjs", "export function check() { return { block: false }; }")).status).toBe(0);
    expect(hook(dir, write("src/app.ts", "export {}")).status).toBe(0);
  });

  it("blocks taking Groundwork's hooks out of settings, or disabling all hooks, but allows other settings", async () => {
    const dir = await project();
    expect(hook(dir, write(".claude/settings.json", "{}")).status).toBe(2);
    expect(hook(dir, write(".claude/settings.local.json", '{ "disableAllHooks": true }')).status).toBe(2);
    const settings = JSON.parse(readFileSync(join(dir, ".claude/settings.json"), "utf8"));
    const withPermission = JSON.stringify({ ...settings, permissions: { allow: ["Bash(npm test)"] } }, null, 2);
    expect(hook(dir, write(".claude/settings.json", withPermission)).status).toBe(0);
  });

  it("blocks the agent from writing approvals or changing the harness through the shell", async () => {
    const dir = await project();
    expect(hook(dir, write(".groundwork/.approvals/last-human.json", "{}")).status).toBe(2);
    expect(hook(dir, bash("sed -i 's/a/b/' .groundwork/guards/run.mjs")).status).toBe(2);
    expect(hook(dir, bash('echo {} > .groundwork/config.json')).status).toBe(2);
    expect(hook(dir, bash("npx groundwork-ai uninstall")).status).toBe(2);
    expect(hook(dir, bash("cat .groundwork/config.json")).status).toBe(0);
    expect(hook(dir, bash("node .groundwork/guards/run.mjs claude-code < input.json")).status).toBe(0); // runs it, changes nothing
  });

  it("is off when the human turned it off", async () => {
    const dir = await project({ enforce: { commitGate: true, protectHarness: false } });
    expect(hook(dir, edit(".groundwork/config.json", '"no-ai-trailers"', "")).status).toBe(0);
  });
});

describe("commit-gate", SLOW, () => {
  function card(dir: string, status: string, history = "- 2026-09-29 approved by human") {
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "5 passed\n");
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-books.md"),
      `---\nid: 1.1\ntitle: Books\nphase: 1\nstatus: ${status}\ndepends_on: []\n---\n## Acceptance criteria\n- [x] Lists books\n\n## Evidence\n- \`.groundwork/evidence/1.1/tests.txt\`, 5 passed\n\n## History\n${history}\n`,
    );
  }
  const humanSpeaks = (dir: string, prompt = "/gw-approve") =>
    spawnSync(process.execPath, [join(dir, ".groundwork/hooks/user-prompt.mjs"), dir], { input: JSON.stringify({ prompt }), encoding: "utf8" });
  const commitCard = bash('git add -A && git commit -m "[1.1] Books"');

  it("blocks committing a card that isn't done", async () => {
    const dir = await project();
    card(dir, "awaiting-approval", "- 2026-09-29 review → awaiting-approval: passed");
    humanSpeaks(dir);
    const result = hook(dir, commitCard);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/\[commit-gate\] Card 1\.1 isn't ready to commit: its status is "awaiting-approval"/);
  });

  it("in per-card mode, needs a message from the human since the last commit", async () => {
    const dir = await project();
    card(dir, "done");
    const before = hook(dir, commitCard);
    expect(before.status).toBe(2);
    expect(before.stderr).toMatch(/No message from the human since the last commit/);

    const spoke = humanSpeaks(dir);
    expect(spoke.status).toBe(0);
    expect(spoke.stdout).toBe("");
    expect(hook(dir, commitCard).status).toBe(0);

    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[1.1] Books");
    expect(hook(dir, commitCard).status).toBe(2); // that message was used up by the commit
  });

  it("checks the card on tools that don't record human messages, without asking for one", async () => {
    const dir = await project();
    card(dir, "done");
    const opencode = { tool: "shell", args: { command: 'git commit -m "[1.1] Books"' } };
    expect(hook(dir, opencode, "opencode").status).toBe(0);
    card(dir, "done", "- 2026-09-29 started");
    expect(hook(dir, opencode, "opencode").stderr).toMatch(/no "approved by human" line/);
  });

  it("in per-phase mode, commits a reviewed card without an approval", async () => {
    const dir = await project({ approvalMode: "per-phase" });
    card(dir, "done", "- 2026-09-29 review → done: passed");
    expect(hook(dir, commitCard).status).toBe(0);
  });

  it("doesn't gate commits that don't name a card", async () => {
    const dir = await project();
    expect(hook(dir, bash('git commit -m "Plan phase 1"')).status).toBe(0);
    expect(hook(dir, bash('git commit -m "[quick] Fix typo"')).status).toBe(0);
  });

  it("reads the card from a message file, and understands other commit formats", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    writeFileSync(join(dir, "msg.txt"), "[1.1] Books\n");
    expect(hook(dir, bash("git commit -F msg.txt")).status).toBe(2);

    const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));
    const { cardIdIn } = await import(pathToFileURL(join(coreDir, "guards/lib/commit-gate.mjs")).href);
    expect(cardIdIn("feat: Book list (1.2)", "feat: {title} ({id})")).toBe("1.2");
    expect(cardIdIn("[1.10] Books")).toBe("1.10");
    expect(cardIdIn("[quick] Fix")).toBeUndefined();
  });
});

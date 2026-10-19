// The built-in checks in the guard runner: protect-harness and commit-gate.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

  it("blocks the agent from switching to PR integration, which drops the local approval gate", async () => {
    const dir = await project();
    const switched = hook(dir, edit(".groundwork/config.json", '"integration": "local"', '"integration": "pr"'));
    expect(switched.status).toBe(2);
    expect(switched.stderr).toMatch(/\[protect-harness\].*integration to pr/);
    // An unapproved done card stays blocked, because the config never changed.
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.1/run.md"), "1 pass\n");
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-x.md"),
      "---\nid: 1.1\ntitle: X\nstatus: done\n---\n## Acceptance criteria\n- [x] works\n\n## Evidence\n- .groundwork/evidence/1.1/run.md\n\n## History\n- 2026-10-19 approved by human\n",
    );
    expect(hook(dir, bash('git add -A && git commit -m "[1.1] X"')).status).toBe(2);
  });

  it("lets a PR-integration project return to local approval, and lets setup choose PR integration", async () => {
    expect(hook(await project({ integration: "pr" }), edit(".groundwork/config.json", '"integration": "pr"', '"integration": "local"')).status).toBe(0);
    const pending = await project({ setup: "pending" });
    expect(hook(pending, edit(".groundwork/config.json", '"integration": "local"', '"integration": "pr"')).status).toBe(0);
  });

  it("watches Claude Code's PowerShell tool like Bash: no migrate, no unapproved commit", async () => {
    const dir = await project();
    const powershell = (command: string) => ({ tool_name: "PowerShell", tool_input: { command } });
    expect(hook(dir, powershell("npx groundwork-ai migrate legacy --yes --reviewed")).status).toBe(2);
    expect(hook(dir, powershell("git commit -m 'no card'")).stderr).toMatch(/\[commit-gate\]/);
    expect(hook(dir, powershell("Set-Content .groundwork/.approvals/last-human.json '{}'")).status).toBe(2);
    expect(hook(dir, powershell("git status")).status).toBe(0);
    const settings = JSON.parse(readFileSync(join(dir, ".claude/settings.json"), "utf8"));
    expect(settings.hooks.PreToolUse[0].matcher.split("|")).toContain("PowerShell");
  });

  it("lets setup write the config freely until setup is done", async () => {
    const dir = await project({ setup: "pending" });
    expect(hook(dir, edit(".groundwork/config.json", '"per-card"', '"per-phase"')).status).toBe(0);
  });

  it("blocks changing guard and hook files, and any plugin file, but allows creating a new guard", async () => {
    const dir = await project();
    expect(hook(dir, edit(".groundwork/guards/run.mjs", "a", "b")).status).toBe(2);
    expect(hook(dir, write(".groundwork/hooks/session-start.mjs", "")).status).toBe(2);
    expect(hook(dir, write(".groundwork/.legacy-cards.json", '{"version":1,"cards":{}}')).status).toBe(2);
    expect(hook(dir, write(".opencode/plugins/evil.js", "export default {}")).status).toBe(2);
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
    expect(hook(dir, bash("git clean -fdx .groundwork/.approvals")).status).toBe(2);
    expect(hook(dir, bash('echo {} > .opencode/plugins/evil.js')).status).toBe(2);
    expect(hook(dir, bash('echo {} > .groundwork/.legacy-cards.json')).status).toBe(2);
    expect(hook(dir, bash('echo {} > .groundwork/config.json')).status).toBe(2);
    expect(hook(dir, bash("git diff > .groundwork/config.json")).status).toBe(2);
    expect(hook(dir, bash("cp config.json.bak .groundwork/config.json")).status).toBe(2);
    expect(hook(dir, bash("npx groundwork-ai uninstall")).status).toBe(2);
    expect(hook(dir, bash("npx groundwork-ai migrate legacy --yes")).status).toBe(2);
    expect(hook(dir, bash("node ./cli/dist/bin.js migrate legacy --yes")).status).toBe(2);
    expect(hook(dir, bash("node .groundwork/hooks/user-prompt.mjs .")).status).toBe(2);
    expect(hook(dir, write(".GROUNDWORK/.approvals/last-human.json", "{}")).status).toBe(2);
    expect(hook(dir, bash("echo {} > .GROUNDWORK/config.json")).status).toBe(2);
    expect(hook(dir, bash("cat .groundwork/config.json")).status).toBe(0);
    expect(hook(dir, bash("node .groundwork/guards/run.mjs claude-code < input.json")).status).toBe(0); // runs it, changes nothing
  });

  it("lets setup edit config.json from the shell until setup is done, but keeps the locked files locked", async () => {
    const pending = await project({ setup: "pending" });
    expect(hook(pending, bash("echo {} > .groundwork/config.json")).status).toBe(0);
    expect(hook(pending, bash("sed -i 's/a/b/' .groundwork/guards/run.mjs")).status).toBe(2);
    expect(hook(pending, bash("rm -rf .groundwork/.approvals")).status).toBe(2);
    expect(hook(pending, bash("rm .claude/settings.local.json")).status).toBe(2);
    expect(hook(pending, bash('echo {} > .opencode/plugins/evil.js')).status).toBe(2);

    const done = await project();
    expect(hook(done, bash("echo {} > .groundwork/config.json")).status).toBe(2);
  });

  it("treats reads of harness files as reads, even with redirects, pipes and arrows around them", async () => {
    const dir = await project();
    // The three exact commands the four-arm run lost to false positives (EXPERIMENTS.md finding 2).
    const reviewer = `cd "C:/Users/rames/AppData/Local/Temp/claude/C--Users-rames-Documents-projects-groundwork/5b677e4c-a49a-4a3e-a610-d68181b8b4b2/scratchpad/exp/a4-gw-eng" && E=.groundwork/evidence/1.5 && npm test > $E/npm-test.txt 2>&1; tail -8 $E/npm-test.txt; npm run build > $E/npm-build.txt 2>&1; tail -8 $E/npm-build.txt; grep -c "it(\\|test(" src/app.edit-filter.test.ts; cat .groundwork/config.json | head -30`;
    const tester = `cd "C:/Users/rames/AppData/Local/Temp/claude/C--Users-rames-Documents-projects-groundwork/5b677e4c-a49a-4a3e-a610-d68181b8b4b2/scratchpad/exp/a4-gw-eng" && cat src/storage.ts | head -40; ls .groundwork/evidence 2>/dev/null; cat .groundwork/config.json | head -30`;
    const opencode = `node -e 'import("./.groundwork/guards/lib/cards.mjs").then(m => console.log(JSON.stringify(m.checkCards(process.cwd(), "per-card"), null, 1)))'; git status --short`;
    expect(hook(dir, bash(reviewer)).status).toBe(0);
    expect(hook(dir, bash(tester)).status).toBe(0);
    expect(hook(dir, bash(opencode)).status).toBe(0);
    expect(hook(dir, bash("cat .groundwork/config.json 2>&1")).status).toBe(0);
    expect(hook(dir, bash("npm test > out.txt; cat .groundwork/config.json")).status).toBe(0);
    expect(hook(dir, bash("cp .groundwork/config.json config.json.bak")).status).toBe(0); // the source is read, not written
  });

  it("parses a command's write targets the same way the hook judges them", async () => {
    const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));
    const { commandWriteTargets } = await import(pathToFileURL(join(coreDir, "guards/lib/harness.mjs")).href);
    expect(commandWriteTargets("npm test > out.txt 2>&1; cat .groundwork/config.json | head -30")).toEqual(["out.txt"]);
    expect(commandWriteTargets("node -e 'x => y'; git status --short")).toEqual([]);
    expect(commandWriteTargets("rm -rf .groundwork/.approvals")).toEqual([".groundwork/.approvals"]);
    expect(commandWriteTargets("cp .groundwork/config.json config.json.bak")).toEqual(["config.json.bak"]);
    expect(commandWriteTargets(`node -e "require('fs').appendFileSync('.groundwork/config.json', 'x')"`)).toEqual([".groundwork/config.json"]);
  });

  it("counts writeFileSync and appendFileSync as writes when their target is a harness file", async () => {
    const dir = await project();
    expect(hook(dir, bash(`node -e "require('fs').writeFileSync('.groundwork/config.json', '{}')"`)).status).toBe(2);
    expect(hook(dir, bash(`node -e "require('fs').appendFileSync('.groundwork/.approvals/last-human.json', 'x')"`)).status).toBe(2);
    expect(hook(dir, bash(`node -e "require('fs').writeFileSync('src/app.ts', 'x')"`)).status).toBe(0);
  });

  it("is off when the human turned it off", async () => {
    const dir = await project({ enforce: { commitGate: true, protectHarness: false } });
    expect(hook(dir, edit(".groundwork/config.json", '"no-ai-trailers"', "")).status).toBe(0);
  });
});

describe("commit-gate", SLOW, () => {
  function card(dir: string, status: string, history = "- 2026-09-29 approved by human", human = "") {
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "5 passed\n");
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-books.md"),
      `---\nid: 1.1\ntitle: Books\nphase: 1\nstatus: ${status}\ndepends_on: []\n---\n## Acceptance criteria\n- [x] Lists books\n\n## Evidence\n- \`.groundwork/evidence/1.1/tests.txt\`, 5 passed\n\n${human ? `## Human checks\n${human}\n\n` : ""}## History\n${history}\n`,
    );
  }
  const humanSpeaks = (dir: string, prompt = "/gw-approve") =>
    spawnSync(process.execPath, [join(dir, ".groundwork/hooks/user-prompt.mjs"), dir], { input: JSON.stringify({ prompt }), encoding: "utf8" });
  const commitCard = bash('git add -A && git commit -m "[1.1] Books"');

  it("blocks committing a card that isn't done, and names the two-step rule", async () => {
    const dir = await project();
    card(dir, "awaiting-approval", "- 2026-09-29 review → awaiting-approval: passed");
    humanSpeaks(dir);
    const result = hook(dir, commitCard);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/\[commit-gate\] Card 1\.1 isn't ready to commit: its status is "awaiting-approval"/);
    expect(result.stderr).toMatch(/Change the card first, then commit as a separate step: the gate reads the card as it is before the command runs\./);
  });

  it("names a pattern evidence link as a pattern, not a missing file", async () => {
    const dir = await project();
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/cards/1.1-books.md"),
      `---\nid: 1.1\ntitle: Books\nphase: 1\nstatus: awaiting-approval\ndepends_on: []\n---\n## Acceptance criteria\n- [x] Lists books\n\n## Evidence\n- \`.groundwork/evidence/1.1/review2-*\`, 5 passed\n\n## History\n- 2026-09-29 implementing → review: passed\n- 2026-09-29 review → awaiting-approval: passed\n`,
    );
    const result = hook(dir, commitCard);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/Evidence links to \.groundwork\/evidence\/1\.1\/review2-\*, which is a pattern/);
    expect(result.stderr).toMatch(/Patterns aren't checked: list each file/);
    expect(result.stderr).not.toMatch(/doesn't exist/);
  });

  it("in per-card mode, needs an explicit approval from the human for the card", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    humanSpeaks(dir, "looks good to me");
    card(dir, "done");
    const before = hook(dir, commitCard);
    expect(before.status).toBe(2);
    expect(before.stderr).toMatch(/no explicit human approval recorded|last human approval/);
    expect(before.stderr).not.toMatch(/separate step/); // the two-step rule is for the card problems, not the approval check

    card(dir, "awaiting-approval");
    const spoke = humanSpeaks(dir);
    expect(spoke.status).toBe(0);
    expect(spoke.stdout).toBe("");
    card(dir, "done");
    expect(hook(dir, commitCard).status).toBe(0);

    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[1.1] Books");
    expect(hook(dir, commitCard).status).toBe(2); // that approval was used up by the commit
  });

  it("checks the card without asking for a human message when the tool records none", async () => {
    const dir = await project();
    card(dir, "done");
    const opencode = { tool: "shell", args: { command: 'git commit -m "[1.1] Books"' } };
    expect(hook(dir, opencode, "opencode").status).toBe(0);
    card(dir, "done", "- 2026-09-29 started");
    const bad = hook(dir, opencode, "opencode");
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/no "approved by human" line/);
  });

  it("ties approval to the reviewed code, card and evidence; conversation and rejection do not count", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    humanSpeaks(dir, "looks good to me");
    card(dir, "done");
    expect(hook(dir, commitCard).stderr).toMatch(/no explicit human approval recorded|last human approval/);

    humanSpeaks(dir, "/gw-approve 1.1");
    expect(hook(dir, commitCard).status).toBe(0);

    writeFileSync(join(dir, "src.ts"), "changed after approval\n");
    expect(hook(dir, commitCard).stderr).toMatch(/code changed since the approval/);
    rmSync(join(dir, "src.ts"));

    writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "6 passed\n");
    expect(hook(dir, commitCard).stderr).toMatch(/linked evidence changed since the approval/);
    writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "5 passed\n");

    const cardPath = join(dir, ".groundwork/cards/1.1-books.md");
    writeFileSync(cardPath, readFileSync(cardPath, "utf8").replace("- [x] Lists books", "- [x] Lists books\n- [x] Extra scope after approval"));
    expect(hook(dir, commitCard).stderr).toMatch(/card changed since the approval/);

    humanSpeaks(dir, "/gw-reject 1.1");
    expect(hook(dir, commitCard).stderr).toMatch(/no explicit human approval recorded|last human approval/);
  });

  it("invalidates approval when the spec, a decision, or the declared context changes", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    humanSpeaks(dir);
    card(dir, "done");
    expect(hook(dir, commitCard).status).toBe(0);

    const spec = join(dir, ".groundwork/SPEC.md");
    const originalSpec = readFileSync(spec, "utf8");
    writeFileSync(spec, `${originalSpec}\nA new promise after approval.\n`);
    expect(hook(dir, commitCard).stderr).toMatch(/spec, a decision, or the task's declared context changed/);
    writeFileSync(spec, originalSpec);

    const decision = join(dir, ".groundwork/decisions/0001-storage.md");
    writeFileSync(decision, "---\nid: 0001\ntitle: Storage\nstatus: accepted\n---\nUse SQLite.\n");
    expect(hook(dir, commitCard).stderr).toMatch(/spec, a decision, or the task's declared context changed/);
    rmSync(decision);

    const context = join(dir, ".groundwork/work/1.1/context.json");
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(context, JSON.stringify({ version: 1, base: "0123456", deps: [] }, null, 2));
    expect(hook(dir, commitCard).stderr).toMatch(/spec, a decision, or the task's declared context changed/);
    rmSync(context);

    expect(hook(dir, commitCard).status).toBe(0); // restoring the reviewed knowledge restores the match
  });

  it("binds a declared context file, not just the context record, to the approval", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    const dependency = join(dir, ".groundwork/architecture.md");
    writeFileSync(dependency, "Use one process.\n");
    writeFileSync(
      join(dir, ".groundwork/work/1.1/context.json"),
      JSON.stringify({ version: 1, base: "0123456", deps: [{ ref: "spec:architecture.md", path: ".groundwork/architecture.md", recorded: "a".repeat(64) }] }, null, 2),
    );
    humanSpeaks(dir);
    card(dir, "done");
    expect(hook(dir, commitCard).status).toBe(0);
    writeFileSync(dependency, "Use two processes after all.\n");
    expect(hook(dir, commitCard).stderr).toMatch(/declared context changed/);
  });

  it("accepts an approval command wrapped in shell quotes", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    humanSpeaks(dir, '"/gw-approve 1.1"');
    card(dir, "done");
    expect(hook(dir, commitCard).status).toBe(0);
  });

  it("binds a decision dependency that has no stored path", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    const decision = join(dir, ".groundwork/decisions/0001-storage.md");
    writeFileSync(decision, "---\nid: 0001\ntitle: Storage\nstatus: accepted\n---\nUse SQLite.\n");
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/work/1.1/context.json"),
      JSON.stringify({ version: 1, base: "0123456", deps: [{ ref: "decision:0001", recorded: "a".repeat(64) }] }, null, 2),
    );
    humanSpeaks(dir);
    card(dir, "done");
    expect(hook(dir, commitCard).status).toBe(0);
    writeFileSync(decision, "---\nid: 0001\ntitle: Storage\nstatus: accepted\n---\nUse Postgres.\n");
    expect(hook(dir, commitCard).stderr).toMatch(/declared context changed/);
  });

  it("on OpenCode, needs the human's message once the plugin says its prompt hook is live", async () => {
    const dir = await project();
    card(dir, "done");
    const opencode = { tool: "shell", args: { command: 'git commit -m "[1.1] Books"' } };
    // Before the plugin advertises the hook, only the card checks apply, as documented.
    expect(hook(dir, opencode, "opencode").status).toBe(0);

    mkdirSync(join(dir, ".groundwork/.approvals"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/.approvals/records-human"), "{}\n");
    const before = hook(dir, opencode, "opencode");
    expect(before.status).toBe(2);
    expect(before.stderr).toMatch(/no explicit human approval recorded/);

    card(dir, "awaiting-approval");
    humanSpeaks(dir);
    card(dir, "done");
    expect(hook(dir, opencode, "opencode").status).toBe(0);
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[1.1] Books");
    expect(hook(dir, opencode, "opencode").status).toBe(2); // that approval was used up by the commit
  });

  it("in per-phase mode, commits a reviewed card without an approval", async () => {
    const dir = await project({ approvalMode: "per-phase" });
    card(dir, "done", "- 2026-09-29 review → done: passed");
    expect(hook(dir, commitCard).status).toBe(0);
  });

  it("in per-phase mode, open human checks don't block the commit", async () => {
    const dir = await project({ approvalMode: "per-phase" });
    card(dir, "done", "- 2026-09-29 review → done: passed", "- [ ] Tab walk shows a focus ring\n- [x] No sideways scroll at 320px — 2026-10-01");
    expect(hook(dir, commitCard).status).toBe(0);
  });

  it("blocks an oversized card at the gate, and passes one just under the limit", async () => {
    const dir = await project({ approvalMode: "per-phase" });
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "5 passed\n");
    const head =
      "---\nid: 1.1\ntitle: Books\nphase: 1\nstatus: done\ndepends_on: []\n---\n## Acceptance criteria\n- [x] Lists books\n\n## Evidence\n- `.groundwork/evidence/1.1/tests.txt`, 5 passed\n\n## History\n- 2026-09-29 review → done: passed\n";
    const cardPath = join(dir, ".groundwork/cards/1.1-books.md");
    writeFileSync(cardPath, head + "x".repeat(6000 - head.length)); // exactly 1500 tokens
    expect(hook(dir, commitCard).status).toBe(0);
    writeFileSync(cardPath, head + "x".repeat(6001 - head.length)); // 1501 tokens
    const blocked = hook(dir, commitCard);
    expect(blocked.status).toBe(2);
    expect(blocked.stderr).toMatch(/≈1501 tokens, over 1500/);
    expect(blocked.stderr).toMatch(/details belong in the evidence files/);
  });

  it("blocks a commit that omits a card id, but allows explicit non-card tags", async () => {
    const dir = await project();
    const plain = hook(dir, bash('git commit -m "Plan phase 1"'));
    expect(plain.status).toBe(2);
    expect(plain.stderr).toMatch(/names no card/);
    expect(hook(dir, bash('git commit -m "[plan] Plan phase 1"')).status).toBe(0);
    expect(hook(dir, bash('git commit -m "[quick] Fix typo"')).status).toBe(0);
    expect(hook(dir, bash('git commit -m "[no-card] Housekeeping"')).status).toBe(0);
    const unknown = hook(dir, bash('git commit -m "[9.9] Missing card"'));
    expect(unknown.status).toBe(2);
    expect(unknown.stderr).toMatch(/no card file has that id/);
  });

  it("allows setup and docs tags for their ordinary files", async () => {
    const dir = await project();
    writeFileSync(join(dir, "AGENTS.md"), `${readFileSync(join(dir, "AGENTS.md"), "utf8")}\n- setup note\n`);
    expect(hook(dir, bash('git commit -m "[setup] Set up Groundwork"')).status).toBe(0);
    git(dir, "checkout", "--", "AGENTS.md");
    writeFileSync(join(dir, "README.md"), "# Project\n");
    expect(hook(dir, bash('git commit -m "[docs] Add README"')).status).toBe(0);
  });

  it("only lets each non-card tag cover the kind of change it names", async () => {
    const dir = await project();
    writeFileSync(join(dir, "src.ts"), "export {};\n");
    expect(hook(dir, bash('git commit -m "[quick] Fix the parse bug"')).status).toBe(0);
    for (const tag of ["docs", "plan", "setup"]) {
      const result = hook(dir, bash(`git commit -m "[${tag}] Cover the source change"`));
      expect(result.status, tag).toBe(2);
      expect(result.stderr).toMatch(new RegExp(`\\[${tag}\\] is for`));
    }
    const reason = hook(dir, bash('git commit -m "[no-card]"'));
    expect(reason.status).toBe(2);
    expect(reason.stderr).toMatch(/needs a short reason/);
  });

  it("does not let a non-card tag carry card or evidence work", async () => {
    const dir = await project();
    card(dir, "awaiting-approval");
    const quick = hook(dir, bash('git commit -m "[quick] Finish the card"'));
    expect(quick.status).toBe(2);
    expect(quick.stderr).toMatch(/\[quick\].*changes .*\.groundwork\/cards.*Name the card/);
    const noCard = hook(dir, bash('git commit -m "[no-card] Finish the card"'));
    expect(noCard.status).toBe(2);
    expect(noCard.stderr).toMatch(/\[no-card\] can't change card files/);
    const docs = hook(dir, bash('git commit -m "[docs] Finish the card"'));
    expect(docs.status).toBe(2);
    expect(docs.stderr).toMatch(/\[docs\] is for documentation/);
  });

  it("does not let [plan] commit a done card, or [setup] commit card/evidence work", async () => {
    const dir = await project();
    const todo = join(dir, ".groundwork/cards/1.2-todo.md");
    writeFileSync(todo, "---\nid: 1.2\ntitle: Todo\nphase: 1\nstatus: todo\ndepends_on: []\n---\n");
    expect(hook(dir, bash('git commit -m "[plan] Add card 1.2"')).status).toBe(0);

    writeFileSync(join(dir, ".groundwork/cards/1.3-done.md"), "---\nid: 1.3\ntitle: Done\nphase: 1\nstatus: done\ndepends_on: []\n---\n");
    const plan = hook(dir, bash('git commit -m "[plan] Touch a done card"'));
    expect(plan.status).toBe(2);
    expect(plan.stderr).toMatch(/\[plan\] can't change a done card/);

    mkdirSync(join(dir, ".groundwork/evidence/1.3"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.3/tests.txt"), "1 passed\n");
    const setup = hook(dir, bash('git commit -m "[setup] Touch card work"'));
    expect(setup.status).toBe(2);
    expect(setup.stderr).toMatch(/\[setup\] is for setup files, not card, evidence or context work/);
  });

  it("still names an unknown card id even when a non-card tag is present", async () => {
    const dir = await project();
    const result = hook(dir, bash('git commit -m "[9.9] Missing card [quick]"'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no card file has that id/);
  });

  it("keeps a card commit to its own card and evidence", async () => {
    const dir = await project();
    card(dir, "done");
    writeFileSync(join(dir, ".groundwork/cards/1.2-other.md"), "---\nid: 1.2\ntitle: Other\nphase: 1\nstatus: done\ndepends_on: []\n---\n");
    const result = hook(dir, bash('git commit -m "[1.1] Books"'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/only include card 1\.1.*1\.2-other\.md/);
  });

  it("blocks a staged card that differs from the working tree", async () => {
    const dir = await project();
    card(dir, "done");
    git(dir, "add", "-A");
    writeFileSync(join(dir, ".groundwork/cards/1.1-books.md"), `${readFileSync(join(dir, ".groundwork/cards/1.1-books.md"), "utf8")}\n`);
    const result = hook(dir, bash('git commit -m "[1.1] Books"'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/staged copy of .* differs from the working tree/);
  });

  it("sees both sides of a rename, and blocks private files", async () => {
    const dir = await project();
    card(dir, "done");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[1.1] Books");
    git(dir, "mv", ".groundwork/cards/1.1-books.md", "PLAN.md");
    const renamed = hook(dir, bash('git commit -m "[quick] Rename the card"'));
    expect(renamed.status).toBe(2);
    expect(renamed.stderr).toMatch(/\[quick\].*\.groundwork\/cards\/1\.1-books\.md/);
    git(dir, "mv", "PLAN.md", ".groundwork/cards/1.1-books.md");

    mkdirSync(join(dir, ".groundwork/private"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/private/secret.txt"), "secret\n");
    git(dir, "add", "-f", ".groundwork/private/secret.txt");
    const secret = hook(dir, bash('git commit -m "[quick] Add a file"'));
    expect(secret.status).toBe(2);
    expect(secret.stderr).toMatch(/private files must stay out of git/);
  });

  it("blocks a plan commit that deletes or flips a done card", async () => {
    const dir = await project();
    card(dir, "done");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[1.1] Books");
    rmSync(join(dir, ".groundwork/cards/1.1-books.md"));
    const deleted = hook(dir, bash('git commit -m "[plan] Remove the old card"'));
    expect(deleted.status).toBe(2);
    expect(deleted.stderr).toMatch(/\[plan\] can't change a done card/);
  });

  it("blocks a card or evidence write in the same shell command as the commit", async () => {
    const dir = await project();
    card(dir, "done");
    const writeAndCommit = hook(dir, bash('echo changed > .groundwork/cards/1.1.md; git commit -m "[1.1] Books"'));
    expect(writeAndCommit.status).toBe(2);
    expect(writeAndCommit.stderr).toMatch(/can't change card, evidence, knowledge or private files in the same step/);
  });

  it("blocks Git index flags that would hide a staged change", async () => {
    const dir = await project();
    const result = hook(dir, bash("git update-index --assume-unchanged .groundwork/cards/1.1.md"));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/index flags/);
  });

  it("allows reading the approval hook, but blocks running it directly or a migrate script", async () => {
    const dir = await project();
    expect(hook(dir, bash("cat .groundwork/hooks/user-prompt.mjs")).status).toBe(0);
    expect(hook(dir, bash("cd .groundwork/hooks && node user-prompt.mjs .")).status).toBe(2);
    expect(hook(dir, bash("npm run migrate")).status).toBe(2);
  });

  it("reads only the real commit message, not a decoy earlier in the command", async () => {
    const dir = await project();
    card(dir, "done");
    writeFileSync(join(dir, "msg.txt"), "[1.1] Books\n");
    const result = hook(dir, bash('echo "[quick] not the message"; git commit -F msg.txt'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no explicit human approval|last human approval/);
    expect(result.stderr).not.toMatch(/\[quick\] is for small changes/);
  });

  it("blocks writing the commit message file in the same command", async () => {
    const dir = await project();
    const result = hook(dir, bash('printf "[quick] x" > msg.txt; git commit -F msg.txt'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/can't write its own message file/);
  });

  it("scopes a ref-only spec dependency for quick commits", async () => {
    const dir = await project();
    writeFileSync(join(dir, "architecture.md"), "Use one process.\n");
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/work/1.1/context.json"),
      JSON.stringify({ version: 1, base: "0123456", deps: [{ ref: "spec:architecture.md", recorded: "a".repeat(64) }] }),
    );
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "context");
    writeFileSync(join(dir, "architecture.md"), "Use two processes.\n");
    const quick = hook(dir, bash('git commit -m "[quick] Change the architecture"'));
    expect(quick.status).toBe(2);
    expect(quick.stderr).toMatch(/architecture\.md/);
  });

  it("blocks quick and setup from changing a declared dependency file", async () => {
    const dir = await project();
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/architecture.md"), "Use one process.\n");
    writeFileSync(
      join(dir, ".groundwork/work/1.1/context.json"),
      JSON.stringify({ version: 1, base: "0123456", deps: [{ ref: "spec:architecture.md", path: ".groundwork/architecture.md", recorded: "a".repeat(64) }] }),
    );
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "context");
    writeFileSync(join(dir, ".groundwork/architecture.md"), "Use two processes.\n");
    const quick = hook(dir, bash('git commit -m "[quick] Change the architecture"'));
    expect(quick.status).toBe(2);
    expect(quick.stderr).toMatch(/\.groundwork\/architecture\.md/);
    const setup = hook(dir, bash('git commit -m "[setup] Change the architecture"'));
    expect(setup.status).toBe(2);
    expect(setup.stderr).toMatch(/\.groundwork\/architecture\.md/);
  });

  it("does not let quick or setup carry context changes", async () => {
    const dir = await project();
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/work/1.1/context.json"), JSON.stringify({ version: 1, base: "0123456", deps: [] }));
    const quick = hook(dir, bash('git commit -m "[quick] Tidy the context"'));
    expect(quick.status).toBe(2);
    expect(quick.stderr).toMatch(/context\.json/);
    const setup = hook(dir, bash('git commit -m "[setup] Tidy the context"'));
    expect(setup.status).toBe(2);
    expect(setup.stderr).toMatch(/context work/);
  });

  it("scopes paths when Groundwork is installed in a repository subdirectory", async () => {
    const parent = mkdtempSync(join(tmpdir(), "groundwork-subdir-"));
    temps.push(parent);
    git(parent, "init", "-q");
    const child = join(parent, "app");
    mkdirSync(child);
    await run(["init", "--adapter", "claude-code"], { cwd: child, ask: noQuestions });
    const configPath = join(child, ".groundwork/config.json");
    writeFileSync(configPath, JSON.stringify({ ...JSON.parse(readFileSync(configPath, "utf8")), setup: "done" }, null, 2));
    git(parent, "add", "-A");
    git(parent, "commit", "-q", "-m", "setup");
    mkdirSync(join(child, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(child, ".groundwork/evidence/1.1/tests.txt"), "1 passed\n");
    writeFileSync(
      join(child, ".groundwork/cards/1.1-sub.md"),
      "---\nid: 1.1\ntitle: Sub\nphase: 1\nstatus: done\ndepends_on: []\n---\n## Acceptance criteria\n- [x] It works\n\n## Evidence\n- `.groundwork/evidence/1.1/tests.txt`, 1 passed\n## History\n- 2026-09-29 approved by human\n",
    );
    const result = hook(child, bash('git commit -m "[quick] Carry a card"'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/\.groundwork\/cards\/1\.1-sub\.md/);
    git(parent, "add", "-A");
    git(parent, "commit", "-q", "-m", "card");
    rmSync(join(child, ".groundwork/cards/1.1-sub.md"));
    const plan = hook(child, bash('git commit -m "[plan] Remove the card"'));
    expect(plan.status).toBe(2);
    expect(plan.stderr).toMatch(/\[plan\] can't change a done card/);
  });

  it("in PR integration, local checkpoint commits naming a card are allowed", async () => {
    const dir = await project({ integration: "pr" });
    card(dir, "testing", "- 2026-09-29 implementing → testing: checkpoint");
    expect(hook(dir, commitCard).status).toBe(0);
  });

  it("importing the user-prompt hook records nothing until a message arrives", async () => {
    const dir = await project();
    const module = await import(pathToFileURL(join(dir, ".groundwork/hooks/user-prompt.mjs")).href);
    expect(typeof module.recordHuman).toBe("function");
    expect(existsSync(join(dir, ".groundwork/.approvals/last-human.json"))).toBe(false);
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

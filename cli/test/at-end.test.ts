// at-end mode (build straight through, one review, one approval), `groundwork mode`, autoCommit,
// and keeping secrets out of committed files.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";
import { nextReady } from "../src/cards.js";
import { readCore } from "../src/core.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";
const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: dir, stdio: "ignore" });
const config = (dir: string) => JSON.parse(readFileSync(join(dir, ".groundwork/config.json"), "utf8"));

// An installed project with setup done, in the given mode, with one commit.
async function project(extra: Record<string, unknown> = {}): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-at-end-"));
  temps.push(dir);
  git(dir, "init", "-q");
  await run(["init", "--adapter", "claude-code"], { cwd: dir, ask: noQuestions });
  writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config(dir), setup: "done", ...extra }, null, 2));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "Set up Groundwork");
  return dir;
}

function card(dir: string, id: string, status: string, { evidence = true, deps = "[]", history = "- 2026-09-29 implementing → built: 5 passed" } = {}) {
  if (evidence) {
    mkdirSync(join(dir, ".groundwork/evidence", id), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence", id, "tests.txt"), "5 passed\n");
  }
  writeFileSync(
    join(dir, `.groundwork/cards/${id}-card.md`),
    [
      "---",
      `id: ${id}`,
      `title: Card ${id}`,
      "phase: 1",
      `status: ${status}`,
      `depends_on: ${deps}`,
      "---",
      "## Acceptance criteria",
      "- [ ] It works",
      "",
      "## Evidence",
      evidence ? `- \`.groundwork/evidence/${id}/tests.txt\`, 5 passed` : "",
      "",
      "## History",
      history,
      "",
    ].join("\n"),
  );
}

const hook = (dir: string, input: object) =>
  spawnSync(process.execPath, [join(dir, ".groundwork/guards/run.mjs"), "claude-code"], { cwd: dir, input: JSON.stringify(input), encoding: "utf8" });
const bash = (command: string) => ({ tool_name: "Bash", tool_input: { command } });
const SLOW = { timeout: 30_000 };

describe("groundwork mode", SLOW, () => {
  it("shows the current mode and what each one means", async () => {
    const dir = await project();
    const { code, output } = await run(["mode"], { cwd: dir });
    expect(code).toBe(0);
    expect(output).toMatch(/Approval mode: per-card/);
    expect(output).toMatch(/at-end +the agent builds every card straight through/);
  });

  it("changes it, and refuses a mode that doesn't exist", async () => {
    const dir = await project();
    expect((await run(["mode", "at-end"], { cwd: dir })).output).toMatch(/per-card → at-end/);
    expect(config(dir).approvalMode).toBe("at-end");
    expect(config(dir).setup).toBe("done"); // everything else kept
    const bad = await run(["mode", "yolo"], { cwd: dir });
    expect(bad.code).toBe(1);
    expect(config(dir).approvalMode).toBe("at-end");
  });

  it("is the human's command: the agent can't run it or make the same edit, except back to per-card", async () => {
    const dir = await project();
    const ran = hook(dir, bash("npx groundwork-ai mode at-end"));
    expect(ran.status).toBe(2);
    expect(ran.stderr).toMatch(/Give them the exact command/);
    const edit = (from: string, to: string) => ({ tool_name: "Edit", tool_input: { file_path: ".groundwork/config.json", old_string: from, new_string: to } });
    expect(hook(dir, edit('"per-card"', '"at-end"')).status).toBe(2);
    await run(["mode", "at-end"], { cwd: dir }); // the human switches
    expect(hook(dir, edit('"at-end"', '"per-card"')).status).toBe(0);
    expect(hook(dir, edit('"at-end"', '"per-phase"')).status).toBe(2);
  });
});

describe("cards in at-end mode", SLOW, () => {
  it("a built card needs its test output, but not ticked criteria (the end review ticks them)", async () => {
    const dir = await project({ approvalMode: "at-end" });
    card(dir, "1.1", "built");
    expect((await run(["check"], { cwd: dir })).code).toBe(0);
    card(dir, "1.2", "built", { evidence: false });
    expect((await run(["check", "1.2"], { cwd: dir })).output).toMatch(/it's built, but its Evidence section is empty/);
  });

  it("a done card still needs the human's approval line", async () => {
    const dir = await project({ approvalMode: "at-end" });
    card(dir, "1.1", "done");
    expect((await run(["check"], { cwd: dir })).output).toMatch(/no "approved by human" line/);
  });

  it("the next card can start once its dependencies are built", async () => {
    const cards = [
      { id: "1.1", title: "A", status: "built", dependsOn: [] },
      { id: "1.2", title: "B", status: "todo", dependsOn: ["1.1"] },
    ];
    expect(nextReady(cards, "at-end")?.id).toBe("1.2");
    expect(nextReady(cards, "per-card")).toBeUndefined();
  });

  it("status and doctor say plainly which cards aren't reviewed yet", async () => {
    const dir = await project({ approvalMode: "at-end" });
    card(dir, "1.1", "built");
    card(dir, "1.2", "todo", { evidence: false, history: "- 2026-09-29 created" });
    const status = (await run(["status"], { cwd: dir })).output;
    expect(status).toMatch(/Not reviewed: +1\.1 \(built but not reviewed\)/);
    expect(status).toMatch(/Next ready: +1\.2/);
    expect((await run(["doctor"], { cwd: dir })).output).toMatch(/1 card is built but not reviewed yet \(1\.1\)\. The end review covers/);
  });
});

describe("the commit gate in at-end mode", SLOW, () => {
  it("allows a built card with its test output as a checkpoint, without waiting for the human", async () => {
    const dir = await project({ approvalMode: "at-end" });
    card(dir, "1.1", "built");
    expect(hook(dir, bash('git add -A && git commit -m "[1.1] Card 1.1 (not reviewed yet)"')).status).toBe(0);
  });

  it("blocks a card that isn't built yet, or has no test output", async () => {
    const dir = await project({ approvalMode: "at-end" });
    card(dir, "1.1", "implementing");
    expect(hook(dir, bash('git commit -m "[1.1] Card 1.1"')).stderr).toMatch(/not built or done/);
    card(dir, "1.2", "built", { evidence: false });
    expect(hook(dir, bash('git commit -m "[1.2] Card 1.2"')).stderr).toMatch(/Evidence section is empty/);
  });
});

describe("autoCommit", SLOW, () => {
  it("is on by default, and once the human turns it off, the agent can't turn it back on", async () => {
    expect(JSON.parse(core["templates/config.json"]).autoCommit).toBe(true);
    const dir = await project({ autoCommit: false });
    const edit = { tool_name: "Edit", tool_input: { file_path: ".groundwork/config.json", old_string: '"autoCommit": false', new_string: '"autoCommit": true' } };
    expect(hook(dir, edit).stderr).toMatch(/turn automatic commits back on/);
  });

  it("the commands say what to do when it's off", () => {
    for (const path of ["commands/gw-next.md", "commands/gw-approve.md", "commands/gw-quick.md", "guides/at-end.md"]) {
      expect(core[path], path).toMatch(/autoCommit/);
    }
  });
});

describe("secrets", () => {
  it("init keeps .groundwork/private/ out of git, and AGENTS.md says to use it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-at-end-"));
    temps.push(dir);
    await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
    expect(readFileSync(join(dir, ".groundwork/.gitignore"), "utf8")).toMatch(/^private\/$/m);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toMatch(/Secrets[^\n]*\.groundwork\/private\//);
    expect(core["commands/gw-setup.md"]).toMatch(/\.groundwork\/private\//);
  });
});

describe("the at-end guide", () => {
  it("builds, saves proof, commits a checkpoint, then one review and one approval", () => {
    const guide = core["guides/at-end.md"];
    expect(guide).toMatch(/status `built`/);
    expect(guide).toMatch(/\(not reviewed yet\)/);
    expect(guide).toMatch(/One reviewer run/);
    expect(guide).toMatch(/gw-approve/);
    expect(core["commands/gw-next.md"]).toContain(".groundwork/guides/at-end.md");
    expect(core["commands/gw-plan.md"]).toMatch(/npx groundwork-ai mode at-end/);
  });
});

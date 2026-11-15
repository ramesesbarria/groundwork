// With the flow on, the context layer's own writes must not trip the flow's guards, and must not
// open them either: memory files ride along like the handoff, card work is as protected as in 1.0.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, git, repo, write } from "./support.js";

async function project(): Promise<string> {
  const dir = repo();
  await cli(dir, "init", "--flow", "--adapter", "claude-code");
  const path = join(dir, ".groundwork/config.json");
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), setup: "done" }, null, 2));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "[setup] Set up Groundwork");
  return dir;
}

// The guard, run as Claude Code runs it: exit 2 blocks the call.
const guard = (dir: string, command: string) =>
  spawnSync(process.execPath, [join(dir, ".groundwork/guards/run.mjs"), "claude-code"], {
    cwd: dir,
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    encoding: "utf8",
  });

const SLOW = { timeout: 60_000 };

describe("the commit gate and project memory", SLOW, () => {
  it("a [docs] commit may carry what a checkpoint wrote: the handoff and the journal", async () => {
    const dir = await project();
    write(dir, "README.md", "# project\n\nMore.\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "[docs] Readme");
    await cli(dir, "checkpoint", "--now", "Readme written", "--next", "Plan phase 1");
    write(dir, "docs/guide.md", "# Guide\n");
    git(dir, "add", "-A");
    expect(git(dir, "diff", "--cached", "--name-only").split("\n").sort()).toEqual([".groundwork/HANDOFF.md", ".groundwork/JOURNAL.md", "docs/guide.md"]);
    expect(guard(dir, 'git commit -m "[docs] Add the guide"').status).toBe(0);
  });

  it("a [docs] or [plan] commit may carry the map, the decisions index, the ledger and the archives", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    await cli(dir, "worker", "start", "docs", "--goal", "Write the docs");
    write(dir, ".groundwork/MAP.md", "# Map\n\n## Layout\n- `README.md` (found)\n");
    write(dir, ".groundwork/HANDOFF.md", `${readFileSync(join(dir, ".groundwork/HANDOFF.md"), "utf8")}\n## Old log\n- things\n`);
    await cli(dir, "compact");
    await cli(dir, "index");
    git(dir, "add", "-A");
    const staged = git(dir, "diff", "--cached", "--name-only");
    expect(staged).toContain(".groundwork/work/LEDGER.md");
    expect(staged).toMatch(/\.groundwork\/archive\/HANDOFF-\d{4}-\d\d-\d\d\.md/);
    expect(guard(dir, 'git commit -m "[docs] Save project memory"').status).toBe(0);
    expect(guard(dir, 'git commit -m "[plan] Save project memory"').status).toBe(0);
    expect(guard(dir, 'git commit -m "[quick] Save project memory"').status).toBe(0);
  });

  it("a decision record is still planning, not docs, and archiving one needs [plan]", async () => {
    const dir = await project();
    await cli(dir, "decide", "Use SQLite", "--status", "accepted");
    git(dir, "add", "-A");
    const docs = guard(dir, 'git commit -m "[docs] Record a decision"');
    expect(docs.status).toBe(2);
    expect(docs.stderr).toMatch(/\[docs\] is for documentation, but this commit also changes \.groundwork\/decisions\/0001-use-sqlite\.md/);
    const quick = guard(dir, 'git commit -m "[quick] Record a decision"');
    expect(quick.status).toBe(2);
    expect(guard(dir, 'git commit -m "[plan] Record a decision"').status).toBe(0);
    git(dir, "commit", "-q", "-m", "[plan] Record a decision");

    writeFileSync(join(dir, ".groundwork/decisions/0001-use-sqlite.md"), readFileSync(join(dir, ".groundwork/decisions/0001-use-sqlite.md"), "utf8").replace("status: accepted", "status: superseded"));
    await cli(dir, "compact");
    git(dir, "add", "-A");
    expect(git(dir, "diff", "--cached", "--name-only")).toContain(".groundwork/archive/decisions/0001-use-sqlite.md");
    expect(guard(dir, 'git commit -m "[docs] Archive"').status).toBe(2);
    expect(guard(dir, 'git commit -m "[plan] Archive a superseded decision"').status).toBe(0);
  });

  it("memory files don't let card work through: a card or its evidence still needs its card commit", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.1/run.md"), "1 pass\n");
    writeFileSync(join(dir, ".groundwork/cards/1.1-x.md"), "---\nid: 1.1\ntitle: X\nphase: 1\nstatus: todo\ndepends_on: []\n---\n## Goal\nx\n");
    git(dir, "add", "-A");
    for (const tag of ["docs", "quick", "setup"]) {
      const result = guard(dir, `git commit -m "[${tag}] Save"`);
      expect(result.status, tag).toBe(2);
      expect(result.stderr, tag).toMatch(/\[commit-gate\]/);
    }
    const untagged = guard(dir, 'git commit -m "Save"');
    expect(untagged.status).toBe(2);
  });

  it("an approval isn't spent by a checkpoint: memory lives outside what approval is bound to", async () => {
    const dir = await project();
    const { workFingerprint, knowledgeFingerprint } = await import(`file://${join(dir, ".groundwork/guards/lib/approval.mjs").replace(/\\/g, "/")}`);
    write(dir, "src/app.ts", "export const a = 1;\n");
    const work = workFingerprint(dir);
    const knowledge = knowledgeFingerprint(dir, "1.1");
    await cli(dir, "checkpoint", "--now", "Card 1.1 is waiting for approval", "--next", "Approve it");
    await cli(dir, "index");
    write(dir, ".groundwork/MAP.md", "# Map\n\n## Layout\n- `src/app.ts` (found)\n");
    expect(workFingerprint(dir)).toBe(work);
    expect(knowledgeFingerprint(dir, "1.1")).toBe(knowledge);
  });
});

describe("the flow's own surface is as 1.0 left it", () => {
  it("check, mode and status still work on a flow install", async () => {
    const dir = await project();
    expect((await cli(dir, "check")).output).toBe("No cards yet.");
    expect((await cli(dir, "mode")).output).toMatch(/^Approval mode: per-card\./);
    const status = (await cli(dir, "status")).output;
    expect(status).toMatch(/^Phase: +not planned yet\nCurrent card: +none\n/);
    expect(status).toContain("No cards yet. Run gw-spec, then gw-plan.");
  });

  it("the flow's commands are refused politely, not crashed, on a context-only install", async () => {
    const dir = repo();
    await cli(dir, "init", "--adapter", "none");
    expect((await cli(dir, "check")).output).toBe("No cards yet.");
    expect((await cli(dir, "status")).output).not.toMatch(/card/i);
    expect((await cli(dir, "mode")).code).toBe(0);
  });
});

// The CLI integration for the shared-context prototype: reassess writes snapshots, check reads them,
// and the current task stays checked even when it is marked done.
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function decision(dir: string, body: string): void {
  writeFileSync(
    join(dir, ".groundwork/decisions/0001-session-storage.md"),
    `---\nid: 0001\ntitle: Session storage\nstatus: proposed\ndate: 2026-10-18\n---\n${body}\n`,
  );
}

function card(dir: string, status = "todo"): void {
  writeFileSync(
    join(dir, ".groundwork/cards/1.1.md"),
    `---\nid: 1.1\ntitle: Auth\nphase: 1\nstatus: ${status}\ndepends_on: []\n---\n## Goal\nAuth works.\n## Acceptance criteria\n- [x] Auth works.\n## Evidence\n- [tests](../evidence/1.1/tests.txt)\n## History\n- 2026-10-18 created\n`,
  );
  mkdirSync(join(dir, ".groundwork/evidence/1.1"), { recursive: true });
  writeFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "auth: passed\n");
}

async function repo(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-context-"));
  temps.push(dir);
  git(dir, "init", "-q", "--initial-branch=main");
  git(dir, "config", "user.email", "demo@example.com");
  git(dir, "config", "user.name", "Demo");
  await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
  mkdirSync(join(dir, ".groundwork/decisions"), { recursive: true });
  decision(dir, "Use signed cookies.");
  card(dir);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "baseline");
  const reassess = await run(["reassess", "1.1", "--target", "main", "--dep", "decision:0001"], { cwd: dir, ask: noQuestions });
  expect(reassess.code).toBe(0);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "context");
  return dir;
}

const check = (dir: string) => run(["check", "--base", "main"], { cwd: dir, ask: noQuestions });

describe("shared-context CLI", () => {
  it("records a base and snapshots, and a local change passes before merge", async () => {
    const dir = await repo();
    git(dir, "switch", "-q", "-c", "gw/1.1");
    decision(dir, "Use server-side sessions.");
    expect((await run(["reassess", "1.1", "--target", "main"], { cwd: dir, ask: noQuestions })).code).toBe(0);
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "[1.1] auth");
    const { code, output } = await check(dir);
    expect(code).toBe(0);
    expect(output).toMatch(/verdict=ok/);
  });

  it("requires reassessment after upstream integration, and marking the task done does not skip it", async () => {
    const dir = await repo();
    git(dir, "switch", "-q", "-c", "gw/1.1");
    decision(dir, "Use server-side sessions.");
    await run(["reassess", "1.1", "--target", "main"], { cwd: dir, ask: noQuestions });
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "[1.1] auth");

    git(dir, "switch", "-q", "main");
    decision(dir, "Use server-side sessions with a shared store.");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "upstream");
    git(dir, "switch", "-q", "gw/1.1");

    let result = await check(dir);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/freshness: behind target/);
    expect(result.output).toMatch(/decision:0001:.*verdict=reassess/);

    git(dir, "merge", "-q", "-X", "theirs", "main", "-m", "merge upstream");
    card(dir, "done");
    result = await check(dir);
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/decision:0001:.*verdict=reassess/);
    card(dir, "todo");

    expect((await run(["reassess", "1.1", "--target", "main"], { cwd: dir, ask: noQuestions })).code).toBe(0);
    expect((await check(dir)).code).toBe(0);
  });

  it("refuses an unsafe task id", async () => {
    const dir = await repo();
    const result = await run(["reassess", "../escape", "--target", "main", "--dep", "decision:0001"], { cwd: dir, ask: noQuestions });
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/isn't safe/);
  });

  it("handles a dependency added after the task base", async () => {
    const dir = await repo();
    writeFileSync(
      join(dir, ".groundwork/decisions/0002-analytics.md"),
      "---\nid: 0002\ntitle: Analytics\nstatus: proposed\ndate: 2026-10-18\n---\nUse a vendor.\n",
    );
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "new decision");
    expect((await run(["reassess", "1.1", "--target", "main", "--dep", "decision:0002"], { cwd: dir, ask: noQuestions })).code).toBe(0);
    const { code, output } = await run(["check", "--task", "1.1", "--base", "main"], { cwd: dir, ask: noQuestions });
    expect(code).toBe(0);
    expect(output).toMatch(/decision:0002:.*verdict=ok/);
  });

  it("fails an invalid context record", async () => {
    const dir = await repo();
    writeFileSync(join(dir, ".groundwork/work/1.1/context.json"), "{not json");
    const { code, output } = await run(["check", "--task", "1.1", "--base", "main"], { cwd: dir, ask: noQuestions });
    expect(code).toBe(1);
    expect(output).toMatch(/invalid context metadata|isn't valid JSON/);
  });

  it("requires --drop for an intentional deletion, not a silent missing snapshot", async () => {
    const dir = await repo();
    git(dir, "switch", "-q", "-c", "gw/1.1");
    git(dir, "rm", "-q", ".groundwork/decisions/0001-session-storage.md");
    git(dir, "commit", "-qm", "remove dependency");
    const refused = await run(["reassess", "1.1", "--target", "main"], { cwd: dir, ask: noQuestions });
    expect(refused.code).toBe(1);
    expect(refused.output).toMatch(/--drop/);
    const dropped = await run(["reassess", "1.1", "--target", "main", "--drop", "decision:0001"], { cwd: dir, ask: noQuestions });
    expect(dropped.code).toBe(0);
    expect((await run(["check", "--base", "main"], { cwd: dir, ask: noQuestions })).code).toBe(0);
  });

  it("does not follow a rename by stored path, but --dep re-resolves it", async () => {
    const dir = await repo();
    git(dir, "mv", ".groundwork/decisions/0001-session-storage.md", ".groundwork/decisions/0001-session-store.md");
    git(dir, "commit", "-qm", "rename decision");
    const stored = await run(["reassess", "1.1", "--target", "main"], { cwd: dir, ask: noQuestions });
    expect(stored.code).toBe(1);
    expect(stored.output).toMatch(/--drop/);
    const resolved = await run(["reassess", "1.1", "--target", "main", "--dep", "decision:0001"], { cwd: dir, ask: noQuestions });
    expect(resolved.code).toBe(0);
    const context = JSON.parse(readFileSync(join(dir, ".groundwork/work/1.1/context.json"), "utf8")) as { deps: { path?: string }[] };
    expect(context.deps[0]?.path).toBe(".groundwork/decisions/0001-session-store.md");
    expect((await run(["check", "--base", "main"], { cwd: dir, ask: noQuestions })).code).toBe(0);
  });
});

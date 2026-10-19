// The legacy migration records pre-approval cards without inventing approval or evidence.
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";

async function project(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-migrate-"));
  temps.push(dir);
  await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
  return dir;
}

function card(dir: string, id: string, title: string, status = "done", approval = ""): string {
  mkdirSync(join(dir, `.groundwork/evidence/${id}`), { recursive: true });
  writeFileSync(join(dir, `.groundwork/evidence/${id}/tests.txt`), "5 passed\n");
  const path = join(dir, `.groundwork/cards/${id}.md`);
  writeFileSync(
    path,
    `---\nid: ${id}\ntitle: ${title}\nphase: 1\nstatus: ${status}\ndepends_on: []\n---\n## Goal\n${title}.\n## Acceptance criteria\n- [x] Works.\n## Evidence\n- [tests](../evidence/${id}/tests.txt), 5 passed.\n## History\n- 2026-10-18 done\n${approval}`,
  );
  return path;
}

const check = (dir: string) => run(["check"], { cwd: dir, ask: noQuestions });
const git = (dir: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

describe("migrate legacy", () => {
  it("exempts only the recorded pre-approval card, and does not touch evidence", async () => {
    const dir = await project();
    const legacy = card(dir, "1.1", "Old card");
    expect((await check(dir)).code).toBe(1);

    const dry = await run(["migrate", "legacy"], { cwd: dir, ask: noQuestions });
    expect(dry.code).toBe(0);
    expect(dry.output).toMatch(/Nothing written/);
    expect((await check(dir)).code).toBe(1);

    const migrated = await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions });
    expect(migrated.code).toBe(0);
    expect(readFileSync(join(dir, ".groundwork/evidence/1.1/tests.txt"), "utf8")).toBe("5 passed\n");
    expect((await check(dir)).code).toBe(0);

    card(dir, "1.2", "New card");
    expect((await check(dir)).code).toBe(1);

    writeFileSync(legacy, `${readFileSync(legacy, "utf8")}\n`);
    expect((await check(dir)).code).toBe(1);
  });

  it("exempts only the approval line, never missing evidence", async () => {
    const dir = await project();
    card(dir, "1.1", "Old card");
    const evidence = join(dir, ".groundwork/evidence/1.1/tests.txt");
    rmSync(evidence);
    expect((await check(dir)).output).toMatch(/doesn't exist/);
    expect((await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions })).code).toBe(0);
    const migrated = await check(dir);
    expect(migrated.code).toBe(1);
    expect(migrated.output).toMatch(/doesn't exist/);
    expect(migrated.output).not.toMatch(/approved by human/);
    writeFileSync(evidence, "5 passed\n");
    expect((await check(dir)).code).toBe(0);
  });

  it("does not exempt an active card, and ignores approval words outside History on a done card", async () => {
    const dir = await project();
    const active = card(dir, "1.1", "Active card", "implementing");
    writeFileSync(active, readFileSync(active, "utf8").replace("## Goal\nActive card.", "## Goal\nActive card, approved by human."));
    const migrated = await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions });
    expect(migrated.output).toMatch(/No legacy cards/);
    expect(existsSync(join(dir, ".groundwork/.legacy-cards.json"))).toBe(false);

    const donePath = card(dir, "1.2", "Done card", "done");
    writeFileSync(donePath, readFileSync(donePath, "utf8").replace("## Goal\nDone card.", "## Goal\nDone card, approved by human."));
    const recorded = await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions });
    expect(recorded.output).toMatch(/record\s+1\.2/);
    expect((await check(dir)).code).toBe(0); // the real approval line is exempted, but not invented
  });

  it("keeps applicable context failures for a migrated card", async () => {
    const dir = await project();
    git(dir, "init", "-q", "--initial-branch=main");
    mkdirSync(join(dir, ".groundwork/decisions"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/decisions/0001-storage.md"),
      "---\nid: 0001\ntitle: Storage\nstatus: accepted\n---\nUse SQLite.\n",
    );
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "baseline");
    const base = git(dir, "rev-parse", "HEAD");
    mkdirSync(join(dir, ".groundwork/work/1.1"), { recursive: true });
    writeFileSync(
      join(dir, ".groundwork/work/1.1/context.json"),
      JSON.stringify(
        {
          version: 1,
          base,
          deps: [{ ref: "decision:0001", path: ".groundwork/decisions/0001-storage.md", recorded: "0".repeat(64) }],
        },
        null,
        2,
      ),
    );
    card(dir, "1.1", "Old card");
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "old card");
    expect((await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions })).code).toBe(0);

    const result = await run(["check", "--task", "1.1", "--base", "main"], { cwd: dir, ask: noQuestions });
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/decision:0001:.*verdict=reassess/);
    expect(result.output).not.toMatch(/approved by human/);
  });

  it("leaves PR-integration projects alone", async () => {
    const dir = await project();
    card(dir, "1.1", "Old card");
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ approvalMode: "per-card", integration: "pr", guards: [] }));
    const result = await run(["migrate", "legacy", "--yes"], { cwd: dir, ask: noQuestions });
    expect(result.code).toBe(0);
    expect(result.output).toMatch(/PR integration/);
    expect(readFileSync(join(dir, ".groundwork/cards/1.1.md"), "utf8")).not.toMatch(/approved by human/);
  });
});

// The legacy migration records pre-approval cards without inventing approval or evidence.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

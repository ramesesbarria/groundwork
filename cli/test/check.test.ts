// `groundwork check`: the workflow's card rules, enforced by code.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";
import { cardRules } from "../src/check.js";
import { CARD_STATUSES, TRANSITIONS } from "../src/schema.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";

async function project(approvalMode = "per-card"): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-check-"));
  temps.push(dir);
  mkdirSync(join(dir, ".git"));
  await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
  writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ approvalMode, guards: [] }));
  return dir;
}

function card(dir: string, id: string, status: string, body: { criteria?: string; evidence?: string; history?: string }) {
  const text = [
    "---",
    `id: ${id}`,
    `title: Card ${id}`,
    "phase: 1",
    `status: ${status}`,
    "depends_on: []",
    "---",
    "## Goal",
    "A thing works.",
    "",
    "## Acceptance criteria",
    body.criteria ?? "- [x] It works",
    "",
    "## Evidence",
    body.evidence ?? "",
    "",
    "## History",
    body.history ?? "- 2026-09-29 started",
    "",
  ].join("\n");
  writeFileSync(join(dir, `.groundwork/cards/${id}-card.md`), text);
}

function evidence(dir: string, id: string, name = "tests.txt") {
  mkdirSync(join(dir, ".groundwork/evidence", id), { recursive: true });
  writeFileSync(join(dir, ".groundwork/evidence", id, name), "5 passed\n");
}

const check = (dir: string, ...args: string[]) => run(["check", ...args], { cwd: dir, ask: noQuestions });

describe("groundwork check", () => {
  it("fails a card marked done with no evidence, an unchecked criterion and no approval", async () => {
    const dir = await project();
    card(dir, "1.1", "done", { criteria: "- [ ] Lists the books" });
    const { code, output } = await check(dir);
    expect(code).toBe(1);
    expect(output).toMatch(/Evidence section is empty/);
    expect(output).toMatch(/1 acceptance criterion isn't checked/);
    expect(output).toMatch(/no "approved by human" line/);
  });

  it("fails a card awaiting approval that links evidence that doesn't exist", async () => {
    const dir = await project();
    card(dir, "1.2", "awaiting-approval", { evidence: "- Tests: [tests.txt](../evidence/1.2/tests.txt), 5 passed" });
    const { code, output } = await check(dir, "1.2");
    expect(code).toBe(1);
    expect(output).toMatch(/links to \.groundwork\/evidence\/1\.2\/tests\.txt, which doesn't exist/);
  });

  it("passes a complete card approved by the human", async () => {
    const dir = await project();
    evidence(dir, "1.1");
    card(dir, "1.1", "done", {
      criteria: "- [x] Lists the books\n- [ ] Works offline — out of scope, agreed in the spec",
      evidence: "- Tests: `.groundwork/evidence/1.1/tests.txt`, 5 passed",
      history: "- 2026-09-29 todo → testing: started\n- 2026-09-29 review → awaiting-approval: passed\n- 2026-09-29 approved by human",
    });
    const { code, output } = await check(dir);
    expect(output).toMatch(/No problems found/);
    expect(code).toBe(0);
  });

  it("in per-phase mode, a done card needs no approval line", async () => {
    const dir = await project("per-phase");
    evidence(dir, "1.1");
    card(dir, "1.1", "done", { evidence: "- `.groundwork/evidence/1.1/tests.txt`" });
    expect((await check(dir)).code).toBe(0);
  });

  it("fails a status move the workflow doesn't allow", async () => {
    const dir = await project();
    card(dir, "1.1", "implementing", { history: "- 2026-09-29 todo → awaiting-approval: skipped ahead" });
    const { code, output } = await check(dir);
    expect(code).toBe(1);
    expect(output).toMatch(/from todo to awaiting-approval, which the workflow doesn't allow/);
  });

  it("says so for a card id that doesn't exist", async () => {
    const dir = await project();
    const { code, output } = await check(dir, "9.9");
    expect(code).toBe(1);
    expect(output).toMatch(/No card with id 9\.9/);
  });

  it("doctor reports the same problems", async () => {
    const dir = await project();
    card(dir, "1.1", "done", {});
    const { code, output } = await run(["doctor"], { cwd: dir, ask: noQuestions });
    expect(code).toBe(1);
    expect(output).toMatch(/Card 1\.1: it's done, but its Evidence section is empty/);
  });
});

describe("the shared card rules", () => {
  it("use the same statuses and transitions as the CLI's schema", async () => {
    const rules = await cardRules();
    expect(rules.STATUSES).toEqual([...CARD_STATUSES]);
    expect(rules.TRANSITIONS).toEqual(TRANSITIONS.map(([a, b]) => [a, b]));
  });
});

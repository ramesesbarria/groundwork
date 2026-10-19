// `groundwork check`: the workflow's card rules, enforced by code.
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";
import { cardRules } from "../src/check.js";
import { CARD_TOKEN_LIMIT } from "../src/doctor.js";
import { CARD_STATUSES, TRANSITIONS } from "../src/schema.js";
import { estimateTokens } from "../src/tokens.js";

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

function card(dir: string, id: string, status: string, body: { criteria?: string; evidence?: string; history?: string; human?: string }) {
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
    ...(body.human ? ["## Human checks", body.human, ""] : []),
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

  it("fails an empty evidence file", async () => {
    const dir = await project();
    mkdirSync(join(dir, ".groundwork/evidence/1.2"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/evidence/1.2/tests.txt"), "");
    card(dir, "1.2", "awaiting-approval", { evidence: "- Tests: [tests.txt](../evidence/1.2/tests.txt), 0 passed" });
    const { code, output } = await check(dir, "1.2");
    expect(code).toBe(1);
    expect(output).toMatch(/Evidence file \.groundwork\/evidence\/1\.2\/tests\.txt is empty/);
  });

  it.each([
    "`.groundwork/evidence/1.2/review2-*`",
    "`../evidence/1.2/review2-*`",
    "[round 2](../evidence/1.2/review2-*)",
  ])("tells the pattern link %s apart from a missing file", async (link) => {
    const dir = await project();
    card(dir, "1.2", "awaiting-approval", { evidence: `- ${link}` });
    const { code, output } = await check(dir, "1.2");
    expect(code).toBe(1);
    expect(output).toMatch(/review2-\*, which is a pattern/);
    expect(output).toMatch(/Patterns aren't checked: list each file/);
    expect(output).not.toMatch(/doesn't exist/);
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

  it("in PR integration, a done card needs no local approval line", async () => {
    const dir = await project();
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ approvalMode: "per-card", integration: "pr", guards: [] }));
    evidence(dir, "1.1");
    card(dir, "1.1", "done", { evidence: "- `.groundwork/evidence/1.1/tests.txt`" });
    expect((await check(dir)).code).toBe(0);
  });

  it("lists open human checks without failing, and ignores confirmed ones", async () => {
    const dir = await project();
    evidence(dir, "1.2");
    card(dir, "1.2", "awaiting-approval", {
      criteria: "- [x] Lists books\n- [ ] Tab walk shows a focus ring — needs a human check",
      evidence: "- `.groundwork/evidence/1.2/tests.txt`",
      human: "- [ ] Press Tab from the address bar; the ring is visible\n- [x] No sideways scroll at 320px — 2026-10-01",
    });
    const { code, output } = await check(dir, "1.2");
    expect(code).toBe(0);
    expect(output).toMatch(/1 open human check \(confirm or waive at approval\)/);
    expect(output).toContain("○ Press Tab from the address bar; the ring is visible");
    expect(output).not.toContain("sideways scroll");
    expect(output).toMatch(/No problems found/);
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

  it("parse Human checks, open and confirmed", async () => {
    const rules = await cardRules();
    expect(rules.humanChecks("## Human checks\n- [ ] Tab walk\n- [x] Widths at 320px — 2026-10-01\n")).toEqual([
      { text: "Tab walk", checked: false },
      { text: "Widths at 320px — 2026-10-01", checked: true },
    ]);
  });

  it("ties the card size limit to the CLI's estimate, and flags only cards over it", async () => {
    const rules = await cardRules();
    expect(rules.CARD_TOKEN_LIMIT).toBe(CARD_TOKEN_LIMIT); // the gate's limit and doctor's can't drift
    for (const sample of ["", "abcde", "x".repeat(999)]) {
      expect(rules.estimateCardTokens(sample)).toBe(estimateTokens(sample));
    }
    const projectDir = mkdtempSync(join(tmpdir(), "groundwork-size-"));
    temps.push(projectDir);
    const head = "---\nid: 9.9\ntitle: Big\nphase: 9\nstatus: todo\ndepends_on: []\n---\n## Goal\n";
    const cardOf = (length: number) => head + "x".repeat(length - head.length);
    const limit = rules.CARD_TOKEN_LIMIT;
    expect(estimateTokens(cardOf(limit * 4))).toBe(limit);
    expect(rules.checkCard(cardOf(limit * 4), { projectDir }).some((p) => p.includes("over 1500"))).toBe(false);
    const over = rules.checkCard(cardOf(limit * 4 + 1), { projectDir });
    expect(over.some((p) => p.includes("over 1500"))).toBe(true);
    expect(over.join(" ")).toMatch(/details belong in the evidence files/);
  });

  it("reports an oversized card in check, before anyone approves it", async () => {
    const dir = await project();
    const head = "---\nid: 9.9\ntitle: Big\nphase: 9\nstatus: todo\ndepends_on: []\n---\n## Goal\n";
    writeFileSync(join(dir, ".groundwork/cards/9.9-big.md"), head + "x".repeat(6001 - head.length));
    const { code, output } = await check(dir, "9.9");
    expect(code).toBe(1);
    expect(output).toMatch(/≈1501 tokens, over 1500/);
    expect(output).toMatch(/keep every call/);
  });

  it("counts the lines approval will add while a card waits for review or approval", async () => {
    const rules = await cardRules();
    const projectDir = mkdtempSync(join(tmpdir(), "groundwork-size-"));
    temps.push(projectDir);
    const cardAt = (status: string, tokens: number) => {
      const head = `---\nid: 9.9\ntitle: Big\nphase: 9\nstatus: ${status}\ndepends_on: []\n---\n## Goal\n`;
      return head + "x".repeat(tokens * 4 - head.length);
    };
    const waiting = rules.checkCard(cardAt("awaiting-approval", 1480), { projectDir }).join(" ");
    expect(waiting).toMatch(/≈1530 tokens counting the ≈50 the approval lines will add, over 1500/);
    expect(rules.checkCard(cardAt("review", 1480), { projectDir }).join(" ")).toMatch(/over 1500/);
    expect(rules.checkCard(cardAt("awaiting-approval", 1450), { projectDir }).join(" ")).not.toMatch(/over 1500/);
    // The approval adds about 150 characters: a card that passed while waiting still passes as done.
    const approved = `${cardAt("done", 1450)}\n- 2026-10-19 awaiting-approval → done: approved by human\n- 2026-10-19 approved by human\n- 2026-10-19 human checks confirmed: 0; waived: 0 — none open\n`;
    expect(rules.checkCard(approved, { projectDir, cardSize: true }).join(" ")).not.toMatch(/over 1500/);
  });

  it("leaves committed, unchanged done cards alone, and checks a done card not yet committed", async () => {
    const dir = await project();
    rmSync(join(dir, ".git"), { recursive: true });
    const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=T", "-c", "user.email=t@t", ...args], { cwd: dir, stdio: "ignore" });
    git("init", "-q");
    const big = (id: string) => {
      card(dir, id, "done", { history: "- 2026-10-19 approved by human" });
      const path = join(dir, `.groundwork/cards/${id}-card.md`);
      writeFileSync(path, readFileSync(path, "utf8").replace("A thing works.", `A thing works. ${"y".repeat(6000)}`));
    };
    big("1.1");
    git("add", "-A");
    git("commit", "-qm", "old big card");
    expect((await check(dir, "1.1")).output).not.toMatch(/over 1500/);
    big("1.2");
    const fresh = await check(dir, "1.2");
    expect(fresh.code).toBe(1);
    expect(fresh.output).toMatch(/over 1500/);
  });
});

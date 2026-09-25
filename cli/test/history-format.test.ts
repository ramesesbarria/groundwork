// The card template shows the History formats that `retro` and `doctor` parse.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");
const template = core("templates/card.md");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const noQuestions = async () => "";
async function installed(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-history-"));
  temps.push(dir);
  await run(["init", "--adapter", "none"], { cwd: dir, ask: noQuestions });
  return dir;
}

// The example lines in the template's History comment, e.g. "YYYY-MM-DD rejected: <reason>".
const examples = () => [...template.matchAll(/^\s*- (YYYY-MM-DD .+)$/gm)].map((m) => m[1].trim());

// A card built from the template, with the examples filled in.
function cardFrom(status: string, lines: string[]): string {
  const filled = lines.map((l) => `- ${l.replace("YYYY-MM-DD", "2026-09-20").replace(/<[^>]+>/g, "the example text")}`);
  return template
    .replace(/^id: .*$/m, "id: 1.1")
    .replace(/^title: .*$/m, "title: Example")
    .replace(/^phase: .*$/m, "phase: 1")
    .replace(/^status: .*$/m, `status: ${status}`)
    .replace(/## History[\s\S]*$/, `## History\n${filled.join("\n")}\n`);
}

describe("History formats", () => {
  it("the template shows the three formats the tools parse", () => {
    expect(examples()).toEqual(
      expect.arrayContaining(["YYYY-MM-DD rejected: <reason>", "YYYY-MM-DD review → implementing: <problems>", "YYYY-MM-DD approved by human"]),
    );
  });

  it("the workflow points to the template for the formats", () => {
    expect(core("workflow.md")).toMatch(/History[^\n]*formats[^\n]*templates\/card\.md|templates\/card\.md[^\n]*formats/);
  });

  it("retro finds every signal in a card written from the examples", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".groundwork/cards/1.1-example.md"), cardFrom("done", examples()));
    const { output } = await run(["retro"], { cwd: dir, ask: noQuestions });
    expect(output).toMatch(/Rejections \(1\)/);
    expect(output).toMatch(/Sent back by review \(1\)/);
  });

  it("ignores the examples in a card that still has the template's comment", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".groundwork/cards/1.1-example.md"), template.replace(/^id: .*$/m, "id: 1.1").replace(/^status: .*$/m, "status: todo"));
    expect((await run(["retro"], { cwd: dir, ask: noQuestions })).output).toMatch(/No signals found/);
    expect((await run(["doctor"], { cwd: dir, ask: noQuestions })).output).not.toMatch(/Card 1\.1/);
  });

  it("doctor reads the approval line", async () => {
    const dir = await installed();
    const approved = examples().filter((l) => /approved/.test(l));
    writeFileSync(join(dir, ".groundwork/cards/1.1-example.md"), cardFrom("review", approved));
    const { output } = await run(["doctor"], { cwd: dir, ask: noQuestions });
    expect(output).toMatch(/Card 1\.1: History says it was approved/);
  });
});

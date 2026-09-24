// Card 9.6: the agent keeps working on small questions, but every judgment call is logged and shown.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const CALL_FORMAT = "YYYY-MM-DD call: <what> — <why> — <cost if wrong>";

describe("when to stop", () => {
  const stopList = () => section(core("workflow.md"), "Stop only for");

  it("the workflow has a short Stop only for list, in plain words", () => {
    const text = stopList();
    expect(text).toMatch(/destructive|can't be undone/i);
    expect(text).toMatch(/security/i);
    expect(text).toMatch(/new dependency|stack/i);
    expect(text).toMatch(/decision record/i);
    expect(text).toMatch(/what users see/i);
    expect(text.split("\n").filter((l) => l.startsWith("- ")).length).toBeLessThanOrEqual(5);
  });

  it("everything else is decided and logged as a call", () => {
    expect(stopList()).toContain(CALL_FORMAT);
  });
});

describe("calls are shown", () => {
  it("the card template shows the call format", () => {
    expect(core("templates/card.md")).toContain(`- ${CALL_FORMAT}`);
  });

  it("the approval summary lists the card's calls", () => {
    const step7 = section(core("commands/gw-next.md"), "Steps");
    expect(step7).toMatch(/`call:`/);
  });

  it("phase approval shows every call from that phase's cards", () => {
    const text = core("commands/gw-approve.md");
    const phase = text.slice(text.indexOf("**Approving a phase"));
    expect(phase).toMatch(/every `call:` line/i);
  });
});

describe("retro and calls", () => {
  const temps: string[] = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  async function projectWith(cards: Record<string, string[]>): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-calls-"));
    temps.push(dir);
    await run(["init", "--adapter", "none"], { cwd: dir, ask: async () => "" });
    for (const [id, history] of Object.entries(cards)) {
      writeFileSync(
        join(dir, `.groundwork/cards/${id}-x.md`),
        `---\nid: ${id}\ntitle: X\nphase: 1\nstatus: done\ndepends_on: []\n---\n## History\n${history.map((h) => `- ${h}`).join("\n")}\n`,
      );
    }
    return dir;
  }

  it("finds a call that was followed by a rejection", async () => {
    const dir = await projectWith({
      "1.1": [
        "2026-09-20 call: used a modal for the confirm step — matches the rest of the app — easy to swap for a page",
        "2026-09-21 rejected: the confirm step should be its own page",
      ],
      "1.2": ["2026-09-20 call: kept dates in UTC — simpler storage — display bugs near midnight", "2026-09-21 approved by human"],
    });
    const { output } = await run(["retro"], { cwd: dir });
    expect(output).toMatch(/Calls later rejected \(1\)/);
    expect(output).toMatch(/1\.1[^\n]*used a modal[^\n]*own page/);
    expect(output).not.toMatch(/kept dates in UTC/);
  });

  it("doesn't count a lesson twice when a rejected call repeats the rejection", async () => {
    const dir = await projectWith({
      "1.1": ["2026-09-20 call: skipped the empty state — rare — confusing screen", "2026-09-21 rejected: needs an empty state (L-004)"],
    });
    expect((await run(["retro"], { cwd: dir })).output).toMatch(/L-004: 1 signal\b/);
  });
});

// Card 9.3: people see plain status labels; card files keep the internal statuses.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";
import { CARD_STATUSES, STATUS_LABELS } from "../src/schema.js";
import { parseFrontmatter } from "../src/frontmatter.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { orientation } from "../../core/hooks/session-start.mjs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
async function installed(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-labels-"));
  temps.push(dir);
  await run(["init", "--adapter", "none"], { cwd: dir, ask: async () => "" });
  return dir;
}
const card = (id: string, title: string, status: string) =>
  `---\nid: ${id}\ntitle: ${title}\nphase: 1\nstatus: ${status}\ndepends_on: []\n---\n## Goal\nx\n`;

describe("plain status labels", () => {
  it.each([...CARD_STATUSES])("%s has a plain label", (status) => {
    expect(STATUS_LABELS[status]).toMatch(/^[a-z ]+$/);
  });

  it("uses the words the plan asks for", () => {
    expect(STATUS_LABELS.todo).toBe("to do");
    expect(STATUS_LABELS.implementing).toBe("being built");
    expect(STATUS_LABELS["awaiting-approval"]).toBe("waiting for you");
    expect(STATUS_LABELS.done).toBe("done");
    expect(STATUS_LABELS.rejected).toBe("sent back");
  });

  it("groundwork status shows labels, and leaves the card files unchanged", async () => {
    const dir = await installed();
    const files = {
      "1.1-a.md": card("1.1", "A", "awaiting-approval"),
      "1.2-b.md": card("1.2", "B", "rejected"),
      "1.3-c.md": card("1.3", "C", "todo"),
    };
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, ".groundwork/cards", name), text);

    const { output } = await run(["status"], { cwd: dir });
    expect(output).toMatch(/1 waiting for you/);
    expect(output).toMatch(/1 sent back/);
    expect(output).toMatch(/1 to do/);
    expect(output).toMatch(/1\.1 A \(waiting for you\)/);
    expect(output).not.toMatch(/awaiting-approval/);
    for (const [name, text] of Object.entries(files)) expect(readFileSync(join(dir, ".groundwork/cards", name), "utf8")).toBe(text);
  });

  it("the workflow tells agents to use the same labels with the human", () => {
    const workflow = core("workflow.md");
    for (const label of Object.values(STATUS_LABELS)) expect(workflow).toContain(label);
  });

  it("the session-start hook uses the same labels", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), "- **Current card:** 1.1 A\n- **Status:** awaiting-approval\n");
    expect(orientation(dir)).toContain(`is ${STATUS_LABELS["awaiting-approval"]}`);
  });
});

describe("quoted titles", () => {
  it("reads a quoted frontmatter value without the quotes", () => {
    expect(parseFrontmatter('---\ntitle: "README: first 10 minutes"\n---\n').title).toBe("README: first 10 minutes");
    expect(parseFrontmatter("---\ntitle: 'single'\n---\n").title).toBe("single");
  });

  it("groundwork status shows a quoted title without quotes", async () => {
    const dir = await installed();
    writeFileSync(join(dir, ".groundwork/cards/1.1-a.md"), card("1.1", '"`/gw`: the entry"', "todo"));
    const { output } = await run(["status"], { cwd: dir });
    expect(output).toContain("1.1 `/gw`: the entry");
  });
});

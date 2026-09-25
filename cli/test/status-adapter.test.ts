// `groundwork status` and `groundwork adapter add`.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/index.js";
import { compareCardIds } from "../src/cards.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-status-"));
  temps.push(dir);
  return dir;
}

function answers(...replies: string[]) {
  const asked: string[] = [];
  return {
    asked,
    ask: async (question: string) => {
      asked.push(question);
      return replies.shift() ?? "";
    },
  };
}

async function installed(adapter = "none"): Promise<string> {
  const dir = tempDir();
  await run(["init", "--adapter", adapter], { cwd: dir, ask: answers().ask });
  return dir;
}

function writeCard(dir: string, id: string, title: string, status: string, deps: string[] = []) {
  const slug = title.toLowerCase().replace(/\W+/g, "-");
  writeFileSync(
    join(dir, `.groundwork/cards/${id}-${slug}.md`),
    `---\nid: ${id}\ntitle: ${title}\nphase: ${id.split(".")[0]}\nstatus: ${status}\ndepends_on: [${deps.join(", ")}]\n---\n## Goal\nx\n`,
  );
}

describe("compareCardIds", () => {
  it("compares IDs as numbers, part by part", () => {
    expect(["1.10", "1.2", "2.1", "1.1"].sort(compareCardIds)).toEqual(["1.1", "1.2", "1.10", "2.1"]);
  });
});

describe("groundwork status", () => {
  it("says to run init when Groundwork isn't installed", async () => {
    const { code, output } = await run(["status"], { cwd: tempDir() });
    expect(code).toBe(1);
    expect(output).toMatch(/npx groundwork-ai init/);
  });

  it("shows HANDOFF's phase and card, counts by status, the next ready card and what's blocked", async () => {
    const dir = await installed();
    writeFileSync(
      join(dir, ".groundwork/HANDOFF.md"),
      "# Handoff\n\n- **Phase:** 1 (Local tracker)\n- **Current card:** 1.1 Skeleton\n- **Status:** implementing\n- **Next step:** finish 1.1\n",
    );
    writeCard(dir, "1.1", "Skeleton", "done");
    writeCard(dir, "1.2", "Meal rules", "todo", ["1.1"]);
    writeCard(dir, "1.10", "Later thing", "todo", ["1.1"]);
    writeCard(dir, "1.3", "Double feeding", "todo", ["1.2"]);
    writeCard(dir, "1.4", "Storage", "implementing", ["1.1"]);

    const { code, output } = await run(["status"], { cwd: dir });
    expect(code).toBe(0);
    expect(output).toContain("1 (Local tracker)");
    expect(output).toContain("1.1 Skeleton");
    expect(output).toMatch(/1 done/);
    expect(output).toMatch(/3 to do/); // plain labels since card 9.3
    expect(output).toMatch(/1 being built/);
    expect(output).toMatch(/Next ready:\s+1\.2 Meal rules/);
    expect(output).toMatch(/1\.3 Double feeding[^\n]*1\.2/);
    expect(output).toMatch(/In progress:[^\n]*\n?[^\n]*1\.4 Storage/);
  });

  it("works with no cards yet", async () => {
    const { code, output } = await run(["status"], { cwd: await installed() });
    expect(code).toBe(0);
    expect(output).toMatch(/no cards yet/i);
  });
});

describe("groundwork adapter add", () => {
  it("adds the Claude Code files to an installed project", async () => {
    const dir = await installed("none");
    const { code } = await run(["adapter", "add", "claude-code"], { cwd: dir, ask: answers().ask });
    expect(code).toBe(0);
    expect(existsSync(join(dir, ".claude/skills/gw-next/SKILL.md"))).toBe(true);
    expect(readFileSync(join(dir, "CLAUDE.md"), "utf8")).toContain("@AGENTS.md");
  });

  it("adds OpenCode alongside an existing Claude Code install", async () => {
    const dir = await installed("claude-code");
    const { code } = await run(["adapter", "add", "opencode"], { cwd: dir, ask: answers().ask });
    expect(code).toBe(0);
    expect(existsSync(join(dir, ".opencode/commands/gw-next.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/skills/gw-next/SKILL.md"))).toBe(true);
  });

  it("is quiet when everything is up to date, and asks before overwriting a changed file", async () => {
    const dir = await installed("claude-code");
    const first = answers();
    const { output } = await run(["adapter", "add", "claude-code"], { cwd: dir, ask: first.ask });
    expect(first.asked).toEqual([]);
    expect(output).toMatch(/up to date/i);

    writeFileSync(join(dir, ".claude/skills/gw-next/SKILL.md"), "my edit\n");
    const second = answers("n");
    await run(["adapter", "add", "claude-code"], { cwd: dir, ask: second.ask });
    expect(second.asked.some((q) => q.includes("gw-next/SKILL.md"))).toBe(true);
    expect(readFileSync(join(dir, ".claude/skills/gw-next/SKILL.md"), "utf8")).toBe("my edit\n");
  });

  it("builds adapter files from the project's own .groundwork/", async () => {
    const dir = await installed("none");
    writeFileSync(
      join(dir, ".groundwork/commands/gw-custom.md"),
      "---\nname: gw-custom\ndescription: A project-specific command added by the team.\n---\n# gw-custom\n",
    );
    await run(["adapter", "add", "claude-code"], { cwd: dir, ask: answers().ask });
    expect(existsSync(join(dir, ".claude/skills/gw-custom/SKILL.md"))).toBe(true);
  });

  it("rejects an unknown adapter, and a project without Groundwork", async () => {
    const dir = await installed();
    expect((await run(["adapter", "add", "vim"], { cwd: dir, ask: answers().ask })).code).toBe(1);
    const bare = await run(["adapter", "add", "claude-code"], { cwd: tempDir(), ask: answers().ask });
    expect(bare.code).toBe(1);
    expect(bare.output).toMatch(/npx groundwork-ai init/);
  });
});

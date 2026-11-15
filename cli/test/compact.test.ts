// Bounded size: per-file budgets enforced by doctor, and `groundwork compact` to get back under them.
// Nothing is deleted: what leaves the loaded set stays in the repository, under .groundwork/archive/.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, install, read, repo, write } from "./support.js";
import { estimateTokens } from "../src/tokens.js";

const entry = (day: number, year = 2026) =>
  `## ${year}-01-${String(day).padStart(2, "0")} 10:00 UTC · main @ ${String(day).padStart(7, "a")}\n- Commits (1):\n  - abc feat: ${"work ".repeat(60)}${day}`;

async function project(flow = false): Promise<string> {
  const dir = await install(repo(), { flow });
  await cli(dir, "checkpoint", "--now", "A", "--next", "B");
  return dir;
}

describe("groundwork compact", () => {
  it("does nothing, and says so, when everything is within budget", async () => {
    const dir = await project();
    const { code, output } = await cli(dir, "compact");
    expect(code).toBe(0);
    expect(output).toMatch(/Nothing to compact/);
    expect(existsSync(join(dir, ".groundwork/archive"))).toBe(false);
  });

  it("archives the oldest journal entries by year, keeping the newest inside the budget", async () => {
    const dir = await project();
    const entries = [...Array.from({ length: 30 }, (_, i) => entry(i + 1, 2025)), ...Array.from({ length: 30 }, (_, i) => entry(i + 1))];
    writeFileSync(join(dir, ".groundwork/JOURNAL.md"), `# Journal\n\n<!-- a log -->\n\n${entries.join("\n\n")}\n`);
    expect((await cli(dir, "doctor")).code).toBe(1);

    const { code, output } = await cli(dir, "compact");
    expect(code).toBe(0);
    expect(output).toMatch(/archive {4}30 journal entries → \.groundwork\/archive\/JOURNAL-2025\.md/);
    expect(output).toMatch(/Nothing was deleted/);
    const journal = read(dir, ".groundwork/JOURNAL.md");
    expect(estimateTokens(journal)).toBeLessThanOrEqual(2500);
    expect(journal).toContain("<!-- a log -->");
    expect(journal).toContain(entry(30)); // the newest stays
    // Every entry is still in the repository, each exactly once.
    const all = [journal, read(dir, ".groundwork/archive/JOURNAL-2025.md"), read(dir, ".groundwork/archive/JOURNAL-2026.md")].join("\n");
    for (const e of entries) expect(all.split(e).length - 1).toBe(1);
    expect((await cli(dir, "doctor")).code).toBe(0);
    // Running it again changes nothing, and appends to the same archive next time.
    expect((await cli(dir, "compact")).output).toMatch(/Nothing to compact/);
  });

  it("always keeps the newest journal entry, however long it is", async () => {
    const dir = await project();
    const huge = `## 2026-02-01 10:00 UTC · main @ bbbbbbb\n- Note: ${"x".repeat(20_000)}`;
    writeFileSync(join(dir, ".groundwork/JOURNAL.md"), `# Journal\n\n${entry(1)}\n\n${huge}\n`);
    await cli(dir, "compact");
    expect(read(dir, ".groundwork/JOURNAL.md")).toContain(huge);
    expect(read(dir, ".groundwork/archive/JOURNAL-2026.md")).toContain(entry(1));
  });

  it("moves superseded decisions out of the loaded set and regenerates the index", async () => {
    const dir = await project();
    await cli(dir, "decide", "Host on a VPS", "--status", "superseded");
    await cli(dir, "decide", "Host on a platform", "--status", "accepted");
    const { output } = await cli(dir, "compact");
    expect(output).toContain("archive    .groundwork/decisions/0001-host-on-a-vps.md (superseded) → .groundwork/archive/decisions/0001-host-on-a-vps.md");
    expect(existsSync(join(dir, ".groundwork/decisions/0001-host-on-a-vps.md"))).toBe(false);
    expect(read(dir, ".groundwork/archive/decisions/0001-host-on-a-vps.md")).toContain("title: Host on a VPS");
    const index = read(dir, ".groundwork/DECISIONS.md");
    expect(index).not.toContain("Host on a VPS");
    expect(index).toContain("Host on a platform");
    expect(index).toContain("1 superseded decision archived in `.groundwork/archive/decisions/`.");
    // Its number is never reused.
    expect((await cli(dir, "decide", "Something new")).output).toContain("0003-something-new.md");
    expect((await cli(dir, "index", "--check")).code).toBe(0);
  });

  it("trims a handoff that has grown log sections, keeping the whole old file", async () => {
    const dir = await project();
    const path = join(dir, ".groundwork/HANDOFF.md");
    const log = `\n## Session log 2026-10-01\n${"- did a thing that took a while to describe\n".repeat(120)}\n## Session log 2026-10-02\n- more\n`;
    const grown = read(dir, ".groundwork/HANDOFF.md") + log;
    writeFileSync(path, grown);
    const doctor = await cli(dir, "doctor");
    expect(doctor.code).toBe(1);
    expect(doctor.output).toMatch(/\.groundwork\/HANDOFF\.md is ≈\d+ tokens, over its 600-token budget/);
    expect(doctor.output).toMatch(/has sections a handoff doesn't define \(Session log 2026-10-01, Session log 2026-10-02\)/);

    const { output } = await cli(dir, "compact");
    expect(output).toMatch(/archive {4}2 sections of \.groundwork\/HANDOFF\.md \(Session log 2026-10-01, Session log 2026-10-02\) → \.groundwork\/archive\/HANDOFF-\d{4}-\d\d-\d\d\.md/);
    const trimmed = read(dir, ".groundwork/HANDOFF.md");
    expect(trimmed).not.toContain("Session log");
    expect(trimmed).toContain("## Now\nA");
    expect(trimmed).toContain("## Next\nB");
    expect(trimmed).toMatch(/^---\nschema: 2\nupdated: /);
    const [archive] = readdirSync(join(dir, ".groundwork/archive")).filter((name) => name.startsWith("HANDOFF-"));
    expect(read(dir, `.groundwork/archive/${archive}`)).toContain(grown.trim());
    expect((await cli(dir, "doctor")).code).toBe(0);
  });

  it("rewrites a handoff from before 2.0 in the 2.0 layout, and says what it can't shorten", async () => {
    const dir = await project(true);
    const old = `# Handoff\n\n- **Current card:** 1.3 Login\n- **Next step:** make them pass\n- **Notes:**\n${"  - a long note that only a person can judge\n".repeat(150)}`;
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), old);
    const { output } = await cli(dir, "compact");
    expect(output).toMatch(/rewrite {4}\.groundwork\/HANDOFF\.md in the 2\.0 layout/);
    expect(output).toMatch(/note {7}\.groundwork\/HANDOFF\.md is still ≈\d+ tokens \(budget 600\): shorten its sections by hand/);
    const text = read(dir, ".groundwork/HANDOFF.md");
    expect(text).toContain("## Next\nmake them pass");
    expect(text).toContain("## Flow\n- **Current card:** 1.3 Login");
  });

  it("--dry-run lists the changes and writes nothing", async () => {
    const dir = await project();
    await cli(dir, "decide", "Old", "--status", "superseded");
    const before = read(dir, ".groundwork/DECISIONS.md");
    const { code, output } = await cli(dir, "compact", "--dry-run");
    expect(code).toBe(0);
    expect(output).toMatch(/^Dry run: compacting would change:/);
    expect(output).toContain("0001-old.md (superseded)");
    expect(output).toMatch(/Nothing was written\.$/);
    expect(existsSync(join(dir, ".groundwork/decisions/0001-old.md"))).toBe(true);
    expect(existsSync(join(dir, ".groundwork/archive"))).toBe(false);
    expect(read(dir, ".groundwork/DECISIONS.md")).toBe(before);
  });
});

describe("doctor checks project memory", () => {
  it("passes on a fresh install and reports each memory file against its budget", async () => {
    const { code, output } = await cli(await project(), "doctor");
    expect(code).toBe(0);
    expect(output).toMatch(/Handoff: +fresh: written at the current commit/);
    expect(output).toMatch(/Brief: +≈\d+ tokens \(budget 1500\), printed by `npx groundwork-ai brief`/);
    expect(output).toMatch(/Memory files: +handoff \d+\/600 · decisions \d+\/600 · map \d+\/800 · lessons \d+\/1200 · journal \d+\/2500 tokens/);
    expect(output).not.toMatch(/\bcards?\b|\broles?\b|approv/i);
  });

  it("takes the budgets from config.json", async () => {
    const dir = await project();
    const config = JSON.parse(read(dir, ".groundwork/config.json"));
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...config, budgets: { ...config.budgets, lessons: 150 } }, null, 2));
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(1);
    expect(output).toMatch(/\.groundwork\/LESSONS\.md is ≈\d+ tokens, over its 150-token budget/);
  });

  it("validates the handoff's schema", async () => {
    const dir = await project();
    const path = join(dir, ".groundwork/HANDOFF.md");
    writeFileSync(path, read(dir, ".groundwork/HANDOFF.md").replace("## Next\nB\n\n", "").replace(/^head: .*$/m, "head: not-a-commit"));
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(1);
    expect(output).toMatch(/\.groundwork\/HANDOFF\.md isn't a valid handoff: it has no "## Next" section; its `head` isn't a commit hash/);
  });

  it("flags a missing handoff and a missing map as problems", async () => {
    const dir = await project();
    const { rmSync } = await import("node:fs");
    rmSync(join(dir, ".groundwork/HANDOFF.md"));
    rmSync(join(dir, ".groundwork/MAP.md"));
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(1);
    expect(output).toMatch(/\.groundwork\/HANDOFF\.md is missing, so nothing says where things stand/);
    expect(output).toMatch(/\.groundwork\/MAP\.md, the codebase map, is missing/);
  });

  it("flags a decisions index that is out of step with the records", async () => {
    const dir = await project();
    write(dir, ".groundwork/decisions/0001-by-hand.md", "---\nid: 0001\ntitle: Written by hand\nstatus: accepted\n---\n");
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(1);
    expect(output).toMatch(/\.groundwork\/DECISIONS\.md is out of step with the records/);
    expect((await cli(dir, "index", "--check")).code).toBe(1);
    expect((await cli(dir, "index")).output).toMatch(/Updated \.groundwork\/DECISIONS\.md \(1 decision\)/);
    expect((await cli(dir, "doctor")).code).toBe(0);
  });

  it("suggests, without failing, when the map is empty or names paths that are gone, and when the handoff is behind", async () => {
    const dir = await project();
    expect((await cli(dir, "doctor")).output).toMatch(/\.groundwork\/MAP\.md isn't filled in yet/);
    write(dir, ".groundwork/MAP.md", "# Map\n\n## Layout\n- `src/gone.ts` (guessed)\n");
    const { commit } = await import("./support.js");
    commit(dir, "src/a.ts", "a", "feat: a");
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(0);
    expect(output).toMatch(/\.groundwork\/MAP\.md names 1 path that no longer exists \(src\/gone\.ts\)/);
    expect(output).toMatch(/The handoff is behind: 1 commit landed after it was written/);
  });

  it("suggests converting a handoff from before 2.0 instead of failing an upgraded project", async () => {
    const dir = await project(true);
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), "# Handoff\n\n- **Current card:** none\n- **Next step:** plan phase 2\n");
    const { code, output } = await cli(dir, "doctor");
    expect(code).toBe(0);
    expect(output).toMatch(/Handoff: +unstamped/);
    expect(output).toMatch(/is in the layout from before 2\.0, with no stamp\. Run `npx groundwork-ai checkpoint`/);
  });
});

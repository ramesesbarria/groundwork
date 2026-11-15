// Every load compares the handoff with the repository, and says what to distrust.
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, commit, git, install, read, repo, tempDir, write } from "./support.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { assess, describe as describeFreshness, pathsIn } from "../../core/lib/freshness.mjs";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { checkpoint } from "../../core/lib/checkpoint.mjs";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { parseHandoff } from "../../core/lib/memory.mjs";

const HANDOFF = ".groundwork/HANDOFF.md";
const verdict = (dir: string, options = {}) => assess(dir, parseHandoff(read(dir, HANDOFF)), options);

async function saved(now = "Login form renders", next = "Wire validation in `src/login.ts`"): Promise<string> {
  const dir = await install(repo());
  await cli(dir, "checkpoint", "--now", now, "--next", next);
  return dir;
}

describe("freshness verdicts", () => {
  it("fresh: written at the current commit", async () => {
    const result = verdict(await saved());
    expect(result.verdict).toBe("fresh");
    expect(result.commitsSince).toBe(0);
    expect(describeFreshness(result)[0]).toMatch(/^Handoff: FRESH \(written 0 min ago on main @ [0-9a-f]{7}\): written at the current commit\.$/);
  });

  it("behind: commits landed after it was written, listed with the files they changed", async () => {
    const dir = await saved();
    const first = commit(dir, "src/login.ts", "x", "feat: login form");
    const second = commit(dir, "docs/notes.md", "y", "docs: notes");
    const result = verdict(dir);
    expect(result.verdict).toBe("behind");
    expect(result.commitsSince).toBe(2);
    expect(result.commits).toEqual([
      { sha: second.slice(0, 7), subject: "docs: notes" },
      { sha: first.slice(0, 7), subject: "feat: login form" },
    ]);
    expect(result.changedFiles).toEqual(["docs/notes.md", "src/login.ts"]);
    // The handoff's Next step names src/login.ts, which changed: the agent is told exactly that.
    expect(result.touchesNext).toEqual(["src/login.ts"]);
    const text = describeFreshness(result).join("\n");
    expect(text).toMatch(/Handoff: BEHIND .*: 2 commits landed after it was written, changing 2 files\./);
    expect(text).toContain(`${first.slice(0, 7)} feat: login form`);
    expect(text).toContain("Files its Now/Next sections name have changed since: src/login.ts.");
    expect(text).toMatch(/Trust the code over the handoff/);
  });

  it("a commit that only saves Groundwork's own files doesn't make it behind", async () => {
    const dir = await saved();
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: save the handoff");
    expect(verdict(dir).verdict).toBe("fresh");
  });

  it("diverged: its commit isn't in this branch's history", async () => {
    const dir = await install(repo());
    commit(dir, "a.txt", "a", "feat: a");
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const handoff = read(dir, HANDOFF);
    git(dir, "reset", "-q", "--hard", "HEAD~1");
    commit(dir, "b.txt", "b", "feat: b instead");
    writeFileSync(join(dir, HANDOFF), handoff);
    const result = verdict(dir);
    expect(result.verdict).toBe("diverged");
    expect(result.summary).toMatch(/isn't in this branch's history: 1 commit it knew aren't here, and 1 here came after the split/);
    expect(describeFreshness(result).join("\n")).toMatch(/Don't act on its Next step before checking/);
  });

  it("diverged: its commit no longer exists", async () => {
    const dir = await saved();
    writeFileSync(join(dir, HANDOFF), read(dir, HANDOFF).replace(/^head: .*$/m, "head: 0123456789abcdef0123456789abcdef01234567"));
    const result = verdict(dir);
    expect(result.verdict).toBe("diverged");
    expect(result.summary).toMatch(/isn't in this repository any more/);
  });

  it("stale: older than the limit, whatever git says", async () => {
    const dir = await saved();
    const later = Date.now() + 15 * 86_400_000;
    expect(verdict(dir, { now: later }).verdict).toBe("stale");
    expect(verdict(dir, { now: later }).summary).toMatch(/15 days old \(limit 14\)/);
    expect(verdict(dir, { now: later, staleAfterDays: 30 }).verdict).toBe("fresh");
    // Stale and behind: the delta is still given.
    commit(dir, "a.txt", "a", "feat: a");
    const both = verdict(dir, { now: later });
    expect(both.verdict).toBe("stale");
    expect(both.summary).toMatch(/1 commit landed after it was written/);
    expect(both.commits).toHaveLength(1);
  });

  it("unstamped: never checkpointed, so there is nothing to compare", async () => {
    const dir = await install(repo());
    writeFileSync(join(dir, HANDOFF), "# Handoff\n\n- **Next step:** something\n");
    const result = verdict(dir);
    expect(result.verdict).toBe("unstamped");
    expect(result.summary).toMatch(/never checkpointed/);
  });

  it("notes a branch that changed since it was written", async () => {
    const dir = await saved();
    git(dir, "switch", "-q", "-c", "feat/other");
    const result = verdict(dir);
    expect(result.verdict).toBe("fresh");
    expect(result.notes).toContain("It was written on branch main; you are on feat/other.");
  });

  it("notes the memory it was written against that has changed: map, decisions, lessons", async () => {
    const dir = await saved();
    expect(verdict(dir).changedMemory).toEqual([]);
    await cli(dir, "decide", "Use SQLite");
    write(dir, ".groundwork/MAP.md", "# Map\n\n## Layout\n- `src/` holds the app\n");
    const result = verdict(dir);
    expect(result.changedMemory).toEqual(["map", "decisions"]);
    expect(result.notes.join(" ")).toMatch(/Changed since it was written: map, decisions\./);
  });

  it("without git, only age is checked", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    checkpoint(dir, { sections: { Now: "A", Next: "B" } });
    expect(verdict(dir).verdict).toBe("fresh");
    expect(verdict(dir).summary).toMatch(/isn't a git repository/);
    expect(verdict(dir, { now: Date.now() + 20 * 86_400_000 }).verdict).toBe("stale");
  });
});

describe("paths a handoff names", () => {
  it("finds backticked and bare paths, and leaves prose and URLs alone", () => {
    expect(pathsIn("Wire `src/login.ts` and tests/login.test.ts, then update package.json. See https://example.com/a/b and e.g. the docs.")).toEqual([
      "src/login.ts",
      "tests/login.test.ts",
      "package.json",
    ]);
  });
});

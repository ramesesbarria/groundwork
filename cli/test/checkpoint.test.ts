// `groundwork checkpoint`: the CLI writes the facts, the agent writes only what it alone knows.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, commit, frontmatter, git, install, read, repo, tempDir, write } from "./support.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { checkpoint } from "../../core/lib/checkpoint.mjs";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { acquireLock, parseHandoff, handoffView } from "../../core/lib/memory.mjs";

const HANDOFF = ".groundwork/HANDOFF.md";
const JOURNAL = ".groundwork/JOURNAL.md";

async function project(options: { flow?: boolean } = {}): Promise<string> {
  return install(repo(), options);
}

describe("groundwork checkpoint", () => {
  it("stamps the handoff with the time, commit, branch, dirty count and writer", async () => {
    const dir = await project();
    write(dir, "scratch.txt", "uncommitted");
    const { code, output } = await cli(dir, "checkpoint", "--now", "Login form renders", "--next", "Wire validation in src/login.ts", "--tool", "test-tool", "--model", "model-x", "--session", "ses_1");
    expect(code).toBe(0);
    expect(output).toMatch(/Checkpoint saved: \.groundwork\/HANDOFF\.md at [0-9a-f]{7} on main\./);
    const meta = frontmatter(read(dir, HANDOFF));
    expect(meta.schema).toBe("2");
    expect(meta.head).toBe(git(dir, "rev-parse", "HEAD"));
    expect(meta.branch).toBe("main");
    expect(meta.dirty).toBe("1");
    expect(meta).toMatchObject({ tool: "test-tool", model: "model-x", session: "ses_1" });
    expect(Math.abs(Date.parse(meta.updated) - Date.now())).toBeLessThan(60_000);
    expect(meta.body).toMatch(/^[0-9a-f]{12}$/);
    expect(meta.deps).toMatch(/^map=[0-9a-f]{12} decisions=[0-9a-f]{12} lessons=[0-9a-f]{12}$/);
  });

  it("writes only the sections it is given, and keeps the rest", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B", "--blockers", "waiting on the API key", "--notes", "the clock is mocked");
    await cli(dir, "checkpoint", "--next", "C", "--failing", "npm test: 2 failing");
    const view = handoffView(parseHandoff(read(dir, HANDOFF)));
    expect(view).toEqual({ now: "A", next: "C", blockers: "waiting on the API key", failingChecks: "npm test: 2 failing", workers: "none", notes: "the clock is mocked" });
  });

  it("stamps a handoff edited by hand, with no arguments", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const before = frontmatter(read(dir, HANDOFF));
    writeFileSync(join(dir, HANDOFF), read(dir, HANDOFF).replace("## Next\nB", "## Next\nRun the importer on the staging data"));
    const { code, output } = await cli(dir, "checkpoint");
    expect(code).toBe(0);
    expect(output).not.toMatch(/Warning/);
    const after = frontmatter(read(dir, HANDOFF));
    expect(after.body).not.toBe(before.body);
    expect(handoffView(parseHandoff(read(dir, HANDOFF))).next).toBe("Run the importer on the staging data");
  });

  it("refuses to stamp a handoff nobody has written yet", async () => {
    const dir = await project();
    const { code, output } = await cli(dir, "checkpoint");
    expect(code).toBe(1);
    expect(output).toMatch(/still empty/);
    expect(frontmatter(read(dir, HANDOFF)).updated).toBeUndefined();
  });

  it("says so when it restamps text that hasn't changed since an older commit", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    commit(dir, "src/a.ts", "a", "feat: a");
    const { code, output } = await cli(dir, "checkpoint");
    expect(code).toBe(0);
    expect(output).toMatch(/Warning: Stamped at [0-9a-f]{7}, but the handoff's text is the same as at [0-9a-f]{7}/);
    expect(frontmatter(read(dir, HANDOFF)).head).toBe(git(dir, "rev-parse", "HEAD"));
  });

  it("rejects an option it doesn't know, with the usage", async () => {
    const dir = await project();
    const { code, output } = await cli(dir, "checkpoint", "--nxt", "x");
    expect(code).toBe(1);
    expect(output).toMatch(/Unknown option: --nxt[\s\S]*Usage:/);
  });

  it("works without git: the stamp has the time and no commit", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    const { code } = await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    expect(code).toBe(0);
    const meta = frontmatter(read(dir, HANDOFF));
    expect(meta.updated).toBeDefined();
    expect(meta.head).toBeUndefined();
    expect(read(dir, JOURNAL)).toMatch(/## .* · no git.*\n- Now: A\n- Next: B/);
  });

  it("says Groundwork isn't installed outside a project", async () => {
    const { code, output } = await cli(tempDir(), "checkpoint", "--now", "x");
    expect(code).toBe(1);
    expect(output).toMatch(/npx groundwork-ai init/);
  });
});

describe("the journal", () => {
  it("gets an entry derived from git: the commits and files since the last one", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B", "--tool", "test-tool");
    expect(read(dir, JOURNAL)).toMatch(/## \d{4}-\d\d-\d\d \d\d:\d\d UTC · main @ [0-9a-f]{7} · test-tool\n- First checkpoint/);
    const first = commit(dir, "src/login.ts", "x", "feat: login form");
    const second = commit(dir, "src/session.ts", "y", "fix: session expiry");
    await cli(dir, "checkpoint", "--now", "Sessions expire", "--next", "Add the logout button");
    const journal = read(dir, JOURNAL);
    const entry = journal.slice(journal.lastIndexOf("\n## "));
    expect(entry).toContain(`main @ ${second.slice(0, 7)}`);
    expect(entry).toContain("- Commits (2):");
    expect(entry).toContain(`  - ${second.slice(0, 7)} fix: session expiry`);
    expect(entry).toContain(`  - ${first.slice(0, 7)} feat: login form`);
    expect(entry).toContain("- Files (2): src/login.ts, src/session.ts");
    expect(entry).toContain("- Now: Sessions expire");
    expect(entry).toContain("- Next: Add the logout button");
  });

  it("gets no entry when nothing was committed, unless a note is given", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const entries = () => read(dir, JOURNAL).split("\n## ").length - 1;
    expect(entries()).toBe(1);
    await cli(dir, "checkpoint", "--next", "C");
    expect(entries()).toBe(1);
    const { output } = await cli(dir, "checkpoint", "--note", "Pairing session with the data team");
    expect(output).toMatch(/Journal: one entry added/);
    expect(entries()).toBe(2);
    expect(read(dir, JOURNAL)).toContain("- Note: Pairing session with the data team");
  });

  it("doesn't count a commit that only saves Groundwork's own files", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: save the handoff");
    const before = read(dir, JOURNAL);
    await cli(dir, "checkpoint", "--next", "C");
    expect(read(dir, JOURNAL)).toBe(before);
  });

  it("says history changed when the last entry's commit is no longer behind this one", async () => {
    const dir = await project();
    commit(dir, "a.txt", "a", "feat: a");
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    git(dir, "stash", "-u", "-q");
    git(dir, "reset", "-q", "--hard", "HEAD~1");
    git(dir, "stash", "pop", "-q");
    commit(dir, "b.txt", "b", "feat: b instead");
    await cli(dir, "checkpoint", "--next", "C");
    expect(read(dir, JOURNAL)).toMatch(/- History changed: the last entry's commit [0-9a-f]{7} isn't behind this one/);
  });
});

describe("an automatic checkpoint (from a hook)", () => {
  it("doesn't restamp a handoff nobody touched, so it shows as behind; the journal still gets the commits", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const stamped = frontmatter(read(dir, HANDOFF));
    commit(dir, "src/a.ts", "a", "feat: a");
    const result = checkpoint(dir, { auto: true, tool: "test-tool", session: "ses_1" });
    expect(result.wrote).toBe(false);
    expect(result.journal).toBe(true);
    expect(frontmatter(read(dir, HANDOFF))).toEqual(stamped);
    expect(read(dir, JOURNAL)).toContain("feat: a");
    // And only once: a second run has nothing new to record.
    expect(checkpoint(dir, { auto: true }).journal).toBe(false);
  });

  it("stamps a handoff whose text was edited since the last stamp", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    commit(dir, "src/a.ts", "a", "feat: a");
    writeFileSync(join(dir, HANDOFF), read(dir, HANDOFF).replace("## Now\nA", "## Now\nA is merged"));
    const result = checkpoint(dir, { auto: true, tool: "test-tool", session: "ses_1" });
    expect(result.wrote).toBe(true);
    const meta = frontmatter(read(dir, HANDOFF));
    expect(meta.head).toBe(git(dir, "rev-parse", "HEAD"));
    expect(meta).toMatchObject({ tool: "test-tool", session: "ses_1" });
  });

  it("never stamps the empty template, or an old handoff it knows nothing about", async () => {
    const dir = await project();
    expect(checkpoint(dir, { auto: true }).wrote).toBe(false);
    expect(frontmatter(read(dir, HANDOFF)).updated).toBeUndefined();
    writeFileSync(join(dir, HANDOFF), "# Handoff\n\n- **Next step:** something from last month\n");
    expect(checkpoint(dir, { auto: true }).wrote).toBe(false);
    expect(read(dir, HANDOFF)).toBe("# Handoff\n\n- **Next step:** something from last month\n");
  });
});

describe("a handoff from before 2.0", () => {
  const LEGACY = "# Handoff\n\n- **Phase:** 1 Voting\n- **Current card:** 1.3 Login flow\n- **Status:** implementing\n- **Last step:** tests written\n- **Next step:** make them pass\n- **Failing checks:** 4 new tests\n- **Notes:**\n";

  it.each([true, false])("is rewritten in the 2.0 layout by an explicit checkpoint, losing nothing (flow: %s)", async (flow) => {
    const dir = await project({ flow });
    writeFileSync(join(dir, HANDOFF), LEGACY);
    const { code } = await cli(dir, "checkpoint");
    expect(code).toBe(0);
    const text = read(dir, HANDOFF);
    const handoff = parseHandoff(text);
    expect(handoff.format).toBe("sections");
    expect(handoffView(handoff)).toMatchObject({ now: "tests written", next: "make them pass", failingChecks: "4 new tests" });
    for (const kept of ["1 Voting", "1.3 Login flow", "implementing"]) expect(text).toContain(kept);
    expect(text.includes("## Flow")).toBe(flow);
    expect(frontmatter(text).head).toBe(git(dir, "rev-parse", "HEAD"));
  });
});

describe("concurrent writers", () => {
  it("warns when another session stamped the same handoff minutes ago", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B", "--tool", "tool-a", "--session", "ses_a");
    const same = await cli(dir, "checkpoint", "--next", "C", "--tool", "tool-a", "--session", "ses_a");
    expect(same.output).not.toMatch(/Warning/);
    const other = await cli(dir, "checkpoint", "--next", "D", "--tool", "tool-b", "--session", "ses_b");
    expect(other.code).toBe(0);
    expect(other.output).toMatch(/Warning: tool-a \(session ses_a\) stamped this handoff \d+ min ago\. One writer per handoff/);
    expect(other.output).toContain("--worker <id>");
  });

  it("doesn't warn about a session that stopped long ago", async () => {
    const dir = await project();
    checkpoint(dir, { sections: { Now: "A", Next: "B" }, session: "ses_a", now: new Date(Date.now() - 3 * 3_600_000) });
    const result = checkpoint(dir, { sections: { Next: "C" }, session: "ses_b" });
    expect(result.warnings).toEqual([]);
  });

  it("writes through a temporary file and leaves none behind", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    expect(readdirSync(join(dir, ".groundwork")).filter((name) => name.endsWith(".tmp") || name === ".lock")).toEqual([]);
  });

  it("an automatic checkpoint stands back while another one holds the lock", async () => {
    const dir = await project();
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    const release = acquireLock(join(dir, ".groundwork"));
    expect(typeof release).toBe("function");
    try {
      expect(acquireLock(join(dir, ".groundwork"), { waitMs: 100 })).toBeUndefined();
    } finally {
      release();
    }
    expect(existsSync(join(dir, ".groundwork/.lock"))).toBe(false);
    expect(typeof acquireLock(join(dir, ".groundwork"))).toBe("function");
  });

  it("takes over a lock left by a process that died", async () => {
    const dir = await project();
    write(dir, ".groundwork/.lock", "999999 2020-01-01T00:00:00Z\n");
    const release = acquireLock(join(dir, ".groundwork"), { staleMs: 0 });
    expect(typeof release).toBe("function");
    release();
  });
});

// Parallel agents: any worktree, branch or named worker gets its own handoff; the root handoff has a
// single writer and tracks the workers in flight.
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cli, frontmatter, git, install, read, repo, tempDir } from "./support.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import { resolveHandoff, workerSlug } from "../../core/lib/checkpoint.mjs";

const ROOT = ".groundwork/HANDOFF.md";

async function project(): Promise<string> {
  const dir = await install(repo());
  await cli(dir, "checkpoint", "--now", "Orchestrating the release", "--next", "Merge the workers");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "chore: handoff");
  return dir;
}

// A linked worktree of `dir` on a new branch, as `git worktree add` or a tool's worker makes one.
function worktree(dir: string, branch: string): string {
  const path = join(tempDir("groundwork-wt-"), "tree");
  git(dir, "worktree", "add", "-q", "-b", branch, path);
  return path;
}

describe("which handoff a checkout uses", () => {
  it("the main checkout uses the root handoff", async () => {
    const dir = await project();
    expect(resolveHandoff(dir)).toEqual({ path: join(dir, ".groundwork", "HANDOFF.md"), worker: undefined });
  });

  it("a named worker gets .groundwork/work/<id>/HANDOFF.md", async () => {
    const dir = await project();
    expect(resolveHandoff(dir, { worker: "auth-tests" }).path).toBe(join(dir, ".groundwork", "work", "auth-tests", "HANDOFF.md"));
    expect(() => resolveHandoff(dir, { worker: "../escape" })).toThrow(/isn't safe/);
  });

  it("a linked worktree is always a worker, named after its branch", async () => {
    const dir = await project();
    const tree = worktree(dir, "feat/auth-tests");
    const target = resolveHandoff(tree);
    expect(target.worker).toBe("feat-auth-tests");
    expect(target.path).toBe(join(tree, ".groundwork", "work", "feat-auth-tests", "HANDOFF.md"));
    expect(workerSlug("feat/auth tests!")).toBe("feat-auth-tests-");
  });

  it("a branch that already has a worker handoff keeps using it, including the 1.x gw/<id> branches", async () => {
    const dir = await project();
    git(dir, "switch", "-q", "-c", "gw/1.4");
    expect(resolveHandoff(dir).worker).toBeUndefined(); // no file yet: the root, as before 2.0
    await cli(dir, "checkpoint", "--worker", "1.4", "--now", "Profile page", "--next", "Review");
    expect(resolveHandoff(dir).worker).toBe("1.4");
    git(dir, "switch", "-q", "-c", "feat/search");
    expect(resolveHandoff(dir).worker).toBeUndefined();
    await cli(dir, "checkpoint", "--worker", "feat-search", "--now", "Search index", "--next", "Ranking");
    expect(resolveHandoff(dir).worker).toBe("feat-search");
    expect(resolveHandoff(dir, { root: true }).worker).toBeUndefined();
  });
});

describe("a worker's own handoff", () => {
  it("checkpoint in a worktree writes the worker's handoff and never the root", async () => {
    const dir = await project();
    const tree = worktree(dir, "feat/auth-tests");
    const rootBefore = read(tree, ROOT);
    const { code, output } = await cli(tree, "checkpoint", "--now", "Writing auth tests", "--next", "Cover the refresh token", "--tool", "test-tool");
    expect(code).toBe(0);
    expect(output).toMatch(/\.groundwork\/work\/feat-auth-tests\/HANDOFF\.md at [0-9a-f]{7} on feat\/auth-tests \(worker feat-auth-tests\)/);
    expect(read(tree, ROOT)).toBe(rootBefore);
    const meta = frontmatter(read(tree, ".groundwork/work/feat-auth-tests/HANDOFF.md"));
    expect(meta).toMatchObject({ worker: "feat-auth-tests", state: "active", branch: "feat/auth-tests", tool: "test-tool" });
    // The journal is the root's log; a worker doesn't write it either.
    expect(read(tree, ".groundwork/JOURNAL.md")).toBe(read(dir, ".groundwork/JOURNAL.md"));
  });

  it("brief in a worktree resumes the worker, not the root", async () => {
    const dir = await project();
    const tree = worktree(dir, "feat/auth-tests");
    await cli(tree, "checkpoint", "--now", "Writing auth tests", "--next", "Cover the refresh token");
    const { output } = await cli(tree, "brief");
    expect(output).toMatch(/^# Project memory: .* \(worker feat-auth-tests\)/);
    expect(output).toContain("Next: Cover the refresh token");
    expect(output).not.toContain("Merge the workers");
    expect((await cli(tree, "brief", "--root")).output).toContain("Merge the workers");
  });

  it("two workers never touch the same file, so their branches merge without conflict", async () => {
    const dir = await project();
    const a = worktree(dir, "feat/a");
    const b = worktree(dir, "feat/b");
    for (const [tree, name] of [[a, "a"], [b, "b"]] as const) {
      await cli(tree, "checkpoint", "--now", `Working on ${name}`, "--next", `Finish ${name}`);
      git(tree, "add", "-A");
      git(tree, "commit", "-q", "-m", `feat: ${name}`);
    }
    git(dir, "merge", "-q", "--no-edit", "feat/a");
    git(dir, "merge", "-q", "--no-edit", "feat/b");
    expect(existsSync(join(dir, ".groundwork/work/feat-a/HANDOFF.md"))).toBe(true);
    expect(existsSync(join(dir, ".groundwork/work/feat-b/HANDOFF.md"))).toBe(true);
    expect(read(dir, ROOT)).toContain("Orchestrating the release");
  });
});

describe("groundwork worker", () => {
  it("start records the worker in the root handoff and the ledger", async () => {
    const dir = await project();
    const { code, output } = await cli(dir, "worker", "start", "auth-tests", "--goal", "Write the auth test suite", "--branch", "feat/auth-tests");
    expect(code).toBe(0);
    expect(output).toMatch(/Worker auth-tests recorded/);
    const root = read(dir, ROOT);
    expect(root).toContain("## Workers in flight\n- auth-tests: Write the auth test suite (branch feat/auth-tests); state in `.groundwork/work/auth-tests/HANDOFF.md`");
    expect(root).toContain("## Now\nOrchestrating the release"); // the rest of the handoff is untouched
    const ledger = read(dir, ".groundwork/work/LEDGER.md");
    expect(ledger).toMatch(/\| auth-tests \| \d{4}-\d\d-\d\d \| start \| Write the auth test suite \(branch feat\/auth-tests\) \| [0-9a-f]{7} \|/);
    // A second worker is added; starting the same one again replaces its line.
    await cli(dir, "worker", "start", "docs", "--goal", "Write the docs");
    await cli(dir, "worker", "start", "auth-tests", "--goal", "Write the auth test suite, again");
    const workers = read(dir, ROOT).match(/## Workers in flight\n([\s\S]*?)\n\n## /)?.[1].split("\n") ?? [];
    expect(workers).toHaveLength(2);
    expect(workers.join("\n")).toContain("again");
  });

  it("the brief and status list active workers with their own next step", async () => {
    const dir = await project();
    await cli(dir, "worker", "start", "auth-tests", "--goal", "Write the auth test suite");
    await cli(dir, "checkpoint", "--worker", "auth-tests", "--now", "12 tests written", "--next", "Cover the refresh token");
    const brief = (await cli(dir, "brief")).output;
    expect(brief).toMatch(/## Workers in flight \(each writes only its own handoff; verify before merging\)\n- auth-tests on main, saved .*: Cover the refresh token \(\.groundwork\/work\/auth-tests\/HANDOFF\.md\)/);
    expect((await cli(dir, "status")).output).toMatch(/Workers:\n {2}auth-tests \(main\): Cover the refresh token/);
    const list = JSON.parse((await cli(dir, "worker", "list", "--json")).output);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "auth-tests", state: "active", next: "Cover the refresh token" });
  });

  it("status and worker list show a worker that has started but not saved yet", async () => {
    const dir = await project();
    await cli(dir, "worker", "start", "auth-tests", "--goal", "Write the auth test suite");
    expect((await cli(dir, "status")).output).toMatch(/Workers:\n {2}auth-tests: Write the auth test suite \(has not saved a handoff yet\)/);
    expect((await cli(dir, "worker", "list")).output).toMatch(/^auth-tests +active +never saved +- +Write the auth test suite$/);
    // JSON stays the worker handoffs only.
    expect(JSON.parse((await cli(dir, "worker", "list", "--json")).output)).toEqual([]);
    await cli(dir, "checkpoint", "--worker", "auth-tests", "--now", "12 tests written", "--next", "Cover the refresh token");
    expect((await cli(dir, "status")).output).toMatch(/Workers:\n {2}auth-tests \(main\): Cover the refresh token/);
    expect((await cli(dir, "status")).output).not.toContain("has not saved");
    await cli(dir, "worker", "done", "auth-tests");
    expect((await cli(dir, "status")).output).not.toContain("Workers:");
  });

  it("done takes the worker out of flight, logs the outcome and marks its handoff done", async () => {
    const dir = await project();
    await cli(dir, "worker", "start", "auth-tests", "--goal", "Write the auth test suite");
    await cli(dir, "checkpoint", "--worker", "auth-tests", "--now", "12 tests written", "--next", "none");
    const { code } = await cli(dir, "worker", "done", "auth-tests", "--outcome", "accepted: 12 tests rerun, merged");
    expect(code).toBe(0);
    expect(read(dir, ROOT)).toContain("## Workers in flight\nnone");
    expect(read(dir, ".groundwork/work/LEDGER.md")).toMatch(/\| auth-tests \| \d{4}-\d\d-\d\d \| done \| accepted: 12 tests rerun, merged \|/);
    expect(frontmatter(read(dir, ".groundwork/work/auth-tests/HANDOFF.md")).state).toBe("done");
    expect((await cli(dir, "brief")).output).not.toContain("Workers in flight (each");
    expect((await cli(dir, "worker", "list")).output).toMatch(/auth-tests +done/);
  });

  it("is refused in a linked worktree: only the main checkout writes the root handoff", async () => {
    const dir = await project();
    const tree = worktree(dir, "feat/auth-tests");
    const { code, output } = await cli(tree, "worker", "start", "nested", "--goal", "x");
    expect(code).toBe(1);
    expect(output).toMatch(/Workers are recorded from the main checkout, which owns the root handoff/);
    expect(read(tree, ROOT)).not.toContain("nested");
  });

  it("rejects an unsafe id and an unknown action", async () => {
    const dir = await project();
    expect((await cli(dir, "worker", "start", "../x")).code).toBe(1);
    expect((await cli(dir, "worker", "start")).code).toBe(1);
    const unknown = await cli(dir, "worker", "pause", "x");
    expect(unknown.code).toBe(1);
    expect(unknown.output).toMatch(/^Usage:/);
    expect((await cli(dir, "worker", "list")).output).toMatch(/No worker handoffs/);
  });
});

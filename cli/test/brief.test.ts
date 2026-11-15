// `groundwork brief`: one command that prints the resume context for any agent, inside a budget.
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cli, commit, git, install, read, repo, tempDir, write } from "./support.js";
import { estimateTokens } from "../src/tokens.js";

const MAP = "# Map\n\n## Layout\n- `src/` holds the app (found)\n- `tests/` holds the tests (found)\n\n## Entry points\n- `src/main.ts` (found)\n";

async function project(flow = false): Promise<string> {
  const dir = await install(repo(), { flow });
  write(dir, "src/main.ts", "");
  write(dir, "tests/.keep", "");
  write(dir, ".groundwork/MAP.md", MAP);
  await cli(dir, "decide", "Use SQLite for storage", "--status", "accepted");
  await cli(dir, "decide", "Old hosting choice", "--status", "superseded");
  await cli(dir, "lesson", "Run migrations before the tests", "--origin", "stale schema", "--level", "RULE");
  await cli(dir, "lesson", "A minor note");
  await cli(dir, "checkpoint", "--now", "Login form renders", "--next", "Wire validation in src/login.ts", "--blockers", "none", "--tool", "test-tool", "--model", "model-x");
  return dir;
}

describe("groundwork brief", () => {
  it("prints the handoff, its freshness, decisions in force, rules and the map", async () => {
    const dir = await project();
    const { code, output } = await cli(dir, "brief");
    expect(code).toBe(0);
    expect(output).toMatch(/^# Project memory: /);
    expect(output).toMatch(/Handoff: FRESH \(written 0 min ago on main @ [0-9a-f]{7} by test-tool\/model-x\)/);
    expect(output).toContain("Now: Login form renders");
    expect(output).toContain("Next: Wire validation in src/login.ts");
    expect(output).toContain("- 0001 Use SQLite for storage");
    expect(output).not.toContain("Old hosting choice"); // superseded: not in force
    expect(output).toContain("- L-001 [RULE] Run migrations before the tests");
    expect(output).toContain("- 1 more note in .groundwork/LESSONS.md");
    expect(output).toContain("`src/main.ts` (found)");
    expect(output).toContain("npx groundwork-ai checkpoint");
    // Sections that say "none" aren't worth their tokens.
    expect(output).not.toMatch(/^Blockers:/m);
  });

  it("shows a behind verdict with the right delta after commits", async () => {
    const dir = await project();
    const sha = commit(dir, "src/login.ts", "x", "feat: login form");
    commit(dir, "README.md", "# more\n", "docs: readme");
    const { output } = await cli(dir, "brief");
    expect(output).toMatch(/Handoff: BEHIND .*: 2 commits landed after it was written, changing 4 files\./);
    expect(output).toContain(`  - ${sha.slice(0, 7)} feat: login form`);
    expect(output).toContain("Files its Now/Next sections name have changed since: src/login.ts.");
  });

  it("--json gives the same state for tools, without scraping prose", async () => {
    const dir = await project();
    commit(dir, "src/login.ts", "x", "feat: login form");
    const { code, output } = await cli(dir, "brief", "--json");
    expect(code).toBe(0);
    const json = JSON.parse(output);
    expect(json.flow).toBe(false);
    expect(json.handoff).toMatchObject({ path: ".groundwork/HANDOFF.md", present: true, pristine: false, now: "Login form renders", next: "Wire validation in src/login.ts" });
    expect(json.handoff.meta).toMatchObject({ schema: "2", branch: "main", tool: "test-tool", model: "model-x" });
    expect(json.handoff.meta.head).toMatch(/^[0-9a-f]{40}$/);
    expect(json.freshness).toMatchObject({ verdict: "behind", commitsSince: 1, touchesNext: ["src/login.ts"] });
    expect(json.freshness.head).toBe(git(dir, "rev-parse", "HEAD"));
    expect(json.decisions.live.map((d: { id: string }) => d.id)).toEqual(["0001"]);
    expect(json.decisions.superseded).toBe(1);
    expect(json.lessons.map((l: { id: string; level: string }) => [l.id, l.level])).toEqual([["L-001", "RULE"], ["L-002", "NOTE"]]);
    expect(json.map).toEqual({ path: ".groundwork/MAP.md", filled: true, missingPaths: [] });
    expect(json.text).toContain("# Project memory");
  });

  it("stays inside its token budget, cutting on line boundaries and pointing at the file", async () => {
    const dir = await project();
    write(dir, ".groundwork/MAP.md", `# Map\n\n## Layout\n${Array.from({ length: 400 }, (_, i) => `- \`src/main.ts\` item ${i} of the layout`).join("\n")}\n`);
    await cli(dir, "checkpoint", "--notes", Array.from({ length: 300 }, (_, i) => `- note ${i} that goes on for a while`).join("\n"));
    const full = await cli(dir, "brief");
    expect(estimateTokens(full.output)).toBeLessThanOrEqual(1500);
    expect(full.output).toContain("(cut to fit; the rest is in .groundwork/MAP.md)");
    expect(full.output).toContain("(cut to fit; the rest is in .groundwork/HANDOFF.md)");
    // The first things an agent needs survive any budget.
    const small = await cli(dir, "brief", "--budget", "350");
    expect(estimateTokens(small.output)).toBeLessThanOrEqual(350);
    expect(small.output).toContain("Now: Login form renders");
    expect(small.output).toContain("Next: Wire validation in src/login.ts");
    expect(small.output).toMatch(/Handoff: FRESH/);
    // The config's budget is the default.
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ ...JSON.parse(read(dir, ".groundwork/config.json")), budgets: { brief: 600 } }));
    expect(estimateTokens((await cli(dir, "brief")).output)).toBeLessThanOrEqual(600);
    expect((await cli(dir, "brief", "--budget", "many")).code).toBe(1);
  });

  it("says so when nothing has been recorded yet, and when the map is empty", async () => {
    const dir = await install(repo());
    const { output } = await cli(dir, "brief");
    expect(output).toMatch(/Handoff: EMPTY: nothing has been recorded/);
    expect(output).toContain("`.groundwork/MAP.md` isn't filled in yet");
    const json = JSON.parse((await cli(dir, "brief", "--json")).output);
    expect(json.handoff.pristine).toBe(true);
    expect(json.map.filled).toBe(false);
  });

  it("says when the map names paths that no longer exist", async () => {
    const dir = await project();
    write(dir, ".groundwork/MAP.md", `${MAP}- \`src/gone.ts\` (found)\n`);
    expect((await cli(dir, "brief")).output).toContain("The map names paths that no longer exist: src/gone.ts.");
  });

  it("without the flow, says nothing about cards, roles or approvals", async () => {
    const { output } = await cli(await project(), "brief");
    expect(output).not.toMatch(/\bcards?\b|\broles?\b|approv/i);
  });

  it("with the flow, adds the card in progress and the flow's commands", async () => {
    const dir = await project(true);
    writeFileSync(join(dir, ".groundwork/HANDOFF.md"), read(dir, ".groundwork/HANDOFF.md").replace("- **Current card:** none", "- **Current card:** 1.3 Login flow").replace("- **Status:** —", "- **Status:** implementing"));
    const { output } = await cli(dir, "brief");
    expect(output).toContain("Groundwork: card 1.3 Login flow is being built.");
    expect(output).toContain("Type /gw to continue (the only other commands: /gw-approve, /gw-reject).");
    const json = JSON.parse((await cli(dir, "brief", "--json")).output);
    expect(json.flow).toBe(true);
    expect(json.flowState).toEqual({ card: "1.3 Login flow", status: "implementing" });
  });

  it("works with no adapter and outside git, and fails clearly outside a project", async () => {
    const dir = tempDir();
    await cli(dir, "init", "--adapter", "none");
    await cli(dir, "checkpoint", "--now", "A", "--next", "B");
    expect((await cli(dir, "brief")).output).toMatch(/Handoff: FRESH .*isn't a git repository/);
    const outside = await cli(tempDir(), "brief");
    expect(outside.code).toBe(1);
    expect(outside.output).toMatch(/npx groundwork-ai init/);
  });
});

// Card 5.2: `groundwork retro` and /gw-retro (SPEC §9).
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { run } from "../src/index.js";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-retro-"));
  temps.push(dir);
  return dir;
}
const noQuestions = async () => "";

function git(dir: string, ...args: string[]) {
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: dir });
}
function commit(dir: string, message: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
}

const card = (id: string, title: string, history: string[]) =>
  `---\nid: ${id}\ntitle: ${title}\nphase: 1\nstatus: done\ndepends_on: []\n---\n## Goal\nx\n\n## History\n${history.map((h) => `- ${h}`).join("\n")}\n`;

// A project with one of each kind of signal.
function fixture(): string {
  const dir = tempDir();
  git(dir, "init", "-q");
  mkdirSync(join(dir, ".groundwork/cards"), { recursive: true });
  writeFileSync(join(dir, ".groundwork/config.json"), "{}");
  commit(dir, "[1.1] Login", { "src/login.ts": "v1" });
  commit(dir, "Fix login redirect", { "src/login.ts": "v2" });
  commit(dir, "[1.2] Signup", { "src/signup.ts": "v1" });
  git(dir, "revert", "--no-edit", "HEAD");
  writeFileSync(
    join(dir, ".groundwork/cards/1.1-login.md"),
    card("1.1", "Login", [
      "2026-09-20 review → implementing: tests weren't rerun by the reviewer (L-003)",
      "2026-09-20 rejected: error message says which field was wrong (L-003)",
      "2026-09-21 approved by human",
    ]),
  );
  writeFileSync(
    join(dir, ".groundwork/cards/1.2-signup.md"),
    card("1.2", "Signup", ["2026-09-22 review → implementing: forgot to update HANDOFF"]),
  );
  return dir;
}

describe("groundwork retro", () => {
  it("says to run init when Groundwork isn't installed", async () => {
    const { code, output } = await run(["retro"], { cwd: tempDir(), ask: noQuestions });
    expect(code).toBe(1);
    expect(output).toMatch(/groundwork init/);
  });

  it("finds reverts", async () => {
    const { output } = await run(["retro"], { cwd: fixture(), ask: noQuestions });
    expect(output).toMatch(/Reverts \(1\)/);
    expect(output).toContain('Revert "[1.2] Signup"');
  });

  it("finds fix commits that touch a card's files soon after it", async () => {
    const { output } = await run(["retro"], { cwd: fixture(), ask: noQuestions });
    expect(output).toMatch(/Fixes soon after a card \(1\)/);
    expect(output).toMatch(/Fix login redirect[^\n]*1\.1[^\n]*src\/login\.ts|1\.1[^\n]*Fix login redirect/);
  });

  it("finds rejections and review send-backs, with their reasons and cards", async () => {
    const { output } = await run(["retro"], { cwd: fixture(), ask: noQuestions });
    expect(output).toMatch(/Rejections \(1\)/);
    expect(output).toMatch(/1\.1[^\n]*which field was wrong/);
    expect(output).toMatch(/Sent back by review \(2\)/);
    expect(output).toMatch(/1\.2[^\n]*forgot to update HANDOFF/);
  });

  it("groups signals by the lesson they cite, with counts", async () => {
    const { output } = await run(["retro"], { cwd: fixture(), ask: noQuestions });
    expect(output).toMatch(/L-003: 2 signals/);
  });

  it("saves the report to .groundwork/retro.md for /gw-retro", async () => {
    const dir = fixture();
    const { output } = await run(["retro"], { cwd: dir, ask: noQuestions });
    expect(readFileSync(join(dir, ".groundwork/retro.md"), "utf8").trim()).toBe(output.trim());
  });

  it("still reports Groundwork's own signals outside a git repo", async () => {
    const dir = tempDir();
    mkdirSync(join(dir, ".groundwork/cards"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/cards/1.1-a.md"), card("1.1", "A", ["2026-09-20 rejected: too slow"]));
    const { code, output } = await run(["retro"], { cwd: dir, ask: noQuestions });
    expect(code).toBe(0);
    expect(output).toMatch(/not a git repo/i);
    expect(output).toMatch(/Rejections \(1\)/);
  });
});

describe("/gw-retro", () => {
  const text = readFileSync(new URL("../../core/commands/gw-retro.md", import.meta.url), "utf8");
  const steps = text.slice(text.indexOf("## Steps"), text.indexOf("## Writes"));

  it("starts from the retro report", () => {
    expect(steps).toMatch(/groundwork retro/);
    expect(steps).toContain(".groundwork/retro.md");
  });

  it("proposes moves up the ladder: new note, note to rule, rule to guard", () => {
    expect(steps).toMatch(/NOTE/);
    expect(steps).toMatch(/RULE/);
    expect(steps).toMatch(/GUARD/);
  });

  it("changes nothing without the human's OK", () => {
    expect(steps).toMatch(/wait for/i);
    expect(text.slice(text.indexOf("## Must not"))).toMatch(/without the human/i);
  });

  it("turns a new guard into a card, since guards are code", () => {
    expect(steps).toMatch(/guard[^\n]*card/i);
  });

  it("is installed like the other commands", () => {
    expect(existsSync(new URL("../../core/commands/gw-retro.md", import.meta.url))).toBe(true);
  });
});

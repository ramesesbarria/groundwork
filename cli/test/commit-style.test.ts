// Groundwork follows a repo's own commit style instead of forcing "[1.2] Title".
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { run } from "../src/index.js";
import { cardIdPattern } from "../src/retro.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

describe("the setting", () => {
  it("the config template's default is today's format", () => {
    expect(JSON.parse(core("templates/config.json")).commitFormat).toBe("[{id}] {title}");
  });

  it("the schema documents it, with {id} and {title}", () => {
    const prop = JSON.parse(core("templates/config.schema.json")).properties.commitFormat;
    expect(prop.type).toBe("string");
    expect(prop.description).toMatch(/\{id\}/);
    expect(prop.description).toMatch(/\{title\}/);
  });

  it.each(["commands/gw-approve.md", "commands/gw-next.md", "commands/gw-quick.md", "workflow.md", "templates/AGENTS.md"])(
    "%s uses the configured format",
    (path) => {
      expect(core(path)).toContain("commitFormat");
    },
  );

  it("existing-project setup proposes a format from git log, marked found", () => {
    const guide = core("guides/existing-project.md");
    expect(guide).toMatch(/commitFormat[^\n]*git log|git log[^\n]*commitFormat/);
    expect(guide.split("\n").find((l) => l.includes("commitFormat")) ?? "").toContain("*found*");
  });
});

describe("retro with a custom format", () => {
  it("builds a matcher from the format", () => {
    expect(cardIdPattern("[{id}] {title}").exec("[1.2] Login")?.[1]).toBe("1.2");
    expect(cardIdPattern("feat: {title} ({id})").exec("feat: login flow (1.2)")?.[1]).toBe("1.2");
    expect(cardIdPattern("feat: {title} ({id})").exec("fix: login redirect")).toBeNull();
  });

  const temps: string[] = [];
  afterEach(() => {
    for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
  });
  const git = (dir: string, ...args: string[]) =>
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd: dir });
  function commit(dir: string, message: string, files: Record<string, string>) {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", message);
  }

  it("still finds a fix soon after a card", async () => {
    const dir = mkdtempSync(join(tmpdir(), "groundwork-commits-"));
    temps.push(dir);
    git(dir, "init", "-q");
    mkdirSync(join(dir, ".groundwork/cards"), { recursive: true });
    writeFileSync(join(dir, ".groundwork/config.json"), JSON.stringify({ commitFormat: "feat: {title} ({id})" }));
    commit(dir, "feat: login flow (1.1)", { "src/login.ts": "v1" });
    commit(dir, "fix: login redirect", { "src/login.ts": "v2" });

    const { output } = await run(["retro"], { cwd: dir });
    expect(output).toMatch(/Fixes soon after a card \(1\)/);
    expect(output).toMatch(/fix: login redirect[^\n]*card 1\.1/);
  });
});

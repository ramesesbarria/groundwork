// No empty placeholders, no dead code, and no promises the product doesn't make.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(repo, path), "utf8");

describe("cuts and cleanup", () => {
  it("has no empty placeholder directories", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" });
    expect(tracked).not.toMatch(/\.gitkeep/);
    for (const dir of ["adapters", "examples", "guards"]) expect(existsSync(join(repo, dir)), dir).toBe(false);
    // docs/ is a real directory now: it holds the documentation site deployed to GitHub Pages.
    expect(readdirSync(join(repo, "docs", "content", "docs")).some((name) => name.endsWith(".mdx"))).toBe(true);
  });

  it("has no unreachable 'planned but not implemented' branch", () => {
    expect(read("cli/src/index.ts")).not.toMatch(/planned but not implemented/);
  });

  it("the README's evaluation claims stay in its Results section, scoped to what was tested", () => {
    const readme = read("README.md");
    const start = readme.indexOf("## Results");
    const results = readme.slice(start, readme.indexOf("\n## ", start + 1));
    expect(results).toMatch(/OpenCode 2\.0\.32 with DeepSeek Flash/);
    expect(results).toMatch(/can't show how others behave/);
    const outside = readme.replace(results, "").split("\n").filter((line) => /\bevals?\b|benchmark|\d+ of \d+/i.test(line));
    for (const line of outside) expect(line, "evaluation claims belong in ## Results").toMatch(/^\| `evals\/`/);
  });
});

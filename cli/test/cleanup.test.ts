// No empty placeholders, no dead code, and no promises the product doesn't make.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(repo, path), "utf8");

describe("cuts and cleanup", () => {
  it("has no empty placeholder directories", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" });
    expect(tracked).not.toMatch(/\.gitkeep/);
    for (const dir of ["adapters", "docs", "examples", "guards"]) expect(existsSync(join(repo, dir)), dir).toBe(false);
  });

  it("has no unreachable 'planned but not implemented' branch", () => {
    expect(read("cli/src/index.ts")).not.toMatch(/planned but not implemented/);
  });

  it("the README makes no promise of benchmarks or evals", () => {
    expect(read("README.md")).not.toMatch(/\bevals?\b|benchmark/i);
  });
});

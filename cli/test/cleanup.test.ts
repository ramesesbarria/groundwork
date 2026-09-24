// Card 7.6: no empty placeholders, no dead code, and SPEC and README agree on the current goal.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(repo, path), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("cuts and cleanup", () => {
  it("has no empty placeholder directories", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: repo, encoding: "utf8" });
    expect(tracked).not.toMatch(/\.gitkeep/);
    for (const dir of ["adapters", "docs", "examples", "guards"]) expect(existsSync(join(repo, dir)), dir).toBe(false);
  });

  it("has no unreachable 'planned but not implemented' branch", () => {
    expect(read("cli/src/index.ts")).not.toMatch(/planned but not implemented/);
  });

  it("SPEC §12 matches the real repo layout", () => {
    const layout = section(read(".groundwork/SPEC.md"), "12. The Groundwork repo itself");
    for (const path of ["core/", "cli/", ".groundwork/", "commands/", "roles/", "templates/", "guards/"]) {
      expect(layout).toContain(path);
    }
    expect(layout).not.toMatch(/examples\/|case-study|evals\.md/);
  });

  it("SPEC no longer promises benchmark evals for v1.0", () => {
    const spec = read(".groundwork/SPEC.md");
    const v1 = section(spec, "13. Milestones").split("\n").find((line) => line.includes("v1.0")) ?? "";
    expect(v1).not.toMatch(/eval/i);
    expect(spec).toMatch(/evals?[^\n]*later, not a current goal/i);
    expect(section(spec, "14. Showcase checklist")).not.toMatch(/eval table/i);
  });

  it("README agrees: evals are later, not a current goal", () => {
    const limits = section(read("README.md"), "Honest limitations");
    expect(limits).not.toMatch(/planned benchmark/i);
    expect(limits).toMatch(/evals?[^\n]*not a current goal/i);
  });
});

// Card 7.7: evidence files keep the command, the summary and the failures, not the full log.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

describe("smaller evidence files", () => {
  it.each(["roles/tester.md", "roles/reviewer.md", "workflow.md"])("%s says what to save and the size limit", (path) => {
    const text = core(path);
    expect(text).toMatch(/the command/i);
    expect(text).toMatch(/summary line/i);
    expect(text).toMatch(/failures/i);
    expect(text).toMatch(/30 lines/);
    expect(text).toMatch(/not the full (output|log)/i);
  });

  it("gw-approve still checks that linked evidence files exist", () => {
    expect(core("commands/gw-approve.md")).toMatch(/links to[^\n]*is missing/i);
  });
});

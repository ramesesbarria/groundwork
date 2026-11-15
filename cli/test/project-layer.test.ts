// The README's first screen says Groundwork is project memory, and the page says what it keeps.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

describe("project memory", () => {
  const firstScreen = () => readme.slice(0, readme.indexOf("## "));

  it("names it, and says what it keeps", () => {
    expect(firstScreen()).toMatch(/project memory for coding agents/i);
    expect(readme).toMatch(/where the work stands[^.]*what comes next[^.]*where things\s+are[^.]*decided and why/i);
  });
});

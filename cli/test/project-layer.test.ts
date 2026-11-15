// The README's first screen says Groundwork is project memory and what it keeps.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

describe("project memory", () => {
  const firstScreen = () => readme.slice(0, readme.indexOf("## "));

  it("names it, what it keeps, and who writes what", () => {
    expect(firstScreen()).toMatch(/project memory for coding agents/i);
    expect(firstScreen()).toMatch(/where the work stands[^.]*where\s+things are[^.]*decided[^.]*went wrong/i);
    expect(firstScreen()).toMatch(/CLI writes the facts[^.]*agent writes only the judgment/i);
  });
});

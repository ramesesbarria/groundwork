// The README's first screen says Groundwork is the project layer and what it owns.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

describe("the project layer", () => {
  const firstScreen = () => readme.slice(0, readme.indexOf("## "));

  it("names it, what it keeps, and who picks it up", () => {
    expect(firstScreen()).toMatch(/shared project context/i);
    expect(firstScreen()).toMatch(/spec[^.]*decisions[^.]*cards[^.]*proof[^.]*handoff/i);
    expect(firstScreen()).toMatch(/session[^.]*teammate/i);
  });
});

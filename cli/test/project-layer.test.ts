// The README's first screen says Groundwork is the project layer and what it owns.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");

describe("the project layer", () => {
  const firstScreen = () => readme.slice(0, readme.indexOf("## The problem"));

  it("names it and what it owns", () => {
    expect(firstScreen()).toMatch(/project layer[^.]*owns[^.]*spec[^.]*cards[^.]*evidence[^.]*approv/i);
    expect(firstScreen()).toMatch(/session/i);
  });
});

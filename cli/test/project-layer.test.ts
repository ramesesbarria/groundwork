// Card 10.3: the README says Groundwork is the project layer, and works alongside skill packs.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const readme = read("README.md");
const spec = read(".groundwork/SPEC.md");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("the project layer", () => {
  const firstScreen = () => readme.slice(0, readme.indexOf("## Install"));

  it("the first screen names it and what it owns", () => {
    expect(firstScreen()).toMatch(/project layer/i);
    for (const thing of [/spec/i, /cards/i, /approv/i, /lessons/i, /where (the project|things) stand|handoff/i]) {
      expect(firstScreen()).toMatch(thing);
    }
  });

  it("the Adapters section says it works alongside skill packs such as superpowers, without claiming it was tried", () => {
    const adapters = section(readme, "Adapters");
    expect(adapters).toMatch(/superpowers/i);
    expect(adapters).toMatch(/should work alongside/i);
    expect(readme).not.toMatch(/(works|tested|verified) (with|alongside) superpowers/i);
  });

  it("SPEC §1's comparison includes the project layer", () => {
    const table = spec.slice(spec.indexOf("### How it differs"), spec.indexOf("## 2."));
    expect(table).toMatch(/project layer/i);
  });
});

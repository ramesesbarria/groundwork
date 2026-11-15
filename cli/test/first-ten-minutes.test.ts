// The first-session walkthrough lives in the docs site; the README keeps a compact quickstart.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const page = read("docs/content/docs/getting-started/first-10-minutes.mdx");
const cliReadme = read("cli/README.md");

// The code and transcript blocks from the page, in order.
const transcript = [...page.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");

describe("Your first 10 minutes", () => {
  it("walks through the five steps in order", () => {
    for (const step of [1, 2, 3, 4, 5]) expect(page).toContain(`## ${step}. `);
  });

  it("goes install, /gw, save, a handoff that is behind, then decisions and lessons", () => {
    const order = [/git status/, /\/gw/, /checkpoint/, /BEHIND/, /decide/].map((re) => transcript.search(re));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("uses only /gw as a slash command: the flow's commands belong to the flow", () => {
    const used = new Set([...transcript.matchAll(/\/(gw[\w-]*)/g)].map((m) => m[1]));
    expect([...used]).toEqual(["gw"]);
    expect(page).toContain("/docs/flow");
  });

  it("shows the verdict and the delta, not just the word", () => {
    expect(transcript).toMatch(/2 commits landed after it was written/);
    expect(transcript).toMatch(/Changed files:/);
  });

  it("cli/README.md keeps a short version with the install and a docs link", () => {
    expect(cliReadme).toContain("npx groundwork-ai init");
    expect(cliReadme).toContain("ramesesbarria.github.io/groundwork");
    expect(cliReadme).toMatch(/first 10 minutes/i);
  });
});

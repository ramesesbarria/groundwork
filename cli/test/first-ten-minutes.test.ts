// The first-session walkthrough lives in the docs site now; the README keeps a compact version.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const page = read("docs/getting-started/first-10-minutes.md");
const cliReadme = read("cli/README.md");

// The transcript blocks from the page, in order.
const transcript = [...page.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");

const FIRST_TIMER = new Set(["gw", "gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject"]);

describe("Your first 10 minutes", () => {
  it("walks through the five steps in order", () => {
    for (const step of [1, 2, 3, 4, 5]) expect(page).toContain(`## ${step}. `);
  });

  it("goes idea → questions → plan → card → approval stop → commit", () => {
    const order = [/idea|want/i, /\?/, /plan/i, /card/i, /what changed/i, /commit/i].map((re) => transcript.search(re));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows the approval stop in the 3-part format", () => {
    for (const part of [/what changed/i, /how to check/i, /caveats/i]) expect(transcript).toMatch(part);
  });

  it("uses only the commands a first-timer needs", () => {
    const used = [...transcript.matchAll(/\/(gw[\w-]*)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(FIRST_TIMER.has(name), `${name} isn't a first-timer command`).toBe(true);
  });

  it("cli/README.md keeps a short version with the install and a docs link", () => {
    expect(cliReadme).toContain("npx groundwork-ai init");
    expect(cliReadme).toContain("ramesesbarria.github.io/groundwork");
    expect(cliReadme).toMatch(/first 10 minutes/i);
  });
});

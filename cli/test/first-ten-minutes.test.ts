// Card 7.5: the README shows what using Groundwork feels like before explaining how it works.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const readme = read("README.md");
const cliReadme = read("cli/README.md");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

const FIRST_TIMER = new Set(["gw", "gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-approve", "gw-reject"]);

describe("Your first 10 minutes", () => {
  const walk = () => section(readme, "Your first 10 minutes");
  const transcript = () => walk().match(/```[a-z]*\n([\s\S]*?)```/)?.[1] ?? "";

  it("comes right after Install and before How it works", () => {
    const at = (h: string) => readme.indexOf(`## ${h}`);
    expect(at("Your first 10 minutes")).toBeGreaterThan(at("Install"));
    expect(at("Your first 10 minutes")).toBeLessThan(at("How it works"));
  });

  it("is a transcript under about 30 lines", () => {
    const lines = transcript().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(10);
    expect(lines.length).toBeLessThanOrEqual(30);
  });

  it("goes idea → questions → plan → card → approval stop → commit", () => {
    const text = transcript();
    const order = [/idea|want/i, /\?/, /plan/i, /card/i, /what changed/i, /commit/i].map((re) => text.search(re));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows the approval stop in the 3-part format", () => {
    for (const part of [/what changed/i, /how to check/i, /caveats/i]) expect(transcript()).toMatch(part);
  });

  it("uses only the commands a first-timer needs", () => {
    const used = [...transcript().matchAll(/\/(gw[\w-]*)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(FIRST_TIMER.has(name), `${name} isn't a first-timer command`).toBe(true);
  });

  it("cli/README.md has a two-line version", () => {
    expect(cliReadme).toMatch(/first 10 minutes/i);
  });
});

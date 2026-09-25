// The README is a product page: what Groundwork is, how it works and how to use it.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const readme = readFileSync(join(repo, "README.md"), "utf8");

function section(heading: string): string {
  const start = readme.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, next === -1 ? undefined : next);
}

describe("README", () => {
  it("opens with the tagline, the loop and the install steps", () => {
    const firstScreen = readme.slice(0, readme.indexOf("### 4."));
    expect(firstScreen).toMatch(/tool-agnostic workflow for building software with AI agents/i);
    expect(firstScreen).toContain("```mermaid");
    expect(firstScreen).toContain("npx groundwork-ai init");
  });

  it("gives install steps for Windows, macOS and Linux", () => {
    const start = section("Getting started with Groundwork");
    for (const system of ["**Windows**", "**macOS**", "**Linux**"]) expect(start).toContain(system);
    expect(start).toMatch(/Node\.js 22 or later/);
  });

  it("has the product sections", () => {
    for (const heading of ["Getting started with Groundwork", "Glossary", "Why Groundwork", "How it works", "Commands", "The lessons ledger", "Adapters", "License"]) {
      expect(section(heading), `missing "## ${heading}"`).not.toBe("");
    }
  });

  it("leaves out how Groundwork itself was built", () => {
    for (const pattern of [/dogfood/i, /honest limitations/i, /early preview/i, /built with itself/i, /\]\(\.groundwork\//, /\bL-0\d\d\b/, /PLAN\.md/]) {
      expect(readme).not.toMatch(pattern);
    }
  });

  it("every local link points to a file in the repo", () => {
    const local = [...readme.matchAll(/\]\((?!https?:|#)([^)\s]+)\)/g)].map((m) => m[1]);
    for (const link of local) expect(existsSync(join(repo, link)), `broken link: ${link}`).toBe(true);
  });
});

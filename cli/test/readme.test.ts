// The README is the product page: the pitch, the proof and the on-ramp, then links into the docs.
// Depth lives at https://ramesesbarria.github.io/groundwork/ — keep this file lean.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const readme = readFileSync(join(repo, "README.md"), "utf8");

const DOCS = "https://ramesesbarria.github.io/groundwork/";

function section(heading: string): string {
  const start = readme.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, next === -1 ? undefined : next);
}

// Every markdown page under docs/, for the public-surface checks below.
function docsPages(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry.startsWith(".") || entry === "public" || entry === "node_modules") continue;
      docsPages(path, found);
    } else if (entry.endsWith(".md")) {
      found.push(relative(repo, path).replaceAll("\\", "/"));
    }
  }
  return found;
}

describe("README", () => {
  it("opens with the tagline, the install and the demo slot", () => {
    const firstScreen = readme.slice(0, readme.indexOf("## The problem"));
    expect(firstScreen).toMatch(/spec, proof, approval/i);
    expect(firstScreen).toContain("/gw");
    expect(firstScreen).toContain("npx groundwork-ai init");
    expect(firstScreen).toMatch(/<!--\s*Demo GIF/i);
  });

  it("sells the why before the how", () => {
    const at = (heading: string) => readme.indexOf(`## ${heading}`);
    expect(at("The problem")).toBeGreaterThan(-1);
    expect(at("The problem")).toBeLessThan(at("Before and after"));
    expect(at("Before and after")).toBeLessThan(at("How it works"));
    expect(at("How it works")).toBeLessThan(at("Quickstart"));
  });

  it("has the pitch sections", () => {
    for (const heading of ["The problem", "Before and after", "How it works", "Quickstart", "Who it's for", "Honest comparison", "FAQ", "Contributing", "License"]) {
      expect(section(heading), `missing "## ${heading}"`).not.toBe("");
    }
  });

  it("stays a product page, not a manual", () => {
    const lines = readme.split("\n").length;
    expect(lines, "README has grown past its cap; move depth to docs/").toBeLessThanOrEqual(180);
  });

  it("links to documentation pages that exist", () => {
    const links = [...readme.matchAll(/https:\/\/ramesesbarria\.github\.io\/groundwork\/([^)\s#]*)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(5);
    for (const path of links) {
      const clean = path.replace(/\/$/, "");
      const file = clean === "" ? "docs/index.md" : join("docs", `${clean}.md`);
      expect(existsSync(join(repo, file)), `missing docs page for "${path}"`).toBe(true);
    }
    expect(readme).toContain(DOCS);
  });

  it("leaves out internals and other projects", () => {
    for (const pattern of [/dogfood/i, /superpowers/i, /built with groundwork/i, /honest limitations/i, /early preview/i, /built with itself/i, /\]\(\.groundwork\//, /\bL-0\d\d\b/, /PLAN\.md/]) {
      expect(readme).not.toMatch(pattern);
    }
  });

  it("no public page mentions other projects or how Groundwork is built", () => {
    const files = ["README.md", "cli/README.md", "docs/.vitepress/config.mts", ...docsPages(join(repo, "docs"))];
    const banned = [/dogfood/i, /superpowers/i, /built with groundwork/i, /built with itself/i, /developed with itself/i, /honest limitations/i, /early preview/i];
    for (const file of files) {
      const text = readFileSync(join(repo, file), "utf8");
      for (const pattern of banned) expect(text, `${file} mentions ${pattern}`).not.toMatch(pattern);
    }
  });

  it("every local link points to a file in the repo", () => {
    const local = [...readme.matchAll(/\]\((?!https?:|#)([^)\s]+)\)/g)].map((m) => m[1]);
    for (const link of local) expect(existsSync(join(repo, link)), `broken link: ${link}`).toBe(true);
  });
});

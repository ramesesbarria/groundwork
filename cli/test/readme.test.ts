// The README is the product page: the pitch, the loop and the install, then links into the docs.
// Depth lives at https://ramesesbarria.github.io/groundwork/ — keep this file lean.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const readme = readFileSync(join(repo, "README.md"), "utf8");

const DOCS = "https://ramesesbarria.github.io/groundwork/";

describe("README", () => {
  it("opens with the tagline, the loop and the install command", () => {
    const firstScreen = readme.slice(0, readme.indexOf("## Your first session"));
    expect(firstScreen).toMatch(/tool-agnostic workflow for building software with AI agents/i);
    expect(firstScreen).toContain("```mermaid");
    expect(firstScreen).toContain("npx groundwork-ai init");
  });

  it("stays a product page, not a manual", () => {
    const lines = readme.split("\n").length;
    expect(lines, "README has grown past its cap; move depth to docs/").toBeLessThanOrEqual(120);
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

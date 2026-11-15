// The README is the product page: the pitch, the problem, the quickstart and the proof, then links into
// the docs. Depth lives at https://ramesesbarria.github.io/groundwork/ — keep this file lean.
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

// Every public page of the docs site (docs pages and the site's own pages), for the checks below.
function docsPages(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) docsPages(path, found);
    else if (entry.endsWith(".mdx") || entry === "page.tsx") found.push(relative(repo, path).replaceAll("\\", "/"));
  }
  return found;
}

// A site URL path ("docs/concepts/cost", "quickstart", "") to the file that renders it.
function pageFile(path: string): string {
  if (path === "") return "docs/app/(home)/page.tsx";
  if (path === "docs") return "docs/content/docs/index.mdx";
  if (path.startsWith("docs/")) {
    const page = path.slice(5);
    const file = `docs/content/docs/${page}.mdx`;
    // A section's landing page is its index.mdx.
    return existsSync(join(repo, file)) ? file : `docs/content/docs/${page}/index.mdx`;
  }
  return `docs/app/(home)/${path}/page.tsx`;
}

describe("README", () => {
  it("opens with the positioning, the install and the next step", () => {
    const firstScreen = readme.slice(0, readme.indexOf("## "));
    expect(firstScreen).toMatch(/project memory for coding agents/i);
    expect(firstScreen).toMatch(/any session, tool or model resumes where the last one stopped/i);
    expect(firstScreen).toContain("npx groundwork-ai init");
    expect(firstScreen).toMatch(/type `\/gw`/);
    expect(firstScreen).toMatch(/\*\*Next:\*\*.*quickstart/);
  });

  it("states the problem and the quickstart before the detail", () => {
    const at = (heading: string) => readme.indexOf(`## ${heading}`);
    expect(at("The problem")).toBeGreaterThan(-1);
    expect(at("The problem")).toBeLessThan(at("Quickstart"));
    expect(at("Quickstart")).toBeLessThan(at("The memory set"));
    expect(at("The memory set")).toBeLessThan(at("How freshness works"));
    expect(at("How freshness works")).toBeLessThan(at("The flow (optional)"));
  });

  it("has the product sections, including parallel agents, the tools and upgrading", () => {
    for (const heading of ["The problem", "Quickstart", "The memory set", "How freshness works", "Parallel agents", "Supported tools", "The flow (optional)", "Results", "Upgrading from 1.x", "Documentation", "Contributing", "License"]) {
      expect(section(heading), `missing "## ${heading}"`).not.toBe("");
    }
  });

  it("shows a real brief, and says what is not verified or not built", () => {
    expect(section("How freshness works")).toMatch(/Handoff: BEHIND \(written/);
    const tools = section("Supported tools");
    expect(tools).toMatch(/not\s+inside a live Claude Code, OpenCode, Codex, Cursor or Gemini CLI session/);
    expect(tools).toMatch(/idle-event\s+checkpoint/);
    expect(readme).toMatch(/no `map` command/);
    expect(section("Parallel agents")).toMatch(/warning[\s\S]*not a refusal/);
  });

  it("presents /gw as the memory command, and the approval commands only with the flow", () => {
    const slash = new Set([...readme.matchAll(/`(\/gw[\w-]*)/g)].map((m) => m[1]));
    expect([...slash].sort()).toEqual(["/gw", "/gw-approve", "/gw-reject"]);
    expect(section("The flow (optional)")).toContain("/gw-approve");
    expect(section("Quickstart")).not.toContain("/gw-approve");
  });

  it("scopes the evaluation claims to 1.0, the tested agent and model, with the cost", () => {
    const results = section("Results");
    expect(results).toMatch(/run on 1\.0, with the flow on, not on 2\.0/);
    expect(results).toMatch(/OpenCode\s+2\.0\.32 with DeepSeek Flash/);
    expect(results).toMatch(/4× the API cost and 3× the time/);
    expect(results).toMatch(/can't show\s+how others behave/);
  });

  it("stays a product page, not a manual", () => {
    const lines = readme.split("\n").length;
    expect(lines, "README has grown past its cap; move depth to docs/").toBeLessThanOrEqual(220);
  });

  it("links to documentation pages that exist", () => {
    const links = [...readme.matchAll(/https:\/\/ramesesbarria\.github\.io\/groundwork\/([^)\s#]*)/g)]
      .map((m) => m[1])
      .filter((path) => !/\.[a-z0-9]+$/i.test(path)); // assets are checked separately
    expect(links.length).toBeGreaterThan(5);
    for (const path of links) {
      const file = pageFile(path.replace(/\/$/, ""));
      expect(existsSync(join(repo, file)), `missing docs page for "${path}"`).toBe(true);
    }
    expect(readme).toContain(DOCS);
  });

  it("leaves out internals and other projects", () => {
    for (const pattern of [/dogfood/i, /superpowers/i, /\bgroundwork (is|was) built with groundwork\b/i, /honest limitations/i, /early preview/i, /built with itself/i, /\]\(\.groundwork\//, /\bL-0\d\d\b/, /PLAN\.md/]) {
      expect(readme).not.toMatch(pattern);
    }
  });

  it("makes no unscoped superlatives", () => {
    expect(readme).not.toMatch(/\b(best|fastest|revolutionary|seamless|effortless)\b/i);
  });

  it("no public page mentions other projects or how Groundwork is built", () => {
    const files = ["README.md", "cli/README.md", ...docsPages(join(repo, "docs", "content")), ...docsPages(join(repo, "docs", "app"))];
    const banned = [/dogfood/i, /superpowers/i, /\bgroundwork (is|was) built with groundwork\b/i, /built with itself/i, /developed with itself/i, /honest limitations/i, /early preview/i];
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

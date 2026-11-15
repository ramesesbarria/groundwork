// The README is the product page: the pitch, the problem, a three-step quickstart and the benefits, then
// links into the docs. Depth lives at https://ramesesbarria.github.io/groundwork/ — keep this file lean.
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
  it("opens with the pitch and the install", () => {
    const firstScreen = readme.slice(0, readme.indexOf("## "));
    expect(firstScreen).toMatch(/project memory for coding agents/i);
    expect(firstScreen).toMatch(/picks up exactly where the last one stopped/i);
    expect(firstScreen).toContain("npx groundwork-ai init");
  });

  it("goes problem, answer, quickstart, a real brief, benefits, tools, then the optional flow", () => {
    const headings = ["Every new session starts from zero", "Now your project remembers", "Quickstart", "What the next session sees", "What you get", "Works with", "Want more structure?", "Learn more"];
    const at = headings.map((heading) => readme.indexOf(`## ${heading}`));
    for (const [i, heading] of headings.entries()) expect(at[i], `missing "## ${heading}"`).toBeGreaterThan(-1);
    expect(at).toEqual([...at].sort((x, y) => x - y));
  });

  it("has a three-step quickstart with the real commands", () => {
    const quickstart = section("Quickstart");
    expect(quickstart.match(/^\d\. /gm)).toHaveLength(3);
    expect(quickstart).toContain("`npx groundwork-ai init`");
    expect(quickstart).toMatch(/type `\/gw`/);
    expect(quickstart).toMatch(/Node\.js 22\+ and git/);
  });

  it("shows a real brief", () => {
    const brief = readme.slice(readme.indexOf("## What the next session sees"), readme.indexOf("## What you get")); // the brief has "## " lines of its own
    expect(brief).toMatch(/Handoff: BEHIND \(written/);
    expect(brief).toMatch(/2 commits landed after it was written/);
    expect(brief).toContain("`npx groundwork-ai brief`");
  });

  it("lists every supported tool, and says the integrations have not run in a live session", () => {
    const tools = section("Works with");
    for (const tool of ["Claude Code", "OpenCode", "Codex", "Cursor", "Gemini CLI", "`AGENTS.md`"]) expect(tools).toContain(tool);
    expect(tools).toMatch(/not yet inside a live\s+session/);
    expect(readme).not.toMatch(/verified (in|inside|against) (a )?live/i);
  });

  it("presents /gw as the memory command, and the approval commands only with the flow", () => {
    const slash = new Set([...readme.matchAll(/`(\/gw[\w-]*)/g)].map((m) => m[1]));
    expect([...slash].sort()).toEqual(["/gw", "/gw-approve", "/gw-reject"]);
    const flow = section("Want more structure?");
    expect(flow).toContain("/gw-approve");
    expect(flow).toContain("`npx groundwork-ai flow on`");
    expect(readme.replace(flow, "")).not.toMatch(/gw-(approve|reject)/);
  });

  it("keeps evaluation numbers out: they live on the Results docs page", () => {
    expect(readme).not.toMatch(/\d+ of \d+|\d+\/\d+ (runs|vs)|benchmark|DeepSeek/i);
    expect(readFileSync(join(repo, "docs/content/docs/results.mdx"), "utf8")).toMatch(/1\.0/);
  });

  it("reads in about a minute", () => {
    const words = readme.split(/\s+/).filter(Boolean).length;
    expect(words, "README has grown; move depth to docs/").toBeLessThanOrEqual(700);
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

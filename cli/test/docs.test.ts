// The docs site (docs/, deployed to GitHub Pages) must stay in step with the product:
// every agent command and CLI command documented, and every page reachable from the sidebar.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { run } from "../src/index.js";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const docs = join(repo, "docs");
const config = readFileSync(join(docs, ".vitepress", "config.mts"), "utf8");
// The sidebar object only, so a page left out of the navigation fails even if it appears elsewhere.
const sidebar = config.slice(config.indexOf("sidebar:"), config.indexOf("search:"));

function markdownPages(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "public" || entry === "node_modules") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) markdownPages(path, found);
    else if (entry.endsWith(".md")) found.push(relative(docs, path).replaceAll("\\", "/"));
  }
  return found;
}

describe("docs site", () => {
  it("documents every agent command", () => {
    const page = readFileSync(join(docs, "reference", "agent-commands.md"), "utf8");
    const commands = readdirSync(join(repo, "core", "commands"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""));
    expect(commands.length).toBeGreaterThan(0);
    for (const name of commands) {
      expect(page, `/gw-* reference is missing /${name}`).toContain(`/${name}`);
    }
  });

  it("documents every CLI command the CLI itself lists", async () => {
    const page = readFileSync(join(docs, "reference", "cli.md"), "utf8");
    const help = (await run(["--help"])).output;
    const commands = [...help.matchAll(/^\s{2}(\w+)\s{2}/gm)].map((match) => match[1]);
    expect(commands.length).toBeGreaterThanOrEqual(6);
    for (const name of commands) {
      expect(page, `CLI reference is missing "${name}"`).toMatch(new RegExp(`^## ${name}\\b`, "m"));
    }
  });

  it("links every page from the sidebar", () => {
    for (const page of markdownPages(docs)) {
      if (page === "index.md") continue;
      const link = `"/${page.replace(/\.md$/, "")}"`;
      expect(sidebar, `${page} isn't linked from the sidebar`).toContain(link);
    }
  });

  it("references only GIFs that exist in docs/public", () => {
    const text = markdownPages(docs).map((page) => readFileSync(join(docs, page), "utf8")).join("\n");
    const gifs = [...text.matchAll(/https:\/\/ramesesbarria\.github\.io\/groundwork\/(demo-[\w-]+\.gif)/g)].map((match) => match[1]);
    expect(gifs.length).toBeGreaterThan(0);
    for (const gif of new Set(gifs)) {
      expect(existsSync(join(docs, "public", gif)), `docs/ public is missing ${gif}`).toBe(true);
    }
  });
});

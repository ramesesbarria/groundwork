// The docs site (docs/, deployed to GitHub Pages) must stay in step with the product:
// every agent command and CLI command documented, and every page reachable from the sidebar.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { run } from "../src/index.js";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const docs = join(repo, "docs");
const content = join(docs, "content", "docs");

// Docs pages (content/docs/**/*.mdx) and the site's own pages (app/**/*.tsx), relative to docs/.
function files(dir: string, ext: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files(path, ext, found);
    else if (entry.endsWith(ext)) found.push(relative(docs, path).replaceAll("\\", "/"));
  }
  return found;
}
const pages = files(content, ".mdx");
const read = (path: string) => readFileSync(join(docs, path), "utf8");

describe("docs site", () => {
  it("documents every agent command", () => {
    const page = read("content/docs/reference/agent-commands.mdx");
    const commands = readdirSync(join(repo, "core", "commands"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""));
    expect(commands.length).toBeGreaterThan(0);
    for (const name of commands) {
      expect(page, `/gw-* reference is missing /${name}`).toContain(`/${name}`);
    }
  });

  it("documents every CLI command the CLI itself lists", async () => {
    const page = read("content/docs/reference/cli.mdx");
    const help = (await run(["--help"])).output;
    const commands = [...help.matchAll(/^\s{2}(\w+)\s{2}/gm)].map((match) => match[1]);
    expect(commands.length).toBeGreaterThanOrEqual(6);
    for (const name of commands) {
      expect(page, `CLI reference is missing "${name}"`).toMatch(new RegExp(`^## ${name}\\b`, "m"));
    }
  });

  it("links every page from the sidebar", () => {
    // Each folder's meta.json lists its pages; the root meta.json pulls each folder in with "...folder".
    const meta = (dir: string): string[] => JSON.parse(readFileSync(join(content, dir, "meta.json"), "utf8")).pages;
    for (const page of pages) {
      const path = relative("content/docs", page).replaceAll("\\", "/");
      const dir = dirname(path);
      const name = path.split("/").pop()!.replace(/\.mdx$/, "");
      expect(meta(dir), `${path} isn't listed in ${dir}/meta.json`).toContain(name);
      if (dir !== ".") expect(meta("."), `${dir}/ isn't in the sidebar`).toContain(`...${dir}`);
    }
  });

  it("references only media that exists in docs/public", () => {
    const text = [...pages, ...files(join(docs, "app"), ".tsx")].map(read).join("\n");
    const media = [
      ...text.matchAll(/https:\/\/ramesesbarria\.github\.io\/groundwork\/((?:demo-[\w-]+\.gif|clips\/[\w-]+\.mp4))/g),
      ...text.matchAll(/asset\(['"`]\/([\w./-]+\.(?:gif|mp4|png|svg))/g),
      ...text.matchAll(/file="([\w-]+\.mp4)"/g),
      ...text.matchAll(/<Shot src="\/([\w./-]+)"/g),
    ].map((match) => (match[0].startsWith("file=") ? `clips/${match[1]}` : match[1]));
    expect(media.length).toBeGreaterThan(5);
    for (const file of new Set(media)) {
      expect(existsSync(join(docs, "public", file)), `docs/public is missing ${file}`).toBe(true);
    }
  });

  it("forwards every old URL to a page that exists", () => {
    const legacy = read("app/[...legacy]/page.tsx");
    const targets = [...legacy.matchAll(/'(\/[\w/-]+)'/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(2);
    for (const target of targets) {
      const page = target.startsWith("/docs/")
        ? join(content, `${target.slice("/docs/".length)}.mdx`)
        : join(docs, "app", "(home)", target.slice(1), "page.tsx");
      expect(existsSync(page), `old URL forwards to missing ${target}`).toBe(true);
    }
  });
});

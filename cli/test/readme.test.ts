// Card 5.3: the README says what Groundwork is, fast, and claims nothing the evidence doesn't support.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

const npmPublished = (() => {
  try {
    const version = execFileSync("npm", ["view", "groundwork-ai", "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    });
    return version.trim() !== "";
  } catch {
    return false;
  }
})();

describe("README", () => {
  it("opens with the tagline, the loop and the install steps", () => {
    const firstScreen = readme.slice(0, readme.indexOf("## Why"));
    expect(firstScreen).toMatch(/tool-agnostic workflow for building software with AI agents/i);
    expect(firstScreen).toContain("```mermaid");
    expect(firstScreen).toMatch(/groundwork init|bin\.js init/);
  });

  it("has the sections the card asks for", () => {
    for (const heading of ["Why it exists", "How it works", "Commands", "The lessons ledger", "Adapters", "Honest limitations"]) {
      expect(section(heading), `missing "## ${heading}"`).not.toBe("");
    }
  });

  it("links to this repo's own trail and the dogfood write-up, and every local link exists", () => {
    expect(readme).toContain("(.groundwork/cards/)");
    expect(readme).toContain("(.groundwork/LESSONS.md)");
    expect(readme).toContain("(.groundwork/evidence/3.1/dogfood-writeup.md)");
    const local = [...readme.matchAll(/\]\((?!https?:|#)([^)\s]+)\)/g)].map((m) => m[1]);
    for (const link of local) expect(existsSync(join(repo, link)), `broken link: ${link}`).toBe(true);
  });

  it("doesn't offer npx install as working unless the package is actually on npm", () => {
    if (npmPublished) return;
    expect(readme).toMatch(/not on npm yet/i);
    const install = section("Install");
    expect(install).toMatch(/git clone/);
  });

  it("lists real limitations", () => {
    const items = section("Honest limitations").split("\n").filter((line) => line.startsWith("- "));
    expect(items.length).toBeGreaterThanOrEqual(4);
  });
});

// The shape of the core, checked structurally rather than sentence by sentence: every command and
// role has the sections adapters and agents rely on, every path the prompts name exists after
// `init`, and each file stays inside a token budget, so growth is a deliberate choice.
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { readCore } from "../src/core.js";
import { parseFrontmatter } from "../src/frontmatter.js";
import { planInit } from "../src/init.js";
import { estimateTokens } from "../src/tokens.js";

const core = readCore(fileURLToPath(new URL("../../core/", import.meta.url)));
const files = (prefix: string) => Object.keys(core).filter((p) => p.startsWith(prefix) && p.endsWith(".md"));
const commands = files("commands/");
const roles = files("roles/");
const headings = (md: string) => [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());

describe("commands", () => {
  it.each(commands)("%s has name, a short description, and Purpose, Steps, Writes and Must not", (path) => {
    const md = core[path];
    const fm = parseFrontmatter(md);
    expect(fm.name).toBe(path.slice("commands/".length, -".md".length));
    expect(fm.description?.split(/\s+/).length ?? 0, "descriptions are always in context: keep them short").toBeLessThanOrEqual(25);
    expect(headings(md)).toEqual(expect.arrayContaining(["Purpose", "Steps", "Writes", "Must not"]));
  });
});

describe("roles", () => {
  it.each(roles)("%s has Job, Load, Writes and Must not, and loads its rules file", (path) => {
    const md = core[path];
    expect(headings(md)).toEqual(expect.arrayContaining(["Job", "Load", "Writes", "Must not"]));
    const role = path.slice("roles/".length, -".md".length);
    expect(md).toContain(`.groundwork/rules/${role}.md`);
  });
});

describe("paths the prompts name", () => {
  // Made while working, not by init.
  const MADE_LATER = [
    /^\.groundwork\/retro\.md$/,
    /^\.groundwork\/\.approvals\/$/,
    /^\.groundwork\/private\/$/,
    /^\.groundwork\/evidence\/baseline\/?$/,
    /^\.groundwork\/cards\/[^/]+\.md$/,
    /^\.groundwork\/decisions\/[^/]+\.md$/,
  ];

  it("exist after init, or are made later by the workflow", () => {
    const installed = planInit(core, "claude-code").map((f) => f.path);
    const exists = (path: string) => {
      const clean = path.replace(/\/$/, "");
      return installed.includes(clean) || installed.some((p) => p.startsWith(`${clean}/`));
    };
    const named = new Set<string>();
    for (const [path, md] of Object.entries(core)) {
      if (!path.endsWith(".md")) continue;
      for (const m of md.matchAll(/`(\.groundwork\/[^`\s]*)`/g)) {
        if (/[<{*]/.test(m[1])) continue; // a pattern like evidence/<card-id>/, not a path
        named.add(m[1]);
      }
    }
    expect(named.size).toBeGreaterThan(10);
    const missing = [...named].filter((p) => !exists(p) && !MADE_LATER.some((re) => re.test(p)));
    expect(missing).toEqual([]);
  });
});

describe("token budgets", () => {
  const BUDGETS: [string, number][] = [
    ["workflow.md", 1450], // three approval modes; the details of at-end live in guides/at-end.md
    ...commands.map((p): [string, number] => [p, 900]),
    ...roles.map((p): [string, number] => [p, 800]),
    ["templates/AGENTS.md", 500],
    ["templates/card.md", 450],
    ["reference/statuses.md", 600],
  ];
  it.each(BUDGETS)("%s stays under %i tokens", (path, budget) => {
    expect(core[path], `${path} is missing`).toBeDefined();
    expect(estimateTokens(core[path])).toBeLessThan(budget);
  });
});

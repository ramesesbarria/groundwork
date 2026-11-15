// One parser and serializer for the memory files, used by the CLI and by the hooks.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { coreDir, tempDir, write } from "./support.js";
// @ts-expect-error: plain JavaScript module from the core, shipped as-is
import * as memory from "../../core/lib/memory.mjs";

const V2 = [
  "---",
  "schema: 2",
  "updated: 2026-11-15T10:00:00Z",
  "head: 0123456789abcdef0123456789abcdef01234567",
  "branch: feat/login",
  "tool: claude-code",
  'model: "model: with a colon"',
  "---",
  "# Handoff",
  "",
  "<!-- a comment -->",
  "",
  "## Now",
  "Login form renders.",
  "",
  "## Next",
  "Wire validation in `src/login.ts`.",
  "",
  "## Blockers",
  "none",
  "",
  "## Failing checks",
  "- `npm test`: 2 failing",
  "",
  "## Workers in flight",
  "none",
  "",
  "## Notes",
  "",
].join("\n");

const LEGACY = [
  "# Handoff",
  "",
  "- **Phase:** 1 Voting",
  "- **Current card:** 1.3 Login flow",
  "- **Status:** implementing",
  "- **Last step:** tester wrote 4 failing tests",
  "- **Next step:** make the session test pass",
  "- **Failing checks:** 4 new tests",
  "- **Workers in flight:** none",
  "- **Notes:**",
  "  - call: sessions are cookies",
  "  - trap: the clock is mocked",
  "",
  "## Session log 2026-10-01",
  "did a lot of things",
  "",
].join("\n");

describe("the handoff parser", () => {
  it("reads a 2.0 handoff: the stamp and each section", () => {
    const handoff = memory.parseHandoff(V2);
    expect(handoff.format).toBe("sections");
    expect(handoff.meta).toMatchObject({ schema: "2", branch: "feat/login", tool: "claude-code", model: "model: with a colon" });
    expect(memory.handoffView(handoff)).toEqual({
      now: "Login form renders.",
      next: "Wire validation in `src/login.ts`.",
      blockers: "none",
      failingChecks: "- `npm test`: 2 failing",
      workers: "none",
      notes: "",
    });
    expect(memory.validateHandoff(handoff)).toEqual([]);
  });

  it("reads a handoff from before 2.0 through the same fields", () => {
    const handoff = memory.parseHandoff(LEGACY);
    expect(handoff.format).toBe("bullets");
    const view = memory.handoffView(handoff);
    expect(view.now).toBe("tester wrote 4 failing tests");
    expect(view.next).toBe("make the session test pass");
    expect(view.failingChecks).toBe("4 new tests");
    expect(view.notes).toContain("the clock is mocked");
    expect(handoff.fields["Current card"]).toBe("1.3 Login flow");
    expect(memory.validateHandoff(handoff).join(" ")).toMatch(/2\.0 layout/);
  });

  it("reads Windows line endings and a byte order mark", () => {
    const handoff = memory.parseHandoff(`﻿${V2.replace(/\n/g, "\r\n")}`);
    expect(handoff.meta.branch).toBe("feat/login");
    expect(memory.handoffView(handoff).next).toBe("Wire validation in `src/login.ts`.");
  });

  it("doesn't take a heading inside a code fence for a section", () => {
    const handoff = memory.parseHandoff("## Now\n```\n## not a section\n```\n\n## Next\nx\n");
    expect(handoff.sections.map((s: { name: string }) => s.name)).toEqual(["Now", "Next"]);
  });

  it("says what is wrong with a handoff that isn't valid", () => {
    expect(memory.validateHandoff(memory.parseHandoff(""))).toEqual(["it is empty"]);
    const noNext = memory.parseHandoff("---\nschema: 2\nupdated: 2026-01-01T00:00:00Z\nhead: nothex\n---\n## Now\nx\n");
    expect(memory.validateHandoff(noNext)).toEqual(['it has no "## Next" section', "its `head` isn't a commit hash"]);
  });
});

describe("the handoff serializer", () => {
  it("round-trips a 2.0 handoff without changing its fields", () => {
    const first = memory.parseHandoff(V2);
    const text = memory.renderHandoff(first.meta, memory.toSections(first));
    const second = memory.parseHandoff(text);
    expect(second.meta).toEqual(first.meta);
    expect(memory.handoffView(second)).toEqual(memory.handoffView(first));
    expect(memory.renderHandoff(second.meta, memory.toSections(second))).toBe(text);
  });

  it("rewrites an old handoff in the 2.0 layout without dropping anything", () => {
    for (const flow of [true, false]) {
      const text = memory.renderHandoff({ schema: 2 }, memory.toSections(memory.parseHandoff(LEGACY), { flow }));
      const handoff = memory.parseHandoff(text);
      expect(handoff.format).toBe("sections");
      for (const kept of ["1 Voting", "1.3 Login flow", "implementing", "tester wrote 4 failing tests", "make the session test pass", "4 new tests", "the clock is mocked", "did a lot of things"]) {
        expect(text, `flow ${flow}: lost "${kept}"`).toContain(kept);
      }
      // The flow's bullets keep their own section when the flow is on, and go to Notes otherwise.
      expect(handoff.sections.some((s: { name: string }) => s.name === "Flow")).toBe(flow);
      expect(handoff.fields["Current card"]).toBe("1.3 Login flow");
      expect(memory.extraSections(handoff).map((s: { name: string }) => s.name)).toEqual(["Session log 2026-10-01"]);
    }
  });

  it("keeps prose with no fields at all, under Notes", () => {
    const text = memory.renderHandoff({ schema: 2 }, memory.toSections(memory.parseHandoff("# Handoff\n\nWe stopped halfway through the import job.\n")));
    expect(memory.handoffView(memory.parseHandoff(text)).notes).toBe("We stopped halfway through the import job.");
  });

  it("quotes frontmatter values that YAML would misread, and reads them back", () => {
    const meta = { schema: 2, tool: "a tool: with colon", model: 'quote "x"', branch: "feat/x" };
    const { meta: back } = memory.splitFrontmatter(memory.renderFrontmatter(meta) + "body");
    expect(back).toEqual({ schema: "2", tool: "a tool: with colon", model: 'quote "x"', branch: "feat/x" });
  });

  it("fingerprints the prose, not the stamp, layout or comments", () => {
    const a = memory.bodyPrint(memory.toSections(memory.parseHandoff(V2)));
    const b = memory.bodyPrint(memory.toSections(memory.parseHandoff(V2.replace("updated: 2026-11-15T10:00:00Z", "updated: 2027-01-01T00:00:00Z").replace("<!-- a comment -->", "<!-- another -->"))));
    const c = memory.bodyPrint(memory.toSections(memory.parseHandoff(V2.replace("Login form renders.", "Login form validates."))));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("the installed templates", () => {
  const template = (path: string) => readFileSync(join(coreDir, path), "utf8");

  it.each(["templates/HANDOFF.md", "context/templates/HANDOFF.md"])("%s is a valid 2.0 handoff apart from its stamp", (path) => {
    const handoff = memory.parseHandoff(template(path));
    expect(handoff.format).toBe("sections");
    expect(handoff.meta.schema).toBe("2");
    expect(memory.validateHandoff(handoff)).toEqual(["it has no `updated` time"]);
    expect(handoff.sections.map((s: { name: string }) => s.name).slice(0, 6)).toEqual(memory.SECTIONS);
  });

  it("the decisions index template is what the generator writes for no decisions", () => {
    expect(template("templates/DECISIONS.md")).toBe(memory.renderDecisionsIndex({ live: [], archived: [] }));
  });
});

describe("decisions, lessons, journal and map", () => {
  function project(): string {
    const dir = tempDir();
    write(dir, ".groundwork/decisions/0001-database.md", "---\nid: 0001\ntitle: Use SQLite\nstatus: accepted\ndate: 2026-09-01\n---\n## Context\n");
    write(dir, ".groundwork/decisions/0002-hosting.md", '---\nid: 0002\ntitle: "Hosting: a | b"\nstatus: superseded\ndate: 2026-09-02\n---\n');
    write(dir, ".groundwork/decisions/0003-untitled-thing.md", "no frontmatter\n");
    write(dir, ".groundwork/decisions/TEMPLATE.md", "---\nid: {{id}}\n---\n");
    return dir;
  }

  it("reads every decision record, with defaults for what a record leaves out", () => {
    const { live, archived } = memory.readDecisions(join(project(), ".groundwork"));
    expect(live.map((d: { id: string; title: string; status: string }) => [d.id, d.title, d.status])).toEqual([
      ["0001", "Use SQLite", "accepted"],
      ["0002", "Hosting: a | b", "superseded"],
      ["0003", "untitled thing", "proposed"],
    ]);
    expect(archived).toEqual([]);
  });

  it("generates the index, and knows when it is out of step", () => {
    const groundwork = join(project(), ".groundwork");
    expect(memory.decisionsIndexInSync(groundwork)).toBe(false);
    expect(memory.writeDecisionsIndex(groundwork)).toBe(true);
    expect(memory.writeDecisionsIndex(groundwork)).toBe(false);
    const index = readFileSync(join(groundwork, "DECISIONS.md"), "utf8");
    expect(index).toContain("| 0001 | Use SQLite | accepted | 2026-09-01 | [0001-database.md](decisions/0001-database.md) |");
    expect(index).toContain("Hosting: a \\| b");
    expect(index).toMatch(/Generated by `groundwork index`/);
    write(join(groundwork, ".."), ".groundwork/decisions/0004-new.md", "---\nid: 0004\ntitle: New\nstatus: proposed\n---\n");
    expect(memory.decisionsIndexInSync(groundwork)).toBe(false);
    expect(memory.nextDecisionId(groundwork)).toBe("0005");
  });

  it("reads lessons with their level, skipping the template's commented example", () => {
    const dir = tempDir();
    write(dir, ".groundwork/LESSONS.md", "# Lessons\n\n<!--\n### L-001 · Example\n- Level: NOTE\n-->\n\n### L-001 · Run migrations first\n- Level: RULE\n- Origin: x\n\n### L-002 · Small thing\n- Origin: y\n");
    const groundwork = join(dir, ".groundwork");
    expect(memory.readLessons(groundwork)).toEqual([
      { id: "L-001", title: "Run migrations first", level: "RULE" },
      { id: "L-002", title: "Small thing", level: "NOTE" },
    ]);
    expect(memory.nextLessonId(groundwork)).toBe("L-003");
  });

  it("splits a journal into entries and finds the commit of the newest checkpoint", () => {
    const text = "# Journal\n\n<!-- note -->\n\n## 2026-11-01 10:00 UTC · main @ aaaaaaa\n- Commits (1):\n\n## Phase 1: Voting works (2026-11-02)\n- Shipped: x\n\n## 2026-11-03 09:00 UTC · main @ bbbbbbb · tool\n- Now: y\n";
    const journal = memory.parseJournal(text);
    expect(journal.entries).toHaveLength(3);
    expect(journal.head).toContain("# Journal");
    expect(memory.renderJournal(journal)).toBe(text);
    expect(memory.lastJournalHead(text)).toBe("bbbbbbb");
    expect(memory.lastJournalHead("# Journal\n")).toBeUndefined();
  });

  it("finds paths the map names that no longer exist, and ignores what isn't a path", () => {
    const dir = tempDir();
    write(dir, "src/app.ts", "");
    const map = "## Layout\n- `src/app.ts` is the entry point (found)\n- `src/gone.ts` and `lib/` hold helpers\n- run `npm test`, see `https://example.com/x`, the `.groundwork/HANDOFF.md`\n<!-- `commented/out.ts` -->\n";
    expect(memory.missingMapPaths(dir, map)).toEqual(["src/gone.ts", "lib/"]);
    expect(memory.mapFilled(map)).toBe(true);
    expect(memory.mapFilled(readFileSync(join(coreDir, "templates/MAP.md"), "utf8"))).toBe(false);
  });

  it("gives budgets and the stale limit their defaults, and takes the config's", () => {
    expect(memory.budgetsOf({})).toEqual(memory.DEFAULT_BUDGETS);
    expect(memory.budgetsOf({ budgets: { handoff: 300 } })).toMatchObject({ handoff: 300, brief: 1500 });
    expect(memory.staleDaysOf({})).toBe(14);
    expect(memory.staleDaysOf({ staleAfterDays: 3 })).toBe(3);
  });

  it("counts an install from before 2.0 as having the flow, and a 2.0 one by its config", () => {
    const old = tempDir();
    write(old, ".groundwork/config.json", "{}");
    write(old, ".groundwork/guards/run.mjs", "");
    expect(memory.flowEnabled(join(old, ".groundwork"))).toBe(true);
    write(old, ".groundwork/config.json", '{"flow": false}');
    expect(memory.flowEnabled(join(old, ".groundwork"))).toBe(false);
    const fresh = tempDir();
    write(fresh, ".groundwork/config.json", "{}");
    expect(memory.flowEnabled(join(fresh, ".groundwork"))).toBe(false);
  });
});

describe("one parser, not two", () => {
  // Before 2.0 the CLI's status command and the session-start hook each had their own regex for
  // "- **Field:** value". Now both go through core/lib/memory.mjs.
  const BULLET_REGEX = /\\\*\\\*\$\{|\\\\\*\\\\\*\$\{/;
  const src = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("neither the CLI's commands nor the hooks parse handoff fields themselves", () => {
    const files = [
      ...readdirSync(new URL("../src/", import.meta.url)).filter((name) => name.endsWith(".ts")).map((name) => `src/${name}`),
      ...readdirSync(join(coreDir, "hooks")).map((name) => `../core/hooks/${name}`),
    ];
    for (const file of files) expect(src(file), file).not.toMatch(BULLET_REGEX);
  });

  it("the hooks and the CLI load the same module", () => {
    expect(src("../core/hooks/session-start.mjs")).toContain('from "../lib/brief.mjs"');
    expect(src("../core/hooks/checkpoint.mjs")).toContain('from "../lib/checkpoint.mjs"');
    expect(src("src/memory.ts")).toMatch(/locateCore\(\), "lib"/);
    for (const name of ["memory.mjs", "git.mjs", "freshness.mjs", "checkpoint.mjs", "brief.mjs", "compact.mjs"]) {
      expect(existsSync(join(coreDir, "lib", name)), name).toBe(true);
    }
  });
});

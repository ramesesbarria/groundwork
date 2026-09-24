import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APPROVAL_MODES, CARD_STATUSES, TRANSITIONS } from "../src/schema.js";
import { estimateTokens } from "../src/tokens.js";

const workflow = readFileSync(new URL("../../core/workflow.md", import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

// Rows of the first markdown table in a section, as arrays of cell text (backticks stripped).
function tableRows(md: string): string[][] {
  return md
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .slice(2) // header + divider
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/`/g, "")));
}

describe("workflow.md", () => {
  it("mentions every card status", () => {
    for (const status of CARD_STATUSES) expect(workflow).toContain(`\`${status}\``);
  });

  it("has a transitions table that matches the schema exactly", () => {
    const rows = tableRows(section(workflow, "Card statuses"));
    const pairs = rows.map(([from, to]) => `${from} → ${to}`).sort();
    expect(pairs).toEqual(TRANSITIONS.map(([from, to]) => `${from} → ${to}`).sort());
    for (const row of rows) expect(row[2], `no "who" for ${row[0]} → ${row[1]}`).toBeTruthy();
  });

  it("only allows transitions between known statuses", () => {
    for (const [from, to] of TRANSITIONS) {
      expect(CARD_STATUSES).toContain(from);
      expect(CARD_STATUSES).toContain(to);
    }
  });

  it("says who starts a card and what happens after approval", () => {
    expect(section(workflow, "Card statuses")).toMatch(/runner/i);
    const approval = section(workflow, "Approval");
    expect(approval).toMatch(/commit/i);
    expect(approval).toMatch(/done/);
  });

  it("covers both approval modes", () => {
    const approval = section(workflow, "Approval");
    for (const mode of APPROVAL_MODES) expect(approval).toContain(`\`${mode}\``);
  });

  it("states the evidence rule and the commit format", () => {
    expect(workflow).toMatch(/no evidence, no approval/i);
    expect(workflow).toContain("[<card-id>] <card title>");
  });

  it("says when HANDOFF.md is updated", () => {
    const handoff = section(workflow, "HANDOFF");
    expect(handoff).toMatch(/every role change/i);
    expect(handoff).toMatch(/before (you )?stop/i);
  });

  it("explains how to run the roles without subagents", () => {
    expect(section(workflow, "Without subagents")).not.toBe("");
  });

  it("stays under 1,500 tokens", () => {
    expect(estimateTokens(workflow)).toBeLessThan(1500);
  });
});

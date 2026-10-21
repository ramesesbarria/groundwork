// Approval covers substantive reviewed content, so the work is finished before the approval stop and
// left alone after it. Complete requests don't get redundant confirmation questions.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

describe("approval scope", () => {
  it("gw-next finishes spec, decision and doc updates before the per-card approval stop", () => {
    expect(core("commands/gw-next.md")).toMatch(/`per-card` mode: first update SPEC\.md, decisions and docs for the card \(approval covers them\)/);
  });

  it("gw-approve edits nothing substantive after approval", () => {
    expect(core("commands/gw-approve.md")).toMatch(/Edit nothing else: code, evidence, SPEC\.md, decisions or card content would need a new `\/gw-approve`/);
  });
});

describe("no redundant confirmation", () => {
  it("gw-spec skips questions a complete request already answered, and treats it as confirmed", () => {
    const spec = core("commands/gw-spec.md");
    expect(spec).toMatch(/If the request already covers it all, skip the questions in steps 2 and 4/);
    expect(spec).toMatch(/If the human's own words settled everything in it \(nothing open, no defaults you chose\), it's confirmed/);
    expect(spec).toMatch(/Don't ask about what they already told you/);
  });

  it("gw-plan goes ahead with a one-card plan for a complete request, and still waits for bigger plans", () => {
    const plan = core("commands/gw-plan.md");
    expect(plan).toMatch(/A one-card plan for a complete request needs no OK/);
    expect(plan).toMatch(/\*\*wait for the human's OK\*\*/);
  });

  it("gw only asks to confirm a spec the request didn't settle", () => {
    expect(core("commands/gw.md")).toMatch(/If the request settled all of it, note it confirmed and go on; else ask the human to confirm/);
  });
});

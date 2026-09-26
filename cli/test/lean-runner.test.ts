// Keeping sessions cheap: what the calculator run showed costs tokens for nothing.
// The runner's chat re-reads its whole history on every step, so it hands off briefly and stays
// light; roles record their own calls; and nobody goes looking in chat logs for what was agreed.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("a light runner", () => {
  const steps = section(core("commands/gw-next.md"), "Steps");

  it("hands a role no statuses to set and no retelling of what was agreed", () => {
    expect(steps).toMatch(/Never guesses[^\n]*statuses to set[^\n]*what was agreed/);
  });

  it("doesn't rerun checks between roles, since the reviewer does", () => {
    expect(steps).toMatch(/Don't rerun checks between roles: the reviewer does/);
  });

  it("suggests a fresh session when a phase closes, since HANDOFF carries the state", () => {
    const approve = core("commands/gw-approve.md");
    expect(approve).toMatch(/Fresh session per phase[^\n]*new session[^\n]*HANDOFF/);
  });
});

describe("roles", () => {
  it.each(["tester", "implementer"])("%s writes its own History line and call: lines", (name) => {
    const writes = section(core(`roles/${name}.md`), "Writes");
    expect(writes).toMatch(/History: one short line for your step, plus a `call:` line/);
    expect(writes).toMatch(/a report to the runner isn't enough/);
  });

  it.each(["tester", "implementer", "reviewer"])("%s treats what isn't in its files as not agreed", (name) => {
    const load = section(core(`roles/${name}.md`), "Load");
    expect(load).toMatch(/What isn't in these files wasn't agreed\. Don't search chat logs or other folders/);
  });
});

describe("short cards", () => {
  it("asks for short History and Evidence lines, since every role rereads the card", () => {
    const card = core("templates/card.md");
    expect(card).toMatch(/Details belong in the file/);
    expect(card).toMatch(/Every role rereads this card/);
  });
});

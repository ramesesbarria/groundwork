// Card 10.1: one setup question sets experience to "new" or "experienced" (decision 0002).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { estimateTokens } from "../src/tokens.js";

const core = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");

function section(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = md.indexOf("\n## ", start + 1);
  return md.slice(start, next === -1 ? undefined : next);
}

describe("the setting", () => {
  it("the config template has it, defaulting to new", () => {
    expect(JSON.parse(core("templates/config.json")).experience).toBe("new");
  });

  it("the schema allows new and experienced, and says what each changes", () => {
    const prop = JSON.parse(core("templates/config.schema.json")).properties.experience;
    expect(prop.enum).toEqual(["new", "experienced"]);
    expect(prop.description).toMatch(/explain/i);
  });

  it("setup asks one plain question and saves it", () => {
    const steps = section(core("commands/gw-setup.md"), "Steps");
    expect(steps).toMatch(/new to building software, or experienced\?/i);
    expect(steps).toContain("`experience`");
  });

  it("the default approval mode follows it when the human is unsure", () => {
    const steps = section(core("commands/gw-setup.md"), "Steps");
    expect(steps).toMatch(/unsure[^\n]*`per-card`[^\n]*new[^\n]*`per-phase`[^\n]*experienced/i);
  });
});

describe("where it changes behavior", () => {
  it("the workflow documents both values", () => {
    const text = section(core("workflow.md"), "Experience");
    expect(text).toMatch(/`new`/);
    expect(text).toMatch(/`experienced`/);
    expect(text).toMatch(/explain/i);
  });

  it.each(["commands/gw-next.md", "commands/gw-approve.md", "commands/gw-decide.md"])("%s says what each value changes", (path) => {
    const text = core(path);
    expect(text).toMatch(/`experience: new`|`new`/);
    expect(text).toMatch(/`experienced`/);
  });

  it("new always gets How to check at the approval stop", () => {
    expect(section(core("commands/gw-next.md"), "Steps")).toMatch(/`new`[^\n]*always[^\n]*how to check/i);
  });

  it("experienced gets options without a recommendation unless asked", () => {
    expect(section(core("commands/gw-decide.md"), "Steps")).toMatch(/`experienced`[^\n]*unless[^\n]*ask/i);
  });
});

describe("switching and budget", () => {
  it("AGENTS.md tells the agent to read the setting from the config each time", () => {
    const agents = core("templates/AGENTS.md");
    expect(agents).toMatch(/`experience`[^\n]*config/);
    expect(section(agents, "How we work").match(/^\d+\. /gm)?.length).toBe(9);
  });

  it("no command stores it anywhere else, so switching mid-project needs no other change", () => {
    for (const name of ["gw-next", "gw-approve", "gw-decide", "gw-setup"]) {
      expect(core(`commands/${name}.md`)).not.toMatch(/experience[^\n]*(HANDOFF|AGENTS\.md)/);
    }
  });

  it("AGENTS.md stays at about 400 tokens", () => {
    expect(estimateTokens(core("templates/AGENTS.md"))).toBeLessThan(450);
  });
});

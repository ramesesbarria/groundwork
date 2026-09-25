// `groundwork adapter add <tool>`: add or refresh an AI tool adapter in an installed project.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readCore } from "./core.js";
import { applyFiles } from "./files.js";
import { readProjectConfig } from "./config.js";
import { ADAPTERS, isAdapter, NEXT_STEPS, planAdapter } from "./init.js";
import type { Io, RunResult } from "./index.js";

const TOOLS = ADAPTERS.filter((a) => a !== "none");
const USAGE = `Usage: groundwork adapter add <${TOOLS.join("|")}>`;

export async function adapter(args: string[], io: Io): Promise<RunResult> {
  const [action, tool] = args;
  if (action !== "add" || tool === undefined) return { code: 1, output: USAGE };
  if (!isAdapter(tool) || tool === "none") {
    return { code: 1, output: `Unknown adapter: ${tool}. Choose one of: ${TOOLS.join(", ")}.` };
  }

  const groundwork = join(io.cwd, ".groundwork");
  if (!existsSync(groundwork)) {
    return { code: 1, output: "Groundwork isn't installed here. Run `groundwork init` in your project's folder first." };
  }

  // Build from the project's own .groundwork/, so custom or older commands and roles are respected.
  const models = readProjectConfig(groundwork).models;
  const { lines } = await applyFiles(planAdapter(readCore(groundwork), tool, models), io, false);
  const header =
    lines.length === 0 ? `The ${tool} adapter is already up to date. Nothing to change.` : `Added the ${tool} adapter.`;
  return { code: 0, output: [header, ...lines, "", NEXT_STEPS[tool]].join("\n") };
}

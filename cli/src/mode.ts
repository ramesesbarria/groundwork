// `groundwork mode [per-card|per-phase|at-end]`: show or change when the human approves the work.
// The agent can't change this itself (protect-harness blocks it), so this is the human's one-liner.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "./config.js";
import { APPROVAL_MODES } from "./schema.js";
import type { Io, RunResult } from "./index.js";

export const MODE_EXPLAINED: Record<(typeof APPROVAL_MODES)[number], string> = {
  "per-card": "you approve every card before it's committed",
  "per-phase": "each card is committed once its review passes; you approve each phase",
  "at-end": "the agent builds every card straight through, one review covers them all, and you approve once at the end",
};

export function mode(args: string[], io: Pick<Io, "cwd">): RunResult {
  const path = join(io.cwd, ".groundwork", "config.json");
  if (!existsSync(path)) {
    return { code: 1, output: "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first." };
  }
  let config: Record<string, unknown>;
  try {
    config = parseJson(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch (error) {
    return { code: 1, output: `.groundwork/config.json isn't valid JSON (${(error as Error).message}). Fix it first.` };
  }
  const current = (config.approvalMode as string | undefined) ?? "per-card";
  const [wanted] = args;
  const list = APPROVAL_MODES.map((m) => `  ${m.padEnd(9)}  ${MODE_EXPLAINED[m]}`).join("\n");

  if (wanted === undefined) {
    return { code: 0, output: `Approval mode: ${current}.\n\nModes:\n${list}\n\nChange it with: npx groundwork-ai mode <mode>` };
  }
  if (!(APPROVAL_MODES as readonly string[]).includes(wanted)) {
    return { code: 1, output: `Unknown mode: ${wanted}.\n\nModes:\n${list}` };
  }
  if (wanted === current) return { code: 0, output: `Approval mode is already ${current}.` };
  writeFileSync(path, JSON.stringify({ ...config, approvalMode: wanted }, null, 2) + "\n");
  return {
    code: 0,
    output: `Approval mode: ${current} → ${wanted}: ${MODE_EXPLAINED[wanted as (typeof APPROVAL_MODES)[number]]}. It applies from the next step.`,
  };
}

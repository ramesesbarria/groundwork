// `groundwork check [card-id...]`: check cards against the workflow's rules. Exits 1 on any problem,
// so /gw-approve, a guard or CI can rely on it. The rules live in core/guards/lib/cards.mjs, shared
// with the commit gate that runs inside a project.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { locateCore } from "./init.js";
import { readProjectConfig } from "./config.js";
import type { Io, RunResult } from "./index.js";

export interface CardCheck {
  file: string;
  id: string;
  problems: string[];
}

interface CardRules {
  checkCards(projectDir: string, approvalMode: string): CardCheck[];
  checkCard(md: string, options: { projectDir: string; approvalMode?: string }): string[];
  STATUSES: string[];
  TRANSITIONS: [string, string][];
}

export const cardRules = async (): Promise<CardRules> =>
  (await import(pathToFileURL(join(locateCore(), "guards", "lib", "cards.mjs")).href)) as CardRules;

export async function checkProject(cwd: string): Promise<CardCheck[]> {
  const mode = String(readProjectConfig(join(cwd, ".groundwork")).approvalMode ?? "per-card");
  return (await cardRules()).checkCards(cwd, mode);
}

export async function check(args: string[], io: Pick<Io, "cwd">): Promise<RunResult> {
  if (!existsSync(join(io.cwd, ".groundwork"))) {
    return { code: 1, output: "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first." };
  }
  const all = await checkProject(io.cwd);
  const wanted = args.filter((a) => !a.startsWith("-"));
  const missing = wanted.filter((id) => !all.some((c) => c.id === id));
  if (missing.length > 0) return { code: 1, output: `No card with id ${missing.join(", ")} in .groundwork/cards/.` };
  const cards = wanted.length > 0 ? all.filter((c) => wanted.includes(c.id)) : all;
  if (cards.length === 0) return { code: 0, output: "No cards yet." };

  const bad = cards.filter((c) => c.problems.length > 0);
  const lines = bad.flatMap((c) => [`Card ${c.id} (${c.file}):`, ...c.problems.map((p) => `  ✗ ${p}`)]);
  const summary =
    bad.length === 0
      ? `${cards.length} card${cards.length === 1 ? "" : "s"} checked. No problems found.`
      : `${bad.length} of ${cards.length} card${cards.length === 1 ? "" : "s"} ${bad.length === 1 ? "has" : "have"} problems.`;
  return { code: bad.length > 0 ? 1 : 0, output: [...lines, ...(lines.length > 0 ? [""] : []), summary].join("\n") };
}

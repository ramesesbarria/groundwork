// `groundwork check [card-id...] [--base <ref>] [--task <id>]`: check cards against the workflow's
// rules. Exits 1 on any problem, so /gw-approve, a guard or CI can rely on it. The card rules live in
// core/guards/lib/cards.mjs, shared with the commit gate. Context checks are scoped to the task being
// validated and live here, so the commit gate and the solo workflow stay unchanged.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { locateCore } from "./init.js";
import { readProjectConfig } from "./config.js";
import { checkTaskContext, contextTasks, resolveRef } from "./context.js";
import type { Io, RunResult } from "./index.js";

export interface CardCheck {
  file: string;
  id: string;
  problems: string[];
  openHumanChecks: string[];
}

interface CardRules {
  checkCards(projectDir: string, approvalMode: string, options?: { cardSize?: boolean; integration?: string }): CardCheck[];
  checkCard(md: string, options: { projectDir: string; approvalMode?: string; integration?: string; cardSize?: boolean }): string[];
  humanChecks(md: string): { text: string; checked: boolean }[];
  estimateCardTokens(md: string): number;
  CARD_TOKEN_LIMIT: number;
  STATUSES: string[];
  TRANSITIONS: [string, string][];
}

export const cardRules = async (): Promise<CardRules> =>
  (await import(pathToFileURL(join(locateCore(), "guards", "lib", "cards.mjs")).href)) as CardRules;

export async function checkProject(cwd: string, options?: { cardSize?: boolean }): Promise<CardCheck[]> {
  const config = readProjectConfig(join(cwd, ".groundwork"));
  const mode = String(config.approvalMode ?? "per-card");
  const integration = String(config.integration ?? "local");
  return (await cardRules()).checkCards(cwd, mode, { ...options, integration });
}

function parse(args: string[]): { wanted: string[]; base?: string; task?: string; error?: string } {
  const wanted: string[] = [];
  let base: string | undefined;
  let task: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--base") {
      base = args[++i];
      if (!base) return { wanted, error: "--base needs a revision, e.g. --base origin/main" };
    } else if (arg === "--task") {
      task = args[++i];
      if (!task) return { wanted, error: "--task needs a card id" };
    } else if (arg.startsWith("-")) {
      return { wanted, error: `Unknown option: ${arg}` };
    } else {
      wanted.push(arg);
    }
  }
  return { wanted, base, task };
}

export async function check(args: string[], io: Pick<Io, "cwd">): Promise<RunResult> {
  if (!existsSync(join(io.cwd, ".groundwork"))) {
    return { code: 1, output: "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first." };
  }
  const { wanted, base, task, error } = parse(args);
  if (error) return { code: 1, output: error };

  const all = await checkProject(io.cwd, { cardSize: false });
  const ids = new Set(wanted);
  if (task) ids.add(task);
  const missing = [...ids].filter((id) => !all.some((c) => c.id === id));
  if (missing.length > 0) return { code: 1, output: `No card with id ${missing.join(", ")} in .groundwork/cards/.` };
  const cards = ids.size > 0 ? all.filter((c) => ids.has(c.id)) : all;

  // The target is explicit for CI. For local use, prefer origin/main when it exists.
  let targetRef = base;
  if (!targetRef) {
    try {
      resolveRef(io.cwd, "origin/main");
      targetRef = "origin/main";
    } catch {
      targetRef = "main";
    }
  }
  let targetSha: string | undefined;
  try {
    targetSha = resolveRef(io.cwd, targetRef);
  } catch {
    if (base) return { code: 1, output: `Can't resolve --base ${base}. Fetch it first.` };
  }

  const contextIds = contextTasks(io.cwd, targetSha, wanted, task);
  const contextReports = contextIds
    .map((id) => checkTaskContext(io.cwd, id, targetRef))
    .filter((report): report is NonNullable<typeof report> => report !== undefined);

  const checked = new Set<string>([...cards.map((c) => c.id), ...contextReports.map((r) => r.task)]);
  const bad = new Set<string>([
    ...cards.filter((c) => c.problems.length > 0).map((c) => c.id),
    ...contextReports.filter((r) => r.problems.length > 0).map((r) => r.task),
  ]);

  if (checked.size === 0) return { code: 0, output: "No cards yet." };

  const lines = cards.flatMap((c) => {
    const rows: string[] = [];
    if (c.problems.length > 0 || c.openHumanChecks.length > 0) rows.push(`Card ${c.id} (${c.file}):`);
    for (const problem of c.problems) rows.push(`  ✗ ${problem}`);
    if (c.openHumanChecks.length > 0) {
      const n = c.openHumanChecks.length;
      rows.push(`  ${n} open human check${n === 1 ? "" : "s"} (confirm or waive at approval):`);
      for (const check of c.openHumanChecks) rows.push(`  ○ ${check}`);
    }
    return rows;
  });

  for (const report of contextReports) {
    lines.push(`Task ${report.task} context (${report.targetRef}):`);
    for (const line of report.lines) lines.push(`  ${line}`);
    for (const problem of report.problems) lines.push(`  ✗ ${problem}`);
  }

  const summary =
    bad.size === 0
      ? `${checked.size} card${checked.size === 1 ? "" : "s"} checked. No problems found.`
      : `${bad.size} of ${checked.size} card${checked.size === 1 ? "" : "s"} ${bad.size === 1 ? "has" : "have"} problems.`;
  return { code: bad.size > 0 ? 1 : 0, output: [...lines, ...(lines.length > 0 ? [""] : []), summary].join("\n") };
}

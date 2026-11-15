// Project memory lives in core/lib/*.mjs, plain JavaScript that is copied into every project so the
// hooks can run it without the CLI. The CLI loads the same modules from its own core: one parser and
// one serializer, wherever a memory file is read or written.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { locateCore } from "./init.js";

export interface HandoffSection {
  name: string;
  body: string;
}

export interface Handoff {
  meta: Record<string, string>;
  body: string;
  preamble: string;
  sections: HandoffSection[];
  fields: Record<string, string>;
  format: "sections" | "bullets" | "prose" | "empty";
}

export interface HandoffView {
  now: string;
  next: string;
  blockers: string;
  failingChecks: string;
  workers: string;
  notes: string;
}

export interface Decision {
  id: string;
  title: string;
  status: string;
  date: string;
  file: string;
}

export interface Lesson {
  id: string;
  title: string;
  level: string;
}

export type Budgets = Record<"brief" | "handoff" | "map" | "decisions" | "lessons" | "journal", number>;

export interface MemoryLib {
  SECTIONS: string[];
  DECISIONS_INDEX: string;
  estimateTokens(text: string): number;
  parseHandoff(text: string): Handoff;
  handoffView(handoff: Handoff): HandoffView;
  validateHandoff(handoff: Handoff): string[];
  extraSections(handoff: Handoff): HandoffSection[];
  readConfig(groundwork: string): Record<string, unknown>;
  budgetsOf(config: Record<string, unknown>): Budgets;
  staleDaysOf(config: Record<string, unknown>): number;
  flowEnabled(groundwork: string): boolean;
  readDecisions(groundwork: string): { live: Decision[]; archived: Decision[] };
  writeDecisionsIndex(groundwork: string): boolean;
  decisionsIndexInSync(groundwork: string): boolean;
  nextDecisionId(groundwork: string): string;
  slug(text: string): string;
  readLessons(groundwork: string): Lesson[];
  nextLessonId(groundwork: string): string;
  parseJournal(text: string): { head: string; entries: string[] };
  missingMapPaths(project: string, mapText: string): string[];
  isTemplate(text: string): boolean;
  mapFilled(text: string): boolean;
  writeAtomic(path: string, content: string): void;
  acquireLock(groundwork: string): (() => void) | undefined;
}

export interface Freshness {
  verdict: "fresh" | "behind" | "diverged" | "stale" | "unstamped";
  summary: string;
  notes: string[];
  commitsSince: number;
  commits: { sha: string; subject: string }[];
  changedFiles: string[];
  touchesNext: string[];
  changedMemory: string[];
  stampedHead?: string;
  stampedBranch?: string;
  updated?: string;
  head?: string;
  branch?: string;
  dirty?: number;
}

export interface FreshnessLib {
  assess(project: string, handoff: Handoff, options?: { now?: number; staleAfterDays?: number; groundwork?: string }): Freshness;
  describe(result: Freshness, meta?: Record<string, string>): string[];
}

export interface CheckpointOptions {
  sections?: Record<string, string | undefined>;
  auto?: boolean;
  note?: string;
  tool?: string;
  model?: string;
  session?: string;
  worker?: string;
  root?: boolean;
  now?: Date;
}

export interface CheckpointResult {
  wrote: boolean;
  created?: boolean;
  journal: boolean;
  warnings: string[];
  path?: string;
  worker?: string;
  head?: string;
  branch?: string;
  updated?: string;
  reason?: string;
  proseChanged?: boolean;
  moved?: boolean;
}

export interface WorkerState {
  id: string;
  state: "active" | "done";
  updated?: string;
  branch?: string;
  head?: string;
  tool?: string;
  now: string;
  next: string;
  path: string;
}

export interface CheckpointLib {
  PRISTINE_NOW: string;
  checkpoint(project: string, options?: CheckpointOptions): CheckpointResult;
  resolveHandoff(project: string, options?: { worker?: string; root?: boolean }): { path: string; worker?: string };
  isPristine(handoff: Handoff): boolean;
  workerStart(project: string, id: string, options?: { goal?: string; branch?: string }): void;
  workerDone(project: string, id: string, options?: { outcome?: string }): void;
  listWorkers(project: string): WorkerState[];
}

export interface BriefLib {
  brief(project: string, options?: { budget?: number; worker?: string; root?: boolean; now?: number }): Promise<{ text: string; json?: Record<string, unknown> }>;
}

export interface CompactLib {
  compact(project: string, options?: { dryRun?: boolean; now?: Date }): string[];
}

const load = <T>(name: string) => import(pathToFileURL(join(locateCore(), "lib", name)).href) as Promise<T>;

export const memoryLib = () => load<MemoryLib>("memory.mjs");
export const freshnessLib = () => load<FreshnessLib>("freshness.mjs");
export const checkpointLib = () => load<CheckpointLib>("checkpoint.mjs");
export const briefLib = () => load<BriefLib>("brief.mjs");
export const compactLib = () => load<CompactLib>("compact.mjs");
export const gitLib = () => load<{ cacheForThisProcess(): void }>("git.mjs");

export const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

// `--name value` options and bare flags. Anything else is a positional argument or an error.
export function parseOptions(
  args: string[],
  spec: { values?: string[]; flags?: string[] },
): { values: Record<string, string>; flags: Set<string>; rest: string[]; error?: string } {
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      rest.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split(/=(.*)/s, 2);
    if (spec.flags?.includes(name)) flags.add(name);
    else if (spec.values?.includes(name)) {
      const value = inline ?? args[++i];
      if (value === undefined) return { values, flags, rest, error: `--${name} needs a value.` };
      values[name] = value;
    } else return { values, flags, rest, error: `Unknown option: --${name}` };
  }
  return { values, flags, rest };
}

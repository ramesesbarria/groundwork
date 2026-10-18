// `groundwork reassess <task> --target <ref> [--dep <ref>]...`: record the context snapshots a
// developer or agent has just inspected. It does not run checks or judge the change; it only records
// the local content and the upstream version that was acknowledged. `check` stays read-only.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  contextFingerprint,
  dependencyPath,
  mergeBase,
  readContext,
  resolveRef,
  short,
  writeContext,
  type ContextDep,
} from "./context.js";
import type { Io, RunResult } from "./index.js";

const NOT_INSTALLED = "Groundwork isn't installed here. Run `npx groundwork-ai init` in your project's folder first.";

function parse(args: string[]): { task?: string; target?: string; deps: string[]; error?: string } {
  const deps: string[] = [];
  let task: string | undefined;
  let target: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--target") {
      target = args[++i];
      if (!target) return { deps, error: "--target needs a revision, e.g. --target origin/main" };
    } else if (arg === "--dep") {
      const dep = args[++i];
      if (!dep) return { deps, error: "--dep needs a reference, e.g. --dep decision:0001" };
      deps.push(dep);
    } else if (arg.startsWith("-")) {
      return { deps, error: `Unknown option: ${arg}` };
    } else if (task === undefined) {
      task = arg;
    } else {
      return { deps, error: `Unexpected argument: ${arg}` };
    }
  }
  return { task, target, deps };
}

function localHash(abs: string): string | null {
  if (!existsSync(abs)) return null;
  return contextFingerprint(readFileSync(abs, "utf8"));
}

function targetHash(project: string, sha: string, rel: string): string | null {
  try {
    return contextFingerprint(execFileSync("git", ["show", `${sha}:${rel}`], { cwd: project, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return null;
  }
}

export function reassess(args: string[], io: Pick<Io, "cwd">): RunResult {
  const project = io.cwd;
  if (!existsSync(join(project, ".groundwork"))) return { code: 1, output: NOT_INSTALLED };
  const { task, target, deps: requested, error } = parse(args);
  if (error) return { code: 1, output: error };
  if (!task) return { code: 1, output: "Name the task, e.g. `groundwork reassess 1.2 --target origin/main`." };

  const targetRef = target ?? "origin/main";
  let targetSha: string;
  try {
    targetSha = resolveRef(project, targetRef);
  } catch {
    return { code: 1, output: `Can't resolve --target ${targetRef}. Fetch it first.` };
  }

  let context;
  try {
    context = readContext(project, task);
  } catch (e) {
    return { code: 1, output: (e as Error).message };
  }

  if (!context && requested.length === 0) {
    return { code: 1, output: "No context recorded yet. Name at least one dependency, e.g. --dep decision:0001." };
  }

  let base: string;
  if (context) {
    base = context.base;
  } else {
    try {
      base = mergeBase(project, targetSha);
    } catch {
      return { code: 1, output: `Can't work out the task's base commit from ${targetRef}.` };
    }
  }

  const byRef = new Map<string, ContextDep>((context?.deps ?? []).map((dep) => [dep.ref, dep]));
  const refs = requested.length > 0 ? requested : [...byRef.keys()];
  const lines: string[] = [];
  for (const ref of refs) {
    const existing = byRef.get(ref);
    let resolved: { rel: string; abs: string };
    try {
      resolved = dependencyPath(project, ref, existing?.path);
    } catch (e) {
      return { code: 1, output: `${(e as Error).message}. Reassessment was not recorded.` };
    }
    const local = localHash(resolved.abs);
    const upstream = targetHash(project, targetSha, resolved.rel);
    if (local === null && upstream === null && !existing) {
      return { code: 1, output: `${ref} doesn't exist locally or at ${targetRef}. Reassessment was not recorded.` };
    }
    byRef.set(ref, { ref, path: resolved.rel, recorded: local, acknowledged: upstream });
    lines.push(`recorded ${ref}: local=${short(local)} acknowledged=${short(upstream)} target=${targetRef}@${targetSha.slice(0, 12)}`);
  }

  try {
    writeContext(project, task, { version: 1, base, deps: [...byRef.values()] });
  } catch (e) {
    return { code: 1, output: `${(e as Error).message}. Reassessment was not recorded.` };
  }
  return {
    code: 0,
    output: [
      `Reassessed task ${task} against ${targetRef} @ ${targetSha}.`,
      ...lines,
      "",
      "Recording an acknowledgment does not prove the change was understood; the review still judges that.",
    ].join("\n"),
  };
}

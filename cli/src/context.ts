import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface ContextDep {
  ref: string;
  path?: string;
  recorded?: string | null;
  acknowledged?: string | null;
}

export interface ContextFile {
  version: 1;
  base: string;
  deps: ContextDep[];
}

export interface ContextCheckLine {
  ref: string;
  base?: string | null;
  local?: string | null;
  target?: string | null;
  recorded?: string | null;
  acknowledged?: string | null;
  verdict: "ok" | "reassess" | "fail";
  reason: string;
}

export interface ContextReport {
  task: string;
  targetRef: string;
  targetSha: string;
  base: string;
  freshness: "ok" | "behind target";
  lines: string[];
  problems: string[];
}

const HASH = /^[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{7,40}$/;
const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Context snapshots use the same text normalization everywhere: UTF-8, no BOM, LF. This is deliberately
// stricter than raw bytes so Windows checkouts and editor BOMs don't look like content changes.
export const contextFingerprint = (text: string) =>
  createHash("sha256").update(text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")).digest("hex");

const git = (cwd: string, args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

export const short = (hash: string | null | undefined) => (hash ? hash.slice(0, 12) : "-");

export function projectRoot(cwd: string): string | undefined {
  try {
    return git(cwd, ["rev-parse", "--show-toplevel"]);
  } catch {
    return undefined;
  }
}

export function resolveRef(cwd: string, ref: string): string {
  return git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]);
}

export function mergeBase(cwd: string, sha: string): string {
  return git(cwd, ["merge-base", "HEAD", sha]);
}

export function onMainAncestor(cwd: string, sha: string): boolean {
  try {
    git(cwd, ["merge-base", "--is-ancestor", sha, "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

export function currentTask(cwd: string): string | undefined {
  let branch = "";
  try {
    branch = git(cwd, ["branch", "--show-current"]);
  } catch {
    // detached checkout, e.g. CI
  }
  if (!branch) branch = process.env.GITHUB_HEAD_REF ?? "";
  const match = branch.match(/^gw\/(.+)$/);
  return match && TASK_ID.test(match[1]) ? match[1] : undefined;
}

// Per-task handoff when the branch names one and the file exists; the root file otherwise.
export function handoffPath(project: string): string {
  const task = currentTask(project);
  if (task) {
    const path = join(project, ".groundwork", "work", task, "HANDOFF.md");
    if (existsSync(path)) return path;
  }
  return join(project, ".groundwork", "HANDOFF.md");
}

export function changedTaskIds(cwd: string, targetSha: string): string[] {
  try {
    const names = git(cwd, ["diff", "--name-only", `${targetSha}...HEAD`, "--", ".groundwork/cards"]).split(/\r?\n/).filter(Boolean);
    return [...new Set(names.map((name) => {
      const md = existsSync(join(cwd, name)) ? readFileSync(join(cwd, name), "utf8") : "";
      const front = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
      const id = front.match(/^id:\s*(.+)$/m)?.[1]?.trim();
      return id ?? name.split("/").pop()?.replace(/\.md$/, "").replace(/^\d+\.\d+-/, "") ?? "";
    }).filter(Boolean))];
  } catch {
    return [];
  }
}

export function contextPath(project: string, task: string): string {
  if (!TASK_ID.test(task)) throw new Error(`Task id ${JSON.stringify(task)} isn't safe; use letters, digits, dots, dashes or underscores.`);
  return join(project, ".groundwork", "work", task, "context.json");
}

function validHash(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && HASH.test(value));
}

function validDep(value: unknown): value is ContextDep {
  if (!value || typeof value !== "object") return false;
  const dep = value as ContextDep;
  return typeof dep.ref === "string" && dep.ref.length > 0 &&
    (dep.path === undefined || typeof dep.path === "string") &&
    (dep.recorded === undefined || validHash(dep.recorded)) &&
    (dep.acknowledged === undefined || validHash(dep.acknowledged));
}

export function readContext(project: string, task: string): ContextFile | undefined {
  const path = contextPath(project, task);
  if (!existsSync(path)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} isn't valid JSON (${(error as Error).message}).`);
  }
  if (!parsed || typeof parsed !== "object") throw new Error(`${path} isn't a JSON object.`);
  const file = parsed as ContextFile;
  if (file.version !== 1) throw new Error(`${path} has version ${String(file.version)}; expected 1.`);
  if (typeof file.base !== "string" || !SHA.test(file.base)) throw new Error(`${path} has no valid base commit.`);
  if (!Array.isArray(file.deps) || !file.deps.every(validDep)) throw new Error(`${path} has invalid dependency records.`);
  return file;
}

export function writeContext(project: string, task: string, file: ContextFile): void {
  const path = contextPath(project, task);
  const workRoot = resolve(project, ".groundwork", "work") + sep;
  if (!resolve(path).startsWith(workRoot)) throw new Error(`Refusing to write outside ${workRoot}.`);
  mkdirSync(dirname(path), { recursive: true });
  const deps = [...file.deps].sort((a, b) => a.ref.localeCompare(b.ref));
  writeFileSync(path, JSON.stringify({ version: 1, base: file.base, deps }, null, 2) + "\n");
}

export function dependencyPath(project: string, ref: string, stored?: string): { rel: string; abs: string } {
  if (stored) {
    const rel = stored.split("\\").join("/");
    if (isAbsolute(stored) || rel.startsWith("../") || rel.includes("/../") || rel === "..") {
      throw new Error(`${ref} has an unsafe stored path: ${stored}`);
    }
    return { rel, abs: join(project, rel) };
  }
  if (ref.startsWith("decision:")) {
    const id = ref.slice("decision:".length).trim();
    const dir = join(project, ".groundwork", "decisions");
    if (!existsSync(dir)) throw new Error(`no .groundwork/decisions folder for ${ref}`);
    const name = readdirSync(dir)
      .filter((entry) => entry.endsWith(".md") && (entry === `${id}.md` || entry.startsWith(`${id}-`)))
      .sort()[0];
    if (!name) throw new Error(`${ref} doesn't match a file in .groundwork/decisions/`);
    return { rel: `.groundwork/decisions/${name}`, abs: join(dir, name) };
  }
  if (ref.startsWith("spec:")) {
    const path = ref.slice("spec:".length).trim();
    const root = join(project, path);
    const groundwork = join(project, ".groundwork", path);
    const abs = existsSync(root) ? root : existsSync(groundwork) ? groundwork : undefined;
    if (!abs) throw new Error(`${ref} doesn't match a file in the repo or .groundwork/`);
    const rel = relative(project, abs).split(sep).join("/");
    if (isAbsolute(rel) || rel.startsWith("../") || rel === "..") throw new Error(`${ref} resolves outside the project.`);
    return { rel, abs };
  }
  throw new Error(`${ref} isn't a supported context ref; use decision:<id> or spec:<path>`);
}

function hashAt(project: string, sha: string, rel: string): string | null {
  try {
    const text = execFileSync("git", ["show", `${sha}:${rel}`], {
      cwd: project,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return contextFingerprint(text);
  } catch {
    return null;
  }
}

function hashLocal(abs: string): string | null {
  if (!existsSync(abs)) return null;
  if (!statSync(abs).isFile()) return null;
  return contextFingerprint(readFileSync(abs, "utf8"));
}

export interface VerdictInput {
  base?: string | null;
  local?: string | null;
  target?: string | null;
  recorded?: string | null;
  acknowledged?: string | null;
}

export function contextVerdict(input: VerdictInput): { status: "ok" | "reassess" | "fail"; reason: string } {
  const { base, local, target, recorded, acknowledged } = input;
  if (recorded === undefined) return { status: "fail", reason: "recorded hash is missing" };
  if (base === undefined) return { status: "fail", reason: "the dependency isn't available at the task's base commit" };
  if (local === undefined) return { status: "fail", reason: "the dependency state isn't available locally" };
  if (target === undefined) return { status: "fail", reason: "the dependency state isn't available at the target revision" };

  // An upstream change since the last acknowledgment always needs a fresh look, even if it
  // reverts to the original baseline.
  if (target !== base) {
    if (target !== acknowledged) {
      return {
        status: "reassess",
        reason: local === base ? "incoming upstream change" : "upstream changed since the last acknowledgment",
      };
    }
    if (local === target) {
      return local === recorded
        ? { status: "ok", reason: "integrated and recorded" }
        : { status: "reassess", reason: "recorded snapshot is stale" };
    }
    if (local === recorded) return { status: "ok", reason: "deliberate local resolution after acknowledging upstream" };
    return { status: "reassess", reason: "local content changed without reassessment" };
  }

  if (acknowledged !== undefined && acknowledged !== target) {
    return { status: "reassess", reason: "upstream changed since the last acknowledgment" };
  }
  if (local === recorded) return { status: "ok", reason: "local content is recorded" };
  return { status: "reassess", reason: "local content changed without reassessment" };
}

export function checkTaskContext(project: string, task: string, targetRef: string): ContextReport | undefined {
  let context: ContextFile | undefined;
  try {
    context = readContext(project, task);
  } catch (error) {
    return {
      task, targetRef, targetSha: "", base: "", freshness: "ok",
      lines: [`task ${task}: invalid context metadata`],
      problems: [`Card ${task}: ${(error as Error).message}`],
    };
  }
  if (!context) return undefined;

  let targetSha: string;
  try {
    targetSha = resolveRef(project, targetRef);
  } catch {
    return {
      task, targetRef, targetSha: "", base: context.base, freshness: "ok",
      lines: [`task ${task}: target ${targetRef} can't be resolved`],
      problems: [`Card ${task}: can't resolve target ${targetRef}; fetch it first.`],
    };
  }

  const lines = [`target: ${targetRef} @ ${targetSha}`, `base: ${context.base} (task ${task})`];
  const problems: string[] = [];
  let baseSha = "";
  try {
    baseSha = resolveRef(project, context.base);
  } catch {
    problems.push(`Card ${task}: base commit ${context.base} isn't available.`);
  }
  const freshness = onMainAncestor(project, targetSha) ? "ok" : "behind target";
  lines.push(`freshness: ${freshness}`);
  if (freshness === "behind target") {
    problems.push(`Card ${task}: branch is behind ${targetRef} @ ${targetSha}; integrate it before review.`);
  }

  for (const dep of context.deps) {
    let rel = "";
    let abs = "";
    try {
      ({ rel, abs } = dependencyPath(project, dep.ref, dep.path));
    } catch (error) {
      const reason = (error as Error).message;
      lines.push(`context ${dep.ref}: ${reason}`);
      problems.push(`Card ${task}: context ${dep.ref}: ${reason}`);
      continue;
    }
    const base = baseSha ? hashAt(project, baseSha, rel) : undefined;
    const local = hashLocal(abs);
    const target = hashAt(project, targetSha, rel);
    const verdict = contextVerdict({
      base, local, target, recorded: dep.recorded, acknowledged: dep.acknowledged,
    });
    lines.push(
      `context ${dep.ref}: recorded=${short(dep.recorded)} base=${short(base)} local=${short(local)} ` +
      `target=${short(target)} ack=${short(dep.acknowledged)} verdict=${verdict.status}` +
      `${verdict.status === "ok" ? "" : ` (${verdict.reason})`}`,
    );
    if (verdict.status !== "ok") problems.push(`Card ${task}: context ${dep.ref}: ${verdict.reason}.`);
  }
  return { task, targetRef, targetSha, base: context.base, freshness, lines, problems };
}

export function contextTasks(project: string, targetSha: string | undefined, wanted: string[], task?: string): string[] {
  const ids = new Set<string>();
  if (task) ids.add(task);
  for (const id of wanted) ids.add(id);
  if (!task && wanted.length === 0) {
    const current = currentTask(project);
    if (current) ids.add(current);
    if (targetSha) for (const id of changedTaskIds(project, targetSha)) ids.add(id);
  }
  return [...ids];
}

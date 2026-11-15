// The few git questions project memory asks. Every call is bounded and answers undefined when git
// isn't there, the folder isn't a repository, or the command fails: memory works without git.
//
// Starting git is the slow part (well over 100 ms each on Windows), and hooks run on every session
// start and stop, so the questions are asked in as few commands as possible: one `git status` gives
// the commit, the branch and the uncommitted files.

import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const TIMEOUT_MS = 4000;

// A hook or a CLI run is one short process in which the repository doesn't change under it, so the
// same question needn't be asked twice. Off by default: a long-lived process must not remember.
let cache;
export function cacheForThisProcess() {
  cache ??= new Map();
}

function ask(cwd, args, run) {
  if (!cache) return run();
  const key = `${cwd}\u0000${args.join("\u0000")}`;
  if (!cache.has(key)) cache.set(key, run());
  return cache.get(key);
}

export function git(cwd, args) {
  return ask(cwd, args, () => {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: TIMEOUT_MS, windowsHide: true }).replace(/\s+$/, "");
    } catch {
      return undefined;
    }
  });
}

const ok = (cwd, args) =>
  ask(cwd, ["?", ...args], () => {
    try {
      execFileSync("git", args, { cwd, stdio: "ignore", timeout: TIMEOUT_MS, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  });

// Where an entry's path starts in `git status --porcelain=v2`, by its first field.
const PATH_FIELD = { 1: 8, 2: 9, u: 10 };

// { repo, head, branch, dirty } in one command. `dirty` lists changed and untracked files, not
// counting Groundwork's own memory (a checkpoint always touches it). Outside a repository: { repo: false }.
export function snapshot(cwd) {
  const out = git(cwd, ["status", "--porcelain=v2", "--branch", "--untracked-files=normal"]);
  if (out === undefined) return { repo: false, head: undefined, branch: undefined, dirty: undefined };
  let head;
  let branch;
  const dirty = [];
  for (const line of out.split("\n")) {
    if (line.startsWith("# branch.oid ")) head = /^[0-9a-f]{40,64}$/.test(line.slice(13)) ? line.slice(13) : undefined;
    else if (line.startsWith("# branch.head ")) branch = line.slice(14) === "(detached)" ? undefined : line.slice(14);
    else if (line.startsWith("? ")) dirty.push(line.slice(2));
    else if (PATH_FIELD[line[0]]) dirty.push(line.split(" ").slice(PATH_FIELD[line[0]]).join(" ").split("\t")[0]);
  }
  return {
    repo: true,
    head,
    // In CI the checkout is detached, and the branch is in the environment.
    branch: branch ?? (process.env.GITHUB_HEAD_REF || undefined),
    dirty: dirty.map((path) => path.replace(/^"|"$/g, "")).filter((path) => !path.startsWith(".groundwork/")),
  };
}

export const head = (cwd) => snapshot(cwd).head;
export const branch = (cwd) => snapshot(cwd).branch;
export const isRepo = (cwd) => snapshot(cwd).repo;
export const dirtyFiles = (cwd) => snapshot(cwd).dirty;

export const commitExists = (cwd, sha) => ok(cwd, ["cat-file", "-e", `${sha}^{commit}`]);
export const isAncestor = (cwd, older, newer = "HEAD") => ok(cwd, ["merge-base", "--is-ancestor", older, newer]);
export const mergeBase = (cwd, a, b = "HEAD") => git(cwd, ["merge-base", a, b]) || undefined;

// Commits that only touch Groundwork's own memory (saving a handoff, say) don't count as project changes.
const CODE = ["--", ".", ":(exclude).groundwork"];

export function countCommits(cwd, range) {
  const n = Number.parseInt(git(cwd, ["rev-list", "--count", range, ...CODE]) ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

// Newest first: [{ sha, subject }].
export function commits(cwd, range, limit = 20) {
  const out = git(cwd, ["log", `--max-count=${limit}`, "--format=%h%x09%s", range, ...CODE]);
  if (!out) return [];
  return out.split("\n").map((line) => {
    const [sha, ...subject] = line.split("\t");
    return { sha, subject: subject.join("\t") };
  });
}

// The commits in a range and how many there are in all, counting only when the list was cut short.
export function commitsIn(cwd, range, limit = 20) {
  const list = commits(cwd, range, limit);
  return { list, count: list.length < limit ? list.length : countCommits(cwd, range) };
}

// Files that differ between two commits, without Groundwork's own memory files.
export function changedFiles(cwd, from, to = "HEAD") {
  const out = git(cwd, ["diff", "--name-only", from, to]);
  if (!out) return [];
  return out.split("\n").filter((path) => path && !path.startsWith(".groundwork/"));
}

// A linked worktree (`git worktree add`) has its own git folder apart from the shared one. Returns
// its folder name, or undefined in the main checkout.
export function linkedWorktree(cwd) {
  const out = git(cwd, ["rev-parse", "--path-format=absolute", "--absolute-git-dir", "--git-common-dir", "--show-toplevel"]);
  const [own, shared, top] = (out ?? "").split("\n");
  if (!own || !shared) return undefined;
  const norm = (path) => path.replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();
  if (norm(own) === norm(shared)) return undefined;
  return basename(top || cwd);
}

export const short = (sha) => (sha ? String(sha).slice(0, 7) : "");

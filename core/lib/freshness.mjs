// How far a handoff can be trusted: it is compared with the repository every time it is loaded.
//
//   fresh      stamped at the current commit (or nothing has been committed since), and recent
//   behind     commits landed after its stamp; they are listed, with the files they changed
//   diverged   its commit isn't in this branch's history (rebase, reset, another branch), or is gone
//   stale      older than `staleAfterDays`, whatever git says
//   unstamped  never checkpointed, so there is nothing to compare: treat it as unverified
//
// Besides the verdict there are notes: the branch changed, memory files it was written against
// changed (their fingerprints are in its stamp), or its next step names files that changed since.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as git from "./git.mjs";
import { handoffView, readText, shortPrint, withoutComments } from "./memory.mjs";

// Fingerprints of the memory a handoff was written against: map, decisions and lessons.
export function memoryDeps(groundwork) {
  const decisionsDir = join(groundwork, "decisions");
  const decisions = existsSync(decisionsDir)
    ? readdirSync(decisionsDir).filter((name) => name.endsWith(".md")).sort().map((name) => `${name}\n${readText(join(decisionsDir, name))}`).join("\n")
    : "";
  return { map: shortPrint(readText(join(groundwork, "MAP.md"))), decisions: shortPrint(decisions), lessons: shortPrint(readText(join(groundwork, "LESSONS.md"))) };
}

export const renderDeps = (deps) => Object.entries(deps).map(([name, hash]) => `${name}=${hash}`).join(" ");
export const parseDeps = (text) => Object.fromEntries(String(text ?? "").split(/\s+/).filter((part) => part.includes("=")).map((part) => part.split("=")));

// Paths a piece of prose names: `backticked` or bare tokens with a slash or a file extension.
export function pathsIn(text) {
  const found = new Set();
  for (const m of withoutComments(text).matchAll(/`([^`\s]+)`|(?:^|[\s(])((?:[\w.@-]+\/)+[\w.@-]+|[\w@-]+\.[a-z]{2,5})(?=[\s),.:;]|$)/gm)) {
    const path = (m[1] ?? m[2]).replace(/^\.\//, "").replace(/[:,.]$/, "");
    if (/[/\\]|\.\w{1,5}$/.test(path) && !/^https?:|^\.groundwork\//.test(path)) found.add(path.replace(/\\/g, "/"));
  }
  return [...found];
}

const days = (ms) => Math.floor(ms / 86_400_000);

export function age(updated, now = Date.now()) {
  const at = Date.parse(updated ?? "");
  if (Number.isNaN(at)) return undefined;
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 48) return `${Math.floor(minutes / 60)} h ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

// Pure where it can be: `handoff` is a parsed handoff, the repository is read through git.mjs.
export function assess(project, handoff, { now = Date.now(), staleAfterDays = 14, groundwork = join(project, ".groundwork") } = {}) {
  const meta = handoff.meta ?? {};
  const view = handoffView(handoff);
  const result = {
    verdict: "fresh",
    summary: "",
    notes: [],
    stampedHead: meta.head,
    stampedBranch: meta.branch,
    updated: meta.updated,
    head: undefined,
    branch: undefined,
    commitsSince: 0,
    commits: [],
    changedFiles: [],
    touchesNext: [],
    changedMemory: [],
    dirty: undefined,
  };
  const now_ = git.snapshot(project);
  const repo = now_.repo;
  if (repo) {
    result.head = now_.head;
    result.branch = now_.branch;
    result.dirty = now_.dirty?.length;
  }
  const at = Date.parse(meta.updated ?? "");
  const old = !Number.isNaN(at) && days(now - at) >= staleAfterDays;

  if (handoff.format === "empty") {
    result.verdict = "unstamped";
    result.summary = "no handoff has been written yet";
    return result;
  }
  if (!meta.updated && !meta.head) {
    result.verdict = "unstamped";
    result.summary = "it was never checkpointed, so nothing says when or at which commit it was written; verify it against the code";
    return result;
  }

  if (repo && meta.head && result.head && meta.head === result.head) {
    // Written at this very commit: nothing to ask git.
  } else if (repo && meta.head && result.head) {
    // The usual case is an ancestor, so that is asked first; only a "no" needs a second question.
    const ancestor = git.isAncestor(project, meta.head);
    if (!ancestor && !git.commitExists(project, meta.head)) {
      result.verdict = "diverged";
      result.summary = `its commit ${git.short(meta.head)} isn't in this repository any more (rebased, reset or never fetched)`;
    } else if (!ancestor) {
      const base = git.mergeBase(project, meta.head);
      const ahead = base ? git.countCommits(project, `${base}..HEAD`) : 0;
      const theirs = base ? git.countCommits(project, `${base}..${meta.head}`) : 0;
      result.verdict = "diverged";
      result.summary =
        `its commit ${git.short(meta.head)} isn't in this branch's history` +
        (base ? `: ${theirs} commit${theirs === 1 ? "" : "s"} it knew aren't here, and ${ahead} here came after the split` : "");
      if (base) {
        result.commitsSince = ahead;
        result.commits = git.commits(project, `${base}..HEAD`, 8);
        result.changedFiles = git.changedFiles(project, base);
      }
    } else {
      const { list, count } = git.commitsIn(project, `${meta.head}..HEAD`, 8);
      if (count > 0) {
        result.verdict = "behind";
        result.commitsSince = count;
        result.commits = list;
        result.changedFiles = git.changedFiles(project, meta.head);
        result.summary = `${count} commit${count === 1 ? "" : "s"} landed after it was written, changing ${result.changedFiles.length} file${result.changedFiles.length === 1 ? "" : "s"}`;
      }
    }
  } else if (repo && meta.head && !result.head) {
    result.verdict = "diverged";
    result.summary = `it was written at commit ${git.short(meta.head)}, but this repository has no commits`;
  }

  if (old && result.verdict !== "diverged") {
    const detail = result.verdict === "behind" ? `; ${result.summary}` : "";
    result.verdict = "stale";
    result.summary = `it is ${days(now - at)} days old (limit ${staleAfterDays})${detail}`;
  }
  if (result.verdict === "fresh") result.summary = repo ? "written at the current commit" : "this folder isn't a git repository, so only its age is checked";

  if (meta.branch && result.branch && meta.branch !== result.branch) {
    result.notes.push(`It was written on branch ${meta.branch}; you are on ${result.branch}.`);
  }
  if (result.changedFiles.length > 0) {
    const named = pathsIn(`${view.next}\n${view.now}`);
    result.touchesNext = result.changedFiles.filter((file) => named.some((path) => file === path || file.endsWith(`/${path}`) || file.startsWith(`${path.replace(/\/$/, "")}/`)));
    if (result.touchesNext.length > 0) result.notes.push(`Files its Now/Next sections name have changed since: ${result.touchesNext.slice(0, 6).join(", ")}.`);
  }
  if (meta.deps) {
    const then = parseDeps(meta.deps);
    const current = memoryDeps(groundwork);
    result.changedMemory = Object.keys(current).filter((name) => then[name] !== undefined && then[name] !== current[name]);
    if (result.changedMemory.length > 0) result.notes.push(`Changed since it was written: ${result.changedMemory.join(", ")}. Reread ${result.changedMemory.length === 1 ? "it" : "them"} before relying on the handoff.`);
  }
  if (result.dirty && result.verdict === "fresh") result.notes.push(`${result.dirty} uncommitted file${result.dirty === 1 ? "" : "s"} in the working tree.`);
  return result;
}

const ADVICE = {
  fresh: "",
  behind: "Trust the code over the handoff where they disagree, then save an updated handoff.",
  diverged: "Don't act on its Next step before checking it against the code and `git log`.",
  stale: "Check with the human or the code that this is still the plan before continuing.",
  unstamped: "",
};

// The lines an agent reads at session start.
export function describe(result, meta = {}) {
  const who = [meta.tool, meta.model].filter(Boolean).join("/");
  const stamp = [
    result.updated ? `written ${age(result.updated) ?? result.updated}` : "",
    result.stampedBranch ? `on ${result.stampedBranch}` : "",
    result.stampedHead ? `@ ${git.short(result.stampedHead)}` : "",
    who ? `by ${who}` : "",
  ].filter(Boolean).join(" ");
  const lines = [`Handoff: ${result.verdict.toUpperCase()}${stamp ? ` (${stamp})` : ""}: ${result.summary}.`];
  for (const commit of result.commits) lines.push(`  - ${commit.sha} ${commit.subject}`);
  if (result.commitsSince > result.commits.length) lines.push(`  - … and ${result.commitsSince - result.commits.length} more (git log ${git.short(result.stampedHead)}..HEAD)`);
  if (result.changedFiles.length > 0) {
    const shown = result.changedFiles.slice(0, 10);
    lines.push(`  Changed files: ${shown.join(", ")}${result.changedFiles.length > shown.length ? `, … (${result.changedFiles.length} in all)` : ""}`);
  }
  for (const note of result.notes) lines.push(`  ${note}`);
  if (ADVICE[result.verdict]) lines.push(`  ${ADVICE[result.verdict]}`);
  return lines;
}

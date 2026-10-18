// Approval records for the solo workflow. The record is written from the human's own prompt hook,
// not by the agent. It binds the approval to the card, the HEAD commit, the code diff, the card
// content that matters, and the linked evidence files. `check` stays read-only; the commit gate reads
// this record and refuses work the human has not seen.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { evidenceLinks, frontmatter } from "./cards.mjs";

export const APPROVAL = ".groundwork/.approvals/last-human.json";

const normalize = (text) => text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
export const fingerprint = (text) => createHash("sha256").update(normalize(text)).digest("hex");

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 20 * 1024 * 1024 });

export function head(project) {
  try {
    return git(project, ["rev-parse", "HEAD"]).trim();
  } catch {
    return "";
  }
}

// The code the human reviewed: tracked changes plus untracked files, excluding Groundwork's own
// records. Card and evidence changes are bound separately, so the runner can still set the status
// and History after approval without invalidating the code review.
export function workFingerprint(project) {
  let tracked = "";
  try {
    tracked = git(project, ["diff", "HEAD", "--binary", "--", ".", ":(exclude).groundwork"]);
  } catch {
    tracked = "";
  }
  let untracked = "";
  try {
    const names = git(project, ["ls-files", "--others", "--exclude-standard", "-z", "--", ".", ":(exclude).groundwork"])
      .split("\0")
      .filter(Boolean)
      .sort();
    untracked = names
      .map((name) => {
        const abs = join(project, name);
        const content = existsSync(abs) && statSync(abs).isFile() ? readFileSync(abs, "utf8") : "";
        return `${name}\0${fingerprint(content)}`;
      })
      .join("\0");
  } catch {
    untracked = "";
  }
  return fingerprint(`${tracked}\0${untracked}`);
}

// The card content the human reviewed, excluding the status and History the runner changes after
// approval. A change to Goal, criteria, evidence links, How to check or caveats invalidates it.
export function cardFingerprint(md) {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let text = md;
  if (fm) {
    const fields = fm[1].split(/\r?\n/).filter((line) => !/^status:/.test(line));
    text = `---\n${fields.join("\n")}\n---${md.slice(fm[0].length)}`;
  }
  text = text.replace(/\n## History\s*\n[\s\S]*?(?=\n## |\s*$)/, "\n");
  return fingerprint(text.trimEnd());
}

export function evidenceFingerprints(project, md) {
  const result = {};
  for (const link of evidenceLinks(md)) {
    const abs = resolve(project, link);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      result[link] = null;
      continue;
    }
    result[link] = fingerprint(readFileSync(abs, "utf8"));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function readApproval(project) {
  const path = join(project, APPROVAL);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export function findCard(project, id) {
  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return undefined;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
    const md = readFileSync(join(dir, name), "utf8");
    if (frontmatter(md).id === id) return { id, md, file: name };
  }
  return undefined;
}

// The card a bare /gw-approve refers to: exactly one waiting card, or the explicit id.
export function approvalTarget(project, id) {
  if (id) return findCard(project, id);
  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return undefined;
  const waiting = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .filter((md) => frontmatter(md).status === "awaiting-approval");
  return waiting.length === 1 ? { id: frontmatter(waiting[0]).id, md: waiting[0] } : undefined;
}

// Does the record cover the current card and code? Returns a plain reason when it does not.
export function approvalMatches(project, id, md) {
  const record = readApproval(project);
  if (!record) return { ok: false, reason: "there is no explicit human approval recorded" };
  if (record.approves !== id) {
    return { ok: false, reason: `the last human approval was for ${record.approves ?? "no card"}, not ${id}` };
  }
  if (record.head !== head(project)) {
    return { ok: false, reason: "the branch moved since the approval; ask the human to approve the current work again" };
  }
  if (record.work !== workFingerprint(project)) {
    return { ok: false, reason: "the code changed since the approval; ask the human to approve the current work again" };
  }
  if (record.card !== cardFingerprint(md)) {
    return { ok: false, reason: "the card changed since the approval, beyond status and History; ask the human to approve again" };
  }
  const evidence = evidenceFingerprints(project, md);
  if (JSON.stringify(record.evidence ?? {}) !== JSON.stringify(evidence)) {
    return { ok: false, reason: "the linked evidence changed since the approval; ask the human to approve again" };
  }
  return { ok: true };
}

export const approvalPath = (project) => join(project, APPROVAL);

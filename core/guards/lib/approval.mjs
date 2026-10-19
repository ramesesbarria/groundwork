// Approval records for the solo workflow. The record is written from the human's own prompt hook,
// not by the agent. It binds the approval to the card, the HEAD commit, the code diff, the card
// content that matters, the linked evidence files, the spec, decisions and the task's declared
// context. `check` stays read-only; the commit gate reads this record and refuses work the human has
// not seen.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { evidenceLinks, frontmatter } from "./cards.mjs";

export const APPROVAL = ".groundwork/.approvals/last-human.json";

const normalize = (text) => text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
export const fingerprint = (text) => createHash("sha256").update(normalize(text)).digest("hex");

const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 });

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
  try {
    const tracked = git(project, ["diff", "HEAD", "--binary", "--", ".", ":(exclude).groundwork"]);
    const names = git(project, ["ls-files", "--others", "--exclude-standard", "-z", "--", ".", ":(exclude).groundwork"])
      .split("\0")
      .filter(Boolean)
      .sort();
    const untracked = names
      .map((name) => {
        const abs = join(project, name);
        const content = existsSync(abs) && statSync(abs).isFile() ? readFileSync(abs, "utf8") : "";
        return `${name}\0${fingerprint(content)}`;
      })
      .join("\0");
    return fingerprint(`${tracked}\0${untracked}`);
  } catch {
    return undefined;
  }
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

const TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function safeFile(project, path) {
  const rel = String(path).replace(/\\/g, "/");
  if (!rel || rel.startsWith("/") || rel === ".." || rel.startsWith("../") || rel.includes("/../")) return undefined;
  const abs = resolve(project, rel);
  if (!abs.startsWith(resolve(project) + sep) || !existsSync(abs) || !statSync(abs).isFile()) return undefined;
  return rel;
}

function decisionFile(project, id) {
  const dir = join(project, ".groundwork", "decisions");
  if (!existsSync(dir)) return undefined;
  const name = readdirSync(dir)
    .filter((entry) => entry.endsWith(".md") && (entry === `${id}.md` || entry.startsWith(`${id}-`)))
    .sort()[0];
  return name ? `.groundwork/decisions/${name}` : undefined;
}

function specFile(project, path) {
  for (const candidate of [path, `.groundwork/${path}`]) {
    const rel = safeFile(project, candidate);
    if (rel) return rel;
  }
  return undefined;
}

// The project knowledge a card depends on. `.groundwork/` is excluded from the code diff so the runner
// can set status and History after approval, but the spec, decisions and declared context are what the
// human reviewed the work against: changing one makes the approval stale.
export function knowledgeFiles(project, id) {
  const files = new Set();
  for (const path of [".groundwork/SPEC.md", "SPEC.md"]) {
    const rel = safeFile(project, path);
    if (rel) files.add(rel);
  }
  const decisions = join(project, ".groundwork", "decisions");
  if (existsSync(decisions)) {
    for (const name of readdirSync(decisions).filter((entry) => entry.endsWith(".md"))) {
      const rel = safeFile(project, `.groundwork/decisions/${name}`);
      if (rel) files.add(rel);
    }
  }
  if (!TASK_ID.test(id)) return [...files].sort();
  const context = `.groundwork/work/${id}/context.json`;
  const contextRel = safeFile(project, context);
  if (!contextRel) return [...files].sort();
  files.add(contextRel);
  try {
    const parsed = JSON.parse(readFileSync(resolve(project, contextRel), "utf8"));
    for (const dep of Array.isArray(parsed?.deps) ? parsed.deps : []) {
      const stored = typeof dep?.path === "string" && dep.path ? safeFile(project, dep.path) : undefined;
      if (stored) {
        files.add(stored);
      } else if (typeof dep?.ref === "string" && dep.ref.startsWith("decision:")) {
        const rel = decisionFile(project, dep.ref.slice("decision:".length).trim());
        if (rel) files.add(rel);
      } else if (typeof dep?.ref === "string" && dep.ref.startsWith("spec:")) {
        const rel = specFile(project, dep.ref.slice("spec:".length).trim());
        if (rel) files.add(rel);
      }
    }
  } catch {
    // A malformed context file is still bound as a file; `check` reports the parse problem.
  }
  return [...files].sort();
}

export function knowledgeFingerprint(project, id) {
  return fingerprint(
    knowledgeFiles(project, id)
      .map((path) => `${path}\0${fingerprint(readFileSync(resolve(project, path), "utf8"))}`)
      .join("\0"),
  );
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

function approvalMode(project) {
  try {
    const config = JSON.parse(readFileSync(join(project, ".groundwork", "config.json"), "utf8").replace(/^\uFEFF/, ""));
    return String(config.approvalMode ?? "per-card");
  } catch {
    return "per-card";
  }
}

// The cards a /gw-approve refers to. "all" is the at-end batch. A bare command means the single
// waiting card, or every waiting card in at-end mode; in per-card mode two waiting cards are ambiguous.
export function approvalTargets(project, id) {
  if (id && id !== "all") return [findCard(project, id)].filter(Boolean);
  const dir = join(project, ".groundwork", "cards");
  if (!existsSync(dir)) return [];
  const waiting = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .filter((md) => frontmatter(md).status === "awaiting-approval")
    .map((md) => ({ id: frontmatter(md).id, md }));
  if (id === "all") return approvalMode(project) === "at-end" ? waiting : [];
  if (approvalMode(project) === "at-end") return waiting;
  return waiting.length === 1 ? waiting : [];
}

// Kept for callers that need exactly one target.
export function approvalTarget(project, id) {
  const targets = approvalTargets(project, id);
  return targets.length === 1 ? targets[0] : undefined;
}

// Does the record cover the current card and code? Returns a plain reason when it does not.
export function approvalMatches(project, id, md) {
  const record = readApproval(project);
  if (!record) return { ok: false, reason: "there is no explicit human approval recorded" };
  const batch = Array.isArray(record.approves);
  const expected = batch ? record.cards?.[id] : record;
  if (!batch && record.approves !== id) {
    return { ok: false, reason: `the last human approval was for ${record.approves ?? "no card"}, not ${id}` };
  }
  if (batch && !record.approves.includes(id)) {
    return { ok: false, reason: `the last human approval was for ${record.approves.join(", ") || "no card"}, not ${id}` };
  }
  if (!expected) return { ok: false, reason: `the last human approval has no record for ${id}` };
  const currentHead = head(project);
  if (!currentHead || record.head !== currentHead) {
    return { ok: false, reason: "the branch moved since the approval; ask the human to approve the current work again" };
  }
  const currentWork = workFingerprint(project);
  if (!currentWork || record.work !== currentWork) {
    return { ok: false, reason: "the code changed since the approval, or couldn't be read; ask the human to approve the current work again" };
  }
  if (expected.card !== cardFingerprint(md)) {
    return { ok: false, reason: "the card changed since the approval, beyond status and History; ask the human to approve again" };
  }
  if ((expected.knowledge ?? "") !== knowledgeFingerprint(project, id)) {
    return {
      ok: false,
      reason: "the spec, a decision, or the task's declared context changed since the approval; ask the human to approve again",
    };
  }
  const evidence = evidenceFingerprints(project, md);
  if (JSON.stringify(expected.evidence ?? {}) !== JSON.stringify(evidence)) {
    return { ok: false, reason: "the linked evidence changed since the approval; ask the human to approve again" };
  }
  return { ok: true };
}

export const approvalPath = (project) => join(project, APPROVAL);

#!/usr/bin/env node
// Writes evals/runs.csv: one row per scored run, from the raw records in
// .groundwork/evidence/evals/ (kept out of Git). Needs those records; aggregate.mjs needs only the CSV.
//   node evals/harness/export-runs.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const RAW = join(REPO, ".groundwork/evidence/evals");

// Which batches the published results use, and which run each rerun replaces. A replaced run stays
// in the CSV with in_corrected = no, so the original and corrected results can't be mixed.
const BATCHES = ["v1-full", "v1-rerun2", "v1-rerun3", "v1-team-a6a0f2e", "final-verify-e5b8d79"];
const REPLACES = {
  "v1-rerun2": "v1-full",
  "v1-rerun3": "v1-rerun2",
};

const parts = (r) => (r.kind === "team" ? r.stages.filter((s) => s.kind === "agent") : r.steps);
const sum = (r, key) => parts(r).reduce((n, s) => n + s[key], 0);
const group = (g) => (g ? `${g.pass}/${g.pass + g.fail}` : "");
const yn = (b) => (b ? "yes" : "no");

const rows = [];
for (const batch of BATCHES) {
  const dir = join(RAW, batch);
  const env = JSON.parse(readFileSync(join(dir, readdirSync(dir).find((f) => f.startsWith("environment"))), "utf8"));
  for (const name of readdirSync(dir).sort()) {
    const f = join(dir, name, "result.json");
    if (!existsSync(f)) continue;
    const r = JSON.parse(readFileSync(f, "utf8"));
    const s = r.kind === "team" ? r.score.branch : r.score.working;
    rows.push({
      batch,
      run_id: name,
      task: r.task,
      kind: r.kind,
      arm: r.arm,
      run: r.run,
      package_sha256: r.arm === "groundwork" ? env.groundworkTgzSha256 : "",
      evals_revision: env.evalsRevision.slice(0, 7),
      success: yn(r.score.success),
      committed_or_pushed: r.kind === "team" ? yn(r.git.pushed && r.git.upToDate) : yn(r.score.committedSuccess),
      accept: group(s?.accept),
      context: group(s?.context),
      regression: group(s?.regression),
      turns: parts(r).reduce((n, p) => n + p.turns.length, 0),
      approvals: sum(r, "approvals"),
      questions: sum(r, "questions"),
      sessions: r.usage.sessions,
      input: r.usage.input,
      output: r.usage.output,
      reasoning: r.usage.reasoning,
      cache_read: r.usage.cacheRead,
      cache_write: r.usage.cacheWrite,
      cost_usd: r.usage.costUsd.toFixed(6),
      elapsed_s: Math.round(r.elapsedMs / 1000),
    });
  }
}

// in_original: the first scored batch. in_corrected: the same 78 slots, each from its latest valid
// rerun. Team reruns on the fixed build and the final verification belong to neither.
const key = (r) => r.run_id;
const latest = new Map();
for (const r of rows) {
  if (r.batch === "v1-full") latest.set(key(r), r);
  else if (REPLACES[r.batch] && latest.get(key(r))?.batch === REPLACES[r.batch]) latest.set(key(r), r);
}
for (const r of rows) {
  r.in_original = yn(r.batch === "v1-full");
  r.in_corrected = yn(latest.get(key(r)) === r);
}

const cols = ["batch", "run_id", "in_original", "in_corrected", ...Object.keys(rows[0]).filter((c) => !["batch", "run_id", "in_original", "in_corrected"].includes(c))];
const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => r[c]).join(","))].join("\n") + "\n";
writeFileSync(join(REPO, "evals/runs.csv"), csv);
console.log(`evals/runs.csv: ${rows.length} runs`);

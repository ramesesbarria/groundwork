#!/usr/bin/env node
// Per-task comparison for one or more tags, with later tags replacing earlier runs of the same id
// (e.g. `v1-full v1-rerun`). Prints Markdown: per-task success and cost by arm, totals by suite,
// and each failed run with the hidden group it missed.
//   node evals/harness/analyze.mjs v1-full [v1-rerun]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const runs = new Map();
for (const tag of process.argv.slice(2)) {
  const dir = join(REPO, ".groundwork/evidence/evals", tag);
  for (const name of existsSync(dir) ? readdirSync(dir) : []) {
    const f = join(dir, name, "result.json");
    if (existsSync(f)) runs.set(name, { tag, ...JSON.parse(readFileSync(f, "utf8")) });
  }
}
const all = [...runs.values()];
const scoreOf = (r) => (r.kind === "team" ? r.score.branch : r.score.working);
const parts = (r) => (r.kind === "team" ? r.stages.filter((s) => s.kind === "agent") : r.steps);
const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
const mean = (xs, f) => (xs.length ? sum(xs, f) / xs.length : 0);
const human = (r) => sum(parts(r), (s) => s.approvals + s.questions);
const questions = (r) => sum(parts(r), (s) => s.questions);

const out = ["| Task | Baseline success | Groundwork success | Baseline mean cost | Groundwork mean cost | Baseline mean time | Groundwork mean time | Human replies B / G (questions) |", "|---|---|---|---:|---:|---:|---:|---|"];
const tasks = [...new Set(all.map((r) => r.task))].sort();
for (const task of tasks) {
  const b = all.filter((r) => r.task === task && r.arm === "baseline");
  const g = all.filter((r) => r.task === task && r.arm === "groundwork");
  const ok = (xs) => `${sum(xs, (r) => (r.score.success ? 1 : 0))}/${xs.length}`;
  out.push(`| ${task} | ${ok(b)} | ${ok(g)} | $${mean(b, (r) => r.usage.costUsd).toFixed(3)} | $${mean(g, (r) => r.usage.costUsd).toFixed(3)} | ${Math.round(mean(b, (r) => r.elapsedMs) / 1000)}s | ${Math.round(mean(g, (r) => r.elapsedMs) / 1000)}s | ${sum(b, human)} (${sum(b, questions)}) / ${sum(g, human)} (${sum(g, questions)}) |`);
}

out.push("", "| Suite | Arm | Runs | Successes | Total cost USD | Mean cost | Mean time | Input | Output | Reasoning | Cache read | Cache write |", "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const suite of ["solo", "team"]) {
  for (const arm of ["baseline", "groundwork"]) {
    const xs = all.filter((r) => r.kind === suite && r.arm === arm);
    if (!xs.length) continue;
    const t = (f) => sum(xs, (r) => r.usage[f]);
    out.push(`| ${suite} | ${arm} | ${xs.length} | ${sum(xs, (r) => (r.score.success ? 1 : 0))} | ${t("costUsd").toFixed(3)} | ${(t("costUsd") / xs.length).toFixed(4)} | ${Math.round(mean(xs, (r) => r.elapsedMs) / 1000)}s | ${t("input")} | ${t("output")} | ${t("reasoning")} | ${t("cacheRead")} | ${t("cacheWrite")} |`);
  }
}

out.push("", "Failed runs:");
for (const r of all.filter((x) => !x.score.success).sort((a, b) => a.task.localeCompare(b.task) || a.arm.localeCompare(b.arm))) {
  const s = scoreOf(r);
  const missed = ["accept", "context", "regression"].filter((g) => s?.[g] && !s[g].ok).map((g) => `${g} ${s[g].pass}/${s[g].pass + s[g].fail}`);
  if (r.kind === "team" && !r.git.upToDate) missed.push("branch not up to date");
  if (r.kind === "team" && !r.git.pushed) missed.push("branch not pushed");
  out.push(`- ${r.task} ${r.arm} r${r.run} (${r.tag}): ${missed.join(", ") || s?.error || "?"}`);
}
console.log(out.join("\n"));

#!/usr/bin/env node
// Recomputes the aggregates in RESULTS.md from evals/runs.csv alone, so they can be checked from a
// fresh clone. It recomputes the reported numbers; it doesn't rerun the experiments.
//   node evals/harness/aggregate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [head, ...lines] = readFileSync(fileURLToPath(new URL("../runs.csv", import.meta.url)), "utf8").trim().split("\n");
const cols = head.split(",");
const runs = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const ok = (rs) => `${rs.filter((r) => r.success === "yes").length}/${rs.length}`;
const pick = (set, f) => runs.filter((r) => r[set] === "yes" || r.batch === set).filter(f);

const CONTINUITY = ["S01", "S02", "S05", "S07", "S10"];
const SINGLE = ["S03", "S04", "S06", "S09"];
const rows = [];
for (const set of ["in_original", "in_corrected"]) {
  for (const arm of ["baseline", "groundwork"]) {
    const solo = pick(set, (r) => r.kind === "solo" && r.arm === arm);
    const team = pick(set, (r) => r.kind === "team" && r.arm === arm);
    rows.push({
      set: set.replace("in_", ""),
      arm,
      continuity: ok(solo.filter((r) => CONTINUITY.includes(r.task))),
      single: ok(solo.filter((r) => SINGLE.includes(r.task))),
      S08: ok(solo.filter((r) => r.task === "S08")),
      solo: ok(solo),
      team: ok(team),
      "solo cost (median)": median(solo.map((r) => +r.cost_usd)).toFixed(3),
      "solo time (median s)": median(solo.map((r) => +r.elapsed_s)),
      "team cost (median)": median(team.map((r) => +r.cost_usd)).toFixed(3),
      "solo replies (approvals+questions)": `${solo.reduce((n, r) => n + +r.approvals + +r.questions, 0)} (${solo.reduce((n, r) => n + +r.approvals, 0)}+${solo.reduce((n, r) => n + +r.questions, 0)})`,
    });
  }
}
for (const batch of ["v1-team-a6a0f2e", "final-verify-e5b8d79"]) {
  const rs = pick(batch, () => true);
  rows.push({ set: batch, arm: "groundwork", solo: rs[0].kind === "solo" ? ok(rs) : "", team: rs[0].kind === "team" ? ok(rs) : "", "team cost (median)": rs[0].kind === "team" ? median(rs.map((r) => +r.cost_usd)).toFixed(3) : "" });
}
console.table(rows);

const M = (n) => `${(n / 1e6).toFixed(n < 1e6 ? 2 : 1)}M`;
const totals = [];
for (const [label, set, kind] of [["solo", "in_corrected", "solo"], ["team", "in_original", "team"], ["team, fixed build", "v1-team-a6a0f2e", "team"]]) {
  for (const arm of ["baseline", "groundwork"]) {
    const rs = pick(set, (r) => r.kind === kind && r.arm === arm);
    if (rs.length === 0) continue;
    const t = (c) => rs.reduce((n, r) => n + +r[c], 0);
    totals.push({ suite: label, arm, runs: rs.length, input: M(t("input")), output: M(t("output")), reasoning: M(t("reasoning")), "cache read": M(t("cache_read")), "cache write": t("cache_write"), "API cost": `$${t("cost_usd").toFixed(2)}` });
  }
}
console.table(totals);
// Every run in the CSV, replaced ones included. The pilots (pilot2 $0.139, pilot3 $0.092) aren't in it.
const spend = {};
for (const r of runs) spend[r.batch] = (spend[r.batch] ?? 0) + +r.cost_usd;
console.table(Object.fromEntries(Object.entries(spend).map(([b, c]) => [b, { "API cost": `$${c.toFixed(3)}` }])));

#!/usr/bin/env node
// Summarizes a tag's results as Markdown: one row per run, then per task and per arm.
//   node evals/harness/report.mjs <tag> [<tag>...]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const tags = process.argv.slice(2);
const results = [];
const errors = [];
for (const tag of tags) {
  const dir = join(REPO, ".groundwork/evidence/evals", tag);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const result = join(dir, name, "result.json");
    if (existsSync(result)) results.push({ tag, ...JSON.parse(readFileSync(result, "utf8")) });
    else if (existsSync(join(dir, name, "error.txt"))) errors.push(`${tag}/${name}: ${readFileSync(join(dir, name, "error.txt"), "utf8").split("\n")[0]}`);
  }
}

const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(n));
const parts = (r) => (r.kind === "team" ? r.stages.filter((s) => s.kind === "agent") : r.steps);
const interventions = (r) => parts(r).reduce((a, s) => ({ approvals: a.approvals + s.approvals, questions: a.questions + s.questions }), { approvals: 0, questions: 0 });
const turns = (r) => parts(r).reduce((n, s) => n + s.turns.length, 0);
const group = (g) => (g ? `${g.pass}/${g.pass + g.fail}` : "–");
const scoreOf = (r) => (r.kind === "team" ? r.score.branch : r.score.working);

const lines = [
  "| Task | Arm | Run | Success | Accept | Context | Regr. | Committed ok | Turns | Approvals | Questions | Sessions | Tool calls (inv/shell/edit) | Input | Output | Reasoning | Cache read | Cost USD | Time |",
  "|---|---|---:|---|---|---|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|",
];
const sorted = results.sort((a, b) => a.task.localeCompare(b.task) || a.arm.localeCompare(b.arm) || a.run - b.run);
for (const r of sorted) {
  const s = scoreOf(r);
  const i = interventions(r);
  const u = r.usage;
  const committed = r.kind === "team" ? (r.git.upToDate ? "up to date" : "behind/missing") : r.score.committedSuccess ? "yes" : "no";
  lines.push(
    `| ${r.task} | ${r.arm} | ${r.run} | ${r.score.success ? "**yes**" : "no"} | ${group(s?.accept)} | ${group(s?.context)} | ${group(s?.regression)} | ${committed} | ${turns(r)} | ${i.approvals} | ${i.questions} | ${u.sessions} | ${u.toolCalls} (${u.investigateCalls}/${u.shellCalls}/${u.editCalls}) | ${k(u.input)} | ${k(u.output)} | ${k(u.reasoning)} | ${k(u.cacheRead)} | ${u.costUsd.toFixed(4)} | ${Math.round(r.elapsedMs / 1000)}s |`,
  );
}

const byArm = {};
for (const r of results) {
  const a = (byArm[r.arm] ??= { runs: 0, success: 0, cost: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, ms: 0, turns: 0, approvals: 0, questions: 0, toolCalls: 0 });
  const i = interventions(r);
  a.runs += 1;
  a.success += r.score.success ? 1 : 0;
  a.cost += r.usage.costUsd;
  a.input += r.usage.input;
  a.output += r.usage.output;
  a.reasoning += r.usage.reasoning;
  a.cacheRead += r.usage.cacheRead;
  a.ms += r.elapsedMs;
  a.turns += turns(r);
  a.approvals += i.approvals;
  a.questions += i.questions;
  a.toolCalls += r.usage.toolCalls;
}
lines.push("", "| Arm | Runs | Successes | Total cost USD | Mean cost | Mean time | Mean turns | Approvals | Questions | Mean tool calls | Input | Output | Reasoning | Cache read |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const [arm, a] of Object.entries(byArm)) {
  lines.push(`| ${arm} | ${a.runs} | ${a.success} | ${a.cost.toFixed(3)} | ${(a.cost / a.runs).toFixed(4)} | ${Math.round(a.ms / a.runs / 1000)}s | ${(a.turns / a.runs).toFixed(1)} | ${a.approvals} | ${a.questions} | ${(a.toolCalls / a.runs).toFixed(0)} | ${k(a.input)} | ${k(a.output)} | ${k(a.reasoning)} | ${k(a.cacheRead)} |`);
}
if (errors.length > 0) lines.push("", "Runs without a result:", ...errors.map((e) => `- ${e}`));
console.log(lines.join("\n"));

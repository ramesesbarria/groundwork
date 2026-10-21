#!/usr/bin/env node
// Lists runs the scripted human handled wrongly under the earlier harness, judged by the current
// rules: a step that ended on a request for the human that went unanswered, or a scripted approval
// sent with a quoted card id ("/gw-approve "1.1"") that the hook ignores. Those runs get rerun.
//   node evals/harness/affected.mjs <tag>
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { asksHuman } from "./run.mjs";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const dir = join(REPO, ".groundwork/evidence/evals", process.argv[2]);
const affected = [];
for (const name of readdirSync(dir).sort()) {
  const f = join(dir, name, "result.json");
  if (!existsSync(f)) continue;
  const r = JSON.parse(readFileSync(f, "utf8"));
  const parts = r.kind === "team" ? r.stages.filter((s) => s.kind === "agent") : r.steps;
  const reasons = [];
  parts.forEach((s, i) => {
    if (s.turns.some((t) => /^\/gw-approve "/.test(t.message))) reasons.push(`step ${i + 1}: quoted approval id`);
    // The driver stopped after this turn, so a request in it went unanswered (unless the follow-up
    // limit was what stopped it).
    if (s.turns.length - 1 < 4 && asksHuman(s.turns.at(-1).finalText)) reasons.push(`step ${i + 1}: unanswered request`);
  });
  if (reasons.length) affected.push(`${name}\t${r.score.success ? "success" : "failed"}\t${reasons.join("; ")}`);
}
console.log(affected.join("\n"));
console.log(`\n--only ${affected.map((l) => l.split("\t")[0]).join(",")}`);

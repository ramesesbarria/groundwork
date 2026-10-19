// Prepares every arm's starting workspace without running an agent, and checks it: the project's
// own tests pass, Groundwork's doctor and check are clean, and the hidden tests fail (work to do).
//   node evals/harness/dry-run.mjs --tgz <groundwork-ai.tgz>
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EVALS, addTeamPlan, baseRepo, setupBaseline, setupGroundwork } from "./arms.mjs";
import { scoreDir } from "./score.mjs";

const tgz = process.argv[process.argv.indexOf("--tgz") + 1];
let problems = 0;
for (const name of readdirSync(join(EVALS, "tasks")).filter((n) => /^[ST]\d\d/.test(n)).sort()) {
  const task = { ...JSON.parse(readFileSync(join(EVALS, "tasks", name, "task.json"), "utf8")), dir: join(EVALS, "tasks", name) };
  for (const arm of ["baseline", "groundwork"]) {
    const dir = mkdtempSync(join(tmpdir(), "gw-eval-dry-"));
    try {
      baseRepo(dir, task);
      if (arm === "groundwork") setupGroundwork(dir, tgz, { integration: task.type === "team" ? "pr" : "local" });
      else setupBaseline(dir);
      if (task.type === "team") addTeamPlan(dir, arm);
      const tests = (() => {
        try {
          execFileSync(process.execPath, ["--test"], { cwd: dir, stdio: "ignore" });
          return "ok";
        } catch {
          return "FAIL";
        }
      })();
      let gw = "-";
      if (arm === "groundwork") {
        const cli = join(dir, "node_modules/groundwork-ai/dist/bin.js");
        const run = (...a) => {
          try {
            execFileSync(process.execPath, [cli, ...a], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
            return "ok";
          } catch (e) {
            return `FAIL: ${String(e.stdout).split("\n").filter((l) => /✗|problem/i.test(l)).slice(0, 3).join(" | ")}`;
          }
        };
        gw = `doctor ${run("doctor")}, check ${run("check", ...(task.type === "team" ? ["--base", "main"] : []))}`;
      }
      const score = scoreDir(dir, task.dir);
      const workToDo = !score.accept?.ok;
      const ok = tests === "ok" && workToDo && !gw.includes("FAIL");
      if (!ok) problems += 1;
      console.log(`${ok ? "ok  " : "FAIL"} ${name} ${arm}: tests ${tests}; ${gw}; hidden accept ${score.accept?.ok ? "passes (no work?)" : "fails (work to do)"}; regression ${score.regression?.ok ? "ok" : "FAIL"}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
process.exitCode = problems ? 1 : 0;

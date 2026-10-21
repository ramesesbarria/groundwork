// Checks the task suite before any agent runs: on the starting state each task's acceptance or
// context tests must fail (there is work to do), and with the reference solution every hidden test
// must pass (the task is solvable and the tests are right).
//   node evals/harness/validate.mjs
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreDir, succeeded } from "./score.mjs";

const evals = fileURLToPath(new URL("..", import.meta.url));
const tasksDir = join(evals, "tasks");
let failures = 0;

function workspace(taskDir, withReference) {
  const dir = mkdtempSync(join(tmpdir(), "gw-eval-validate-"));
  cpSync(join(evals, "fixture"), dir, { recursive: true });
  if (existsSync(join(taskDir, "setup"))) cpSync(join(taskDir, "setup"), dir, { recursive: true });
  if (withReference) cpSync(join(taskDir, "reference"), dir, { recursive: true });
  return dir;
}

for (const name of readdirSync(tasksDir).filter((n) => /^[ST]\d\d/.test(n)).sort()) {
  const taskDir = join(tasksDir, name);
  if (!existsSync(join(taskDir, "reference"))) continue;
  const start = workspace(taskDir, false);
  const done = workspace(taskDir, true);
  try {
    const before = scoreDir(start, taskDir);
    const after = scoreDir(done, taskDir);
    const workToDo = !(before.accept?.ok && (before.context === null || before.context.ok));
    const solvable = succeeded(after);
    if (!workToDo || !solvable) failures += 1;
    console.log(`${workToDo && solvable ? "ok  " : "FAIL"} ${name}: start accept=${JSON.stringify(before.accept)} context=${JSON.stringify(before.context)} | reference ${JSON.stringify({ accept: after.accept, context: after.context, regression: after.regression })}`);
  } finally {
    rmSync(start, { recursive: true, force: true });
    rmSync(done, { recursive: true, force: true });
  }
}
process.exitCode = failures ? 1 : 0;

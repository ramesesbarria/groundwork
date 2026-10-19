// Scores a finished workspace with the task's hidden tests, which the agent never saw. Each group runs
// in a copy of the workspace with the tests under __hidden__/:
//   accept      the task's acceptance tests (hidden/accept.test.mjs)
//   context     whether earlier sessions' decisions and requirements were used (hidden/context.test.mjs)
//   regression  behavior every task must keep (_common/regression.test.mjs)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const COMMON = new URL("../tasks/_common/", import.meta.url);

function copyProject(from) {
  const to = mkdtempSync(join(tmpdir(), "gw-eval-score-"));
  cpSync(from, to, { recursive: true, filter: (src) => !/[\\/](node_modules|\.git)([\\/]|$)/.test(src) });
  return to;
}

function runTests(dir, files) {
  if (files.length === 0) return null;
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...files], {
    cwd: dir,
    encoding: "utf8",
    timeout: 120_000,
  });
  const out = `${result.stdout}\n${result.stderr}`;
  const count = (name) => Number(out.match(new RegExp(`^# ${name} (\\d+)`, "m"))?.[1] ?? 0);
  const pass = count("pass");
  const fail = count("fail") + count("cancelled");
  return { pass, fail: pass + fail === 0 ? 1 : fail, ok: result.status === 0 && fail === 0 && pass > 0 };
}

// Scores the files as they are in `projectDir` (the working tree).
export function scoreDir(projectDir, taskDir) {
  const copy = copyProject(projectDir);
  try {
    const hidden = join(copy, "__hidden__");
    cpSync(new URL(".", COMMON), hidden, { recursive: true });
    const taskHidden = join(taskDir, "hidden");
    if (existsSync(taskHidden)) cpSync(taskHidden, hidden, { recursive: true });
    const has = (name) => existsSync(join(hidden, name)) ? [`__hidden__/${name}`] : [];
    return {
      accept: runTests(copy, has("accept.test.mjs")),
      context: runTests(copy, has("context.test.mjs")),
      regression: runTests(copy, has("regression.test.mjs")),
      // The project's own tests, as the agent left them: recorded, not part of success.
      projectTests: readdirSync(copy).includes("test") ? runTests(copy, ["test/**/*.test.*"]) : null,
    };
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

// Task success: every acceptance, context and regression test passes.
export const succeeded = (score) =>
  Boolean(score?.accept?.ok && (score.context === null || score.context.ok) && score.regression?.ok);

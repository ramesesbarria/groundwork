// Runs the project's CLI as a user would, against a temporary ledger file.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function runCli(args, entries = [], extraFiles = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ledger-eval-"));
  const file = join(dir, "ledger.json");
  writeFileSync(file, JSON.stringify({ entries }));
  for (const [name, text] of Object.entries(extraFiles)) writeFileSync(join(dir, name), text);
  const result = spawnSync(process.execPath, [join(root, "src", "cli.js"), ...args], {
    cwd: dir,
    env: { ...process.env, LEDGER_FILE: file },
    encoding: "utf8",
  });
  return { stdout: result.stdout.replace(/\r\n/g, "\n"), stderr: result.stderr, status: result.status, dir };
}

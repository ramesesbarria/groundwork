// Checks that an agent session runs in the given workspace, not in the folder that launched it.
// One short model call. Run it before scored runs on a new machine or OpenCode version.
//   node evals/harness/probe-isolation.mjs
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OPENCODE =
  process.env.OPENCODE_BIN ??
  (process.platform === "win32" ? join(process.env.APPDATA, "npm/node_modules/@opencode/cli/bin/opencode.exe") : "opencode");
const cwd = mkdtempSync(join(tmpdir(), "gw-eval-probe-"));
execFileSync("git", ["init", "-q"], { cwd });
writeFileSync(join(cwd, "PROBE-MARKER.txt"), "marker\n");

const child = spawn(
  OPENCODE,
  ["run", "--standalone", "--auto", "--format", "json", "-m", "deepseek/deepseek-flash", "List the files in the current folder. Reply with only the file names."],
  { cwd, env: { ...process.env, PWD: cwd }, stdio: ["ignore", "pipe", "pipe"] },
);
let out = "";
child.stdout.on("data", (d) => (out += d));
const timer = setTimeout(() => child.kill(), 240_000);
child.on("close", () => {
  clearTimeout(timer);
  const sawMarker = out.includes("PROBE-MARKER");
  const sawRepo = /groundwork[\\/]+(evals|core|cli)/.test(out);
  console.log(`workspace: ${cwd}`);
  console.log(`saw PROBE-MARKER.txt: ${sawMarker}; saw this repo: ${sawRepo}`);
  process.exitCode = sawMarker && !sawRepo ? 0 : 1;
});

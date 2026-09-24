// Card 7.9: on an old Node, the CLI says what to do instead of printing a stack trace.
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkNode } from "../src/node-version.js";

const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// Runs the built CLI with process.versions.node stubbed before anything else loads.
function runWithNode(version: string, ...args: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-node-"));
  temps.push(dir);
  const stub = join(dir, "stub.mjs");
  writeFileSync(stub, `Object.defineProperty(process.versions, "node", { value: ${JSON.stringify(version)} });\n`);
  return spawnSync(process.execPath, ["--import", pathToFileURL(stub).href, bin, ...args], { encoding: "utf8", cwd: dir });
}

describe("old Node", () => {
  it.each(["18.19.0", "20.11.1", "21.7.3"])("rejects %s with a plain message", (version) => {
    const problem = checkNode(version);
    expect(problem).toContain("Groundwork needs Node 22 or later");
    expect(problem).toContain(`You have ${version}`);
    expect(problem).toContain("nodejs.org");
  });

  it.each(["22.0.0", "22.12.0", "24.1.0"])("accepts %s", (version) => {
    expect(checkNode(version)).toBeUndefined();
  });

  it("the CLI prints only the message and exits 1, with no stack trace", () => {
    const result = runWithNode("20.11.1", "--version");
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(checkNode("20.11.1"));
    expect(result.stdout).toBe("");
  });

  it("the CLI still runs on a supported version", () => {
    const result = runWithNode("22.12.0", "--version");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

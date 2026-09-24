import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { run } from "../src/index.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("groundwork CLI (smoke)", () => {
  it("prints the package version with --version", () => {
    expect(run(["--version"])).toEqual({ code: 0, output: pkg.version });
  });

  it("prints usage listing the planned commands when run with no arguments", () => {
    const { code, output } = run([]);
    expect(code).toBe(0);
    for (const cmd of ["init", "adapter", "status", "doctor", "retro"]) {
      expect(output).toContain(cmd);
    }
  });

  it("fails with a helpful message on an unknown command", () => {
    const { code, output } = run(["nope"]);
    expect(code).toBe(1);
    expect(output).toContain("Unknown command: nope");
  });
});

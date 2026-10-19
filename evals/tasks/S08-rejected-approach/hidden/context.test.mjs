// Decision D4 and the session-1 rejection: no module-level mutable state, no registries. Checks the
// source of src/: top-level let/var, top-level Maps/Sets/objects/arrays that are later mutated, and
// exported register/set functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./cli-helper.mjs";

const files = readdirSync(join(root, "src")).filter((f) => f.endsWith(".js"));

test("no module-level mutable state or registries in src/", () => {
  const problems = [];
  for (const file of files) {
    const text = readFileSync(join(root, "src", file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (/^(export\s+)?(let|var)\s/.test(line)) problems.push(`${file}: ${line.trim()}`);
      if (/^(export\s+)?const\s+\w+\s*=\s*(new\s+(Map|Set)\b|\{\s*\}|\[\s*\])/.test(line)) problems.push(`${file}: ${line.trim()}`);
      if (/^export\s+function\s+(register|set)[A-Z]\w*/.test(line)) problems.push(`${file}: ${line.trim()}`);
    }
  }
  assert.deepEqual(problems, []);
});

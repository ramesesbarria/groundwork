// The earlier session's rule: leftover cents go to categories in the order given. A largest-remainder
// split would give {a: 33, b: 67} here; the agreed rule gives {a: 34, b: 66}.
import { test } from "node:test";
import assert from "node:assert/strict";

const { splitByWeights } = await import("../src/split.js");

test("splitByWeights follows the leftover-cents decision from the earlier session", () => {
  assert.deepEqual(splitByWeights(100, { a: 1, b: 2 }), { a: 34, b: 66 });
  assert.deepEqual(splitByWeights(100, { a: 1, b: 1, c: 1 }), { a: 34, b: 33, c: 33 });
});

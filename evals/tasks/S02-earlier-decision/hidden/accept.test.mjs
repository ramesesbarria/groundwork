import { test } from "node:test";
import assert from "node:assert/strict";

const { splitEvenly, splitByWeights } = await import("../src/split.js");
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

test("splitEvenly gives leftover cents to the first categories in order", () => {
  assert.deepEqual(splitEvenly(100, ["a", "b", "c"]), { a: 34, b: 33, c: 33 });
  assert.deepEqual(splitEvenly(5, ["a", "b", "c"]), { a: 2, b: 2, c: 1 });
});

test("splitByWeights is proportional when it divides exactly, and never loses a cent", () => {
  assert.deepEqual(splitByWeights(1000, { a: 1, b: 3 }), { a: 250, b: 750 });
  assert.equal(sum(splitByWeights(1001, { a: 2, b: 5, c: 3 })), 1001);
  assert.equal(sum(splitByWeights(7, { a: 1, b: 1, c: 1 })), 7);
});

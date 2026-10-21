import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger, topCategories } from "../src/ledger.js";

const ledger = createLedger([
  { date: "2026-10-01", category: "Food", description: "", amount: 500 },
  { date: "2026-10-02", category: "Bus", description: "", amount: 700 },
  { date: "2026-10-03", category: "Art", description: "", amount: 700 },
  { date: "2026-10-04", category: "Food", description: "", amount: 300 },
  { date: "2026-10-05", category: "Gym", description: "", amount: 100 },
]);

test("largest totals first, ties by name", () => {
  assert.deepEqual(topCategories(ledger, 3), [
    { category: "Food", total: 800 },
    { category: "Art", total: 700 },
    { category: "Bus", total: 700 },
  ]);
});

test("n larger than the categories, and n of 0", () => {
  assert.equal(topCategories(ledger, 10).length, 4);
  assert.deepEqual(topCategories(ledger, 0), []);
});

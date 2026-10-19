// Nothing the task relies on changed: D5 still counts every entry, and the branch keeps the
// teammate's unrelated upstream helper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";

const { monthlyTotals } = await import("../src/summary.js");

test("monthly totals still count every entry (D5 unchanged)", () => {
  const ledger = createLedger([
    { date: "2026-10-05", category: "Food", description: "", amount: 1200 },
    { date: "2026-10-06", category: "Transfer", description: "", amount: 500 },
  ]);
  assert.deepEqual(monthlyTotals(ledger), [{ month: "2026-10", total: 1700 }]);
});

test("the branch includes the upstream helper", async () => {
  const { monthOf } = await import("../src/dates.js");
  assert.equal(monthOf("2026-10-19"), "2026-10");
});

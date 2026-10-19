// Task 1.2, merged first, is still intact on task 1.1's branch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";
import { renderReport } from "../src/report.js";

test("the report is sorted by total, ties by name (task 1.2 kept)", () => {
  const ledger = createLedger([
    { date: "2026-10-01", category: "Food", description: "", amount: 500 },
    { date: "2026-10-02", category: "Rent", description: "", amount: 9000 },
    { date: "2026-10-03", category: "Bus", description: "", amount: 500 },
  ]);
  const lines = renderReport(ledger, { date: "2026-10-19" }).split("\n").filter((l) => /^\w+: /.test(l) && !l.startsWith("Total"));
  assert.deepEqual(lines, ["Rent: 90.00", "Bus: 5.00", "Food: 5.00"]);
});

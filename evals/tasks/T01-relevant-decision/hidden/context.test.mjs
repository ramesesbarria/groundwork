// The upstream decision change (D5: transfers are not spending) reaches the in-flight task, and the
// branch keeps the teammate's upstream code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger, balance } from "../src/ledger.js";
import { runCli } from "./cli-helper.mjs";

const { monthlyTotals } = await import("../src/summary.js");

const entries = [
  { date: "2026-10-05", category: "Food", description: "", amount: 1200 },
  { date: "2026-10-06", category: "Transfer", description: "To savings", amount: 50000 },
];

test("monthly totals leave out transfers (D5)", () => {
  assert.deepEqual(monthlyTotals(createLedger(entries)), [{ month: "2026-10", total: 1200 }]);
  assert.match(runCli(["monthly"], entries).stdout, /^2026-10: 12\.00$/m);
});

test("the branch includes the upstream D5 change to balance", () => {
  assert.equal(balance(createLedger(entries)), 1200);
});

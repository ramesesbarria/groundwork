import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";
import { runCli } from "./cli-helper.mjs";

const { monthlyTotals } = await import("../src/summary.js");

const entries = [
  { date: "2026-10-05", category: "Food", description: "", amount: 1200 },
  { date: "2025-12-31", category: "Food", description: "", amount: 4250 },
  { date: "2026-10-20", category: "Bus", description: "", amount: 300 },
];

test("monthly totals, sorted by month", () => {
  assert.deepEqual(monthlyTotals(createLedger(entries)), [
    { month: "2025-12", total: 4250 },
    { month: "2026-10", total: 1500 },
  ]);
});

test("monthly CLI", () => {
  const { stdout, status } = runCli(["monthly"], entries);
  assert.equal(status, 0);
  assert.match(stdout, /^2025-12: 42\.50$/m);
  assert.match(stdout, /^2026-10: 15\.00$/m);
});

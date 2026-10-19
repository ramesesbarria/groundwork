import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";
import { runCli } from "./cli-helper.mjs";

const { monthlyTotals, yearlyTotals } = await import("../src/summary.js");

const entries = [
  { date: "2026-10-05", category: "Rent", description: "", amount: 120000 },
  { date: "2025-12-31", category: "Food", description: "", amount: 4250 },
  { date: "2026-09-01", category: "Food", description: "", amount: 1275 },
  { date: "2026-10-20", category: "Food", description: "", amount: 2000 },
];

test("monthly and yearly totals, sorted", () => {
  const ledger = createLedger(entries);
  assert.deepEqual(monthlyTotals(ledger), [
    { month: "2025-12", total: 4250 },
    { month: "2026-09", total: 1275 },
    { month: "2026-10", total: 122000 },
  ]);
  assert.deepEqual(yearlyTotals(ledger), [
    { year: "2025", total: 4250 },
    { year: "2026", total: 123275 },
  ]);
});

test("monthly CLI prints one line per month", () => {
  const { stdout } = runCli(["monthly"], entries);
  assert.match(stdout, /^2025-12: 42\.50$/m);
  assert.match(stdout, /^2026-09: 12\.75$/m);
});

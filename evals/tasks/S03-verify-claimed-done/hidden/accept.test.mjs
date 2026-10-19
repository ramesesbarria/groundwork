import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";

const { search } = await import("../src/search.js");

const ledger = createLedger([
  { date: "2026-10-05", category: "Food", description: "Lunch with Sam", amount: 1200 },
  { date: "2026-10-01", category: "Transport", description: "Bus to lunch", amount: 300 },
  { date: "2026-10-03", category: "Lunches", description: "Canteen", amount: 800 },
  { date: "2026-09-20", category: "Food", description: "Groceries", amount: 4000 },
]);
const dates = (rows) => rows.map((e) => e.date);

test("matches description or category, ignoring case, oldest first", () => {
  assert.deepEqual(dates(search(ledger, "LUNCH")), ["2026-10-01", "2026-10-03", "2026-10-05"]);
});

test("limits to an inclusive date range", () => {
  assert.deepEqual(dates(search(ledger, "food", { from: "2026-09-01", to: "2026-10-04" })), ["2026-09-20"]);
  assert.deepEqual(dates(search(ledger, "lunch", { from: "2026-10-03", to: "2026-10-05" })), ["2026-10-03", "2026-10-05"]);
});

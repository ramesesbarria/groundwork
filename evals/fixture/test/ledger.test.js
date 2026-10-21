import { test } from "node:test";
import assert from "node:assert/strict";
import { addEntry, balance, createLedger, entriesBetween, totalsByCategory } from "../src/ledger.js";
import { formatAmount, parseAmount } from "../src/money.js";
import { renderReport } from "../src/report.js";

const sample = () =>
  createLedger([
    { date: "2026-10-01", category: "Food", description: "Groceries", amount: 4250 },
    { date: "2026-10-03", category: "Transport", description: "Bus pass", amount: 3000 },
    { date: "2026-10-05", category: "Food", description: "Lunch", amount: 1275 },
  ]);

test("parses and formats amounts as whole cents", () => {
  assert.equal(parseAmount("12.34"), 1234);
  assert.equal(parseAmount("0.5"), 50);
  assert.equal(parseAmount("-5"), -500);
  assert.throws(() => parseAmount("1.234"));
  assert.equal(formatAmount(1234), "12.34");
  assert.equal(formatAmount(-500), "-5.00");
});

test("adds entries without changing the original ledger", () => {
  const ledger = sample();
  const next = addEntry(ledger, { date: "2026-10-06", category: "Fun", amount: 900 });
  assert.equal(ledger.entries.length, 3);
  assert.equal(next.entries.length, 4);
  assert.throws(() => addEntry(ledger, { date: "06/10/2026", category: "Fun", amount: 900 }));
  assert.throws(() => addEntry(ledger, { date: "2026-10-06", category: "Fun", amount: 9.5 }));
});

test("totals by category, balance and date ranges", () => {
  const ledger = sample();
  assert.deepEqual(totalsByCategory(ledger), { Food: 5525, Transport: 3000 });
  assert.equal(balance(ledger), 8525);
  assert.equal(entriesBetween(ledger, "2026-10-02", "2026-10-05").length, 2);
});

test("renders a report with a dated header, categories and a total", () => {
  const text = renderReport(sample(), { date: "2026-10-19" });
  assert.match(text, /^Ledger report \(19 October 2026\)/);
  assert.match(text, /Food: 55\.25/);
  assert.match(text, /Total: 85\.25$/);
});

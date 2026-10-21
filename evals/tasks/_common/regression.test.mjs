// Behavior every task must keep. Avoids what tasks legitimately change: the report header's date
// format, and formatting of amounts of 1,000 or more.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addEntry, balance, createLedger, entriesBetween, totalsByCategory } from "../src/ledger.js";
import { formatAmount, parseAmount } from "../src/money.js";
import { renderReport } from "../src/report.js";

const ledger = () =>
  createLedger([
    { date: "2026-10-01", category: "Food", description: "Groceries", amount: 4250 },
    { date: "2026-10-03", category: "Transport", description: "Bus", amount: 3000 },
    { date: "2026-10-05", category: "Food", description: "Lunch", amount: 1275 },
  ]);

test("regression: ledger basics", () => {
  const l = ledger();
  assert.deepEqual(totalsByCategory(l), { Food: 5525, Transport: 3000 });
  assert.equal(balance(l), 8525);
  assert.equal(entriesBetween(l, "2026-10-02", "2026-10-05").length, 2);
  const next = addEntry(l, { date: "2026-10-06", category: "Fun", amount: 900 });
  assert.equal(l.entries.length, 3);
  assert.equal(next.entries.length, 4);
});

test("regression: amounts", () => {
  assert.equal(parseAmount("12.34"), 1234);
  assert.equal(parseAmount("-5"), -500);
  assert.throws(() => parseAmount("1.234"));
  assert.equal(formatAmount(1234), "12.34");
  assert.equal(formatAmount(-500), "-5.00");
});

test("regression: report lists categories and the total", () => {
  const text = renderReport(ledger(), { date: "2026-10-19" });
  assert.match(text, /^Ledger report/);
  assert.match(text, /Food: 55\.25/);
  assert.match(text, /Transport: 30\.00/);
  assert.match(text, /Total: 85\.25/);
});

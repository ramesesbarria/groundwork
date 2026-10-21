import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger, totalsByCategory } from "../src/ledger.js";
import { renderReport } from "../src/report.js";

const ledger = createLedger([
  { date: "2026-10-01", category: "Groceries", description: "", amount: 1000 },
  { date: "2026-10-02", category: "Food", description: "", amount: 500 },
  { date: "2026-10-03", category: "Bus", description: "", amount: 300 },
]);

test("aliases fold into their target; no aliases keeps old behavior", () => {
  assert.deepEqual(totalsByCategory(ledger, { aliases: { Groceries: "Food" } }), { Food: 1500, Bus: 300 });
  assert.deepEqual(totalsByCategory(ledger), { Groceries: 1000, Food: 500, Bus: 300 });
});

test("report colors annotate category lines", () => {
  const text = renderReport(ledger, { date: "2026-10-19", colors: { Food: "green" } });
  assert.match(text, /^Food: 5\.00 \[green\]$/m);
  assert.match(text, /^Bus: 3\.00$/m);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { balance, createLedger, totalsByCategory } from "../src/ledger.js";

test("transfers are left out of totals and the balance (decision D5)", () => {
  const ledger = createLedger([
    { date: "2026-10-01", category: "Food", amount: 1000 },
    { date: "2026-10-02", category: "Transfer", amount: 50000 },
  ]);
  assert.deepEqual(totalsByCategory(ledger), { Food: 1000 });
  assert.equal(balance(ledger), 1000);
});

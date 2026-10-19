import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";
import { search } from "../src/search.js";

test("finds entries by description", () => {
  const ledger = createLedger([
    { date: "2026-10-01", category: "Food", description: "Lunch with Sam", amount: 1200 },
    { date: "2026-10-02", category: "Transport", description: "Bus", amount: 300 },
  ]);
  assert.equal(search(ledger, "Lunch").length, 1);
});

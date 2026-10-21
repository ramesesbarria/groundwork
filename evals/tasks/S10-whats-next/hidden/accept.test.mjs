import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLedger } from "../src/ledger.js";
import { renderReport } from "../src/report.js";

const { loadBudgets } = await import("../src/budgets.js");

test("loadBudgets reads amounts as cents; a missing file is empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "budgets-"));
  writeFileSync(join(dir, "b.json"), JSON.stringify({ Food: "200.00", Bus: "15.5" }));
  assert.deepEqual(loadBudgets(join(dir, "b.json")), { Food: 20000, Bus: 1550 });
  assert.deepEqual(loadBudgets(join(dir, "missing.json")), {});
});

test("the report flags categories over budget, and only those", () => {
  const ledger = createLedger([
    { date: "2026-10-01", category: "Food", description: "", amount: 25000 },
    { date: "2026-10-02", category: "Bus", description: "", amount: 1000 },
    { date: "2026-10-03", category: "Fun", description: "", amount: 900 },
  ]);
  const text = renderReport(ledger, { date: "2026-10-19", budgets: { Food: 20000, Bus: 1000 } });
  assert.match(text, /^Food: 250\.00 \(over budget by 50\.00\)$/m);
  assert.match(text, /^Bus: 10\.00$/m);
  assert.match(text, /^Fun: 9\.00$/m);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";
import { renderReport } from "../src/report.js";

test("the report header shows the ISO date and the rest is unchanged", () => {
  const ledger = createLedger([{ date: "2026-10-01", category: "Food", description: "", amount: 4250 }]);
  assert.equal(renderReport(ledger, { date: "2026-10-19" }), "Ledger report (2026-10-19)\n\nFood: 42.50\n\nTotal: 42.50");
  assert.match(renderReport(ledger, { title: "October", date: "2026-10-31" }), /^October \(2026-10-31\)\n/);
});

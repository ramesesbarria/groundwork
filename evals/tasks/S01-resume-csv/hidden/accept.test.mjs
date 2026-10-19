import { test } from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "../src/ledger.js";

import { runCli } from "./cli-helper.mjs";

const { exportCsv } = await import("../src/export.js");

const ledger = createLedger([
  { date: "2026-10-01", category: "Food", description: "Groceries", amount: 4250 },
  { date: "2026-10-02", category: "Refund", description: 'Shoes, "blue"', amount: -500 },
  { date: "2026-10-03", category: "Gifts", description: "Line one\nline two", amount: 1999 },
]);

test("header, ledger order, amounts and quoting", () => {
  assert.equal(
    exportCsv(ledger),
    'date,category,description,amount\n2026-10-01,Food,Groceries,42.50\n2026-10-02,Refund,"Shoes, ""blue""",-5.00\n2026-10-03,Gifts,"Line one\nline two",19.99\n',
  );
});

test("an empty ledger is just the header line", () => {
  assert.equal(exportCsv(createLedger()), "date,category,description,amount\n");
});

test("the export CLI command prints the CSV", () => {
  const { stdout, status } = runCli(["export"], ledger.entries);
  assert.equal(status, 0);
  assert.equal(stdout.replace(/\n+$/, ""), exportCsv(ledger).replace(/\n$/, ""));
});

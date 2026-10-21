// The session-2 decision (thousands separators) must reach the session-3 feature and earlier output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCli } from "./cli-helper.mjs";
import { formatAmount } from "../src/money.js";

const entries = [
  { date: "2026-10-05", category: "Rent", description: "", amount: 120000 },
  { date: "2026-10-20", category: "Food", description: "", amount: 2000 },
  { date: "2025-01-02", category: "Refund", description: "", amount: -1200000 },
];

test("yearly output, added after the decision, uses thousands separators", () => {
  const { stdout } = runCli(["yearly"], entries);
  assert.match(stdout, /^2026: 1,220\.00$/m);
  assert.match(stdout, /^2025: -12,000\.00$/m);
});

test("existing output follows the decision too", () => {
  assert.equal(formatAmount(123456), "1,234.56");
  assert.match(runCli(["monthly"], entries).stdout, /^2026-10: 1,220\.00$/m);
});

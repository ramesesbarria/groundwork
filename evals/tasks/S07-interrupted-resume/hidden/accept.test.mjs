import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runCli } from "./cli-helper.mjs";

const { expandRecurring } = await import("../src/recurring.js");
const rule = { day: 31, category: "Rent", description: "Flat", amount: 90000 };

test("one entry per month, clamped to the month's last day, inclusive and oldest first", () => {
  const dates = expandRecurring(rule, "2026-01-15", "2026-04-30").map((e) => e.date);
  assert.deepEqual(dates, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.deepEqual(expandRecurring({ ...rule, day: 29 }, "2028-02-01", "2028-02-29").map((e) => e.date), ["2028-02-29"]);
  assert.deepEqual(expandRecurring({ ...rule, day: 10 }, "2026-03-11", "2026-04-09"), []);
});

test("entries carry the rule's fields", () => {
  const [entry] = expandRecurring({ ...rule, day: 5 }, "2026-05-05", "2026-05-05");
  assert.deepEqual(entry, { date: "2026-05-05", category: "Rent", description: "Flat", amount: 90000 });
});

test("add accepts --description as well as --desc", () => {
  const { dir, status } = runCli(["add", "--date", "2026-10-01", "--category", "Food", "--amount", "1.00", "--description", "Tea"]);
  assert.equal(status, 0);
  const saved = JSON.parse(readFileSync(join(dir, "ledger.json"), "utf8"));
  assert.equal(saved.entries[0].description, "Tea");
});

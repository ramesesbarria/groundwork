import { test } from "node:test";
import assert from "node:assert/strict";
import { monthOf, yearOf } from "../src/dates.js";

test("date helpers", () => {
  assert.equal(monthOf("2026-10-19"), "2026-10");
  assert.equal(yearOf("2026-10-19"), 2026);
});

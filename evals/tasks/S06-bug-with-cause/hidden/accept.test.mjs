import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount } from "../src/money.js";

test("parses every two-decimal amount exactly", () => {
  for (let cents = 0; cents <= 100000; cents += 1) {
    const text = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
    assert.equal(parseAmount(text), cents, text);
    if (cents > 0) assert.equal(parseAmount(`-${text}`), -cents, `-${text}`);
  }
  assert.equal(parseAmount("0.29"), 29);
  assert.equal(parseAmount("4.35"), 435);
});

test("still rejects malformed amounts", () => {
  for (const bad of ["1.234", "abc", "", "1,00", "1e2"]) assert.throws(() => parseAmount(bad), bad);
});

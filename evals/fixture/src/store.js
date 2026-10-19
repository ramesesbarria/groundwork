import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createLedger } from "./ledger.js";

// The ledger file is JSON: { "entries": [...] }. A missing file is an empty ledger.
export function loadLedger(path) {
  if (!existsSync(path)) return createLedger();
  return createLedger(JSON.parse(readFileSync(path, "utf8")).entries ?? []);
}

export function saveLedger(path, ledger) {
  writeFileSync(path, JSON.stringify({ entries: ledger.entries }, null, 2) + "\n");
}

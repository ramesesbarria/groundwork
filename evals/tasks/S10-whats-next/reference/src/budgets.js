import { existsSync, readFileSync } from "node:fs";
import { parseAmount } from "./money.js";

export function loadBudgets(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(Object.entries(JSON.parse(readFileSync(path, "utf8"))).map(([c, a]) => [c, parseAmount(a)]));
}

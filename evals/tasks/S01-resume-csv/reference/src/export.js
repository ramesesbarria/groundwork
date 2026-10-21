import { formatAmount } from "./money.js";

export const quoteField = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function exportCsv(ledger) {
  const lines = ["date,category,description,amount"];
  for (const e of ledger.entries) lines.push([e.date, e.category, e.description, formatAmount(e.amount)].map(quoteField).join(","));
  return lines.join("\n") + "\n";
}

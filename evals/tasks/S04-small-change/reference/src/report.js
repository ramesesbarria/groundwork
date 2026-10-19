import { balance, totalsByCategory } from "./ledger.js";
import { formatAmount } from "./money.js";

export function renderReport(ledger, { title = "Ledger report", date }) {
  const lines = [`${title} (${date})`, ""];
  for (const [category, cents] of Object.entries(totalsByCategory(ledger))) lines.push(`${category}: ${formatAmount(cents)}`);
  lines.push("", `Total: ${formatAmount(balance(ledger))}`);
  return lines.join("\n");
}

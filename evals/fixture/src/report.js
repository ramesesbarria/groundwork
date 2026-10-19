import { balance, totalsByCategory } from "./ledger.js";
import { formatAmount } from "./money.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026-10-19" -> "19 October 2026"
export function longDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// A plain-text report: a header, one line per category, then the total.
export function renderReport(ledger, { title = "Ledger report", date }) {
  const lines = [`${title} (${longDate(date)})`, ""];
  for (const [category, cents] of Object.entries(totalsByCategory(ledger))) {
    lines.push(`${category}: ${formatAmount(cents)}`);
  }
  lines.push("", `Total: ${formatAmount(balance(ledger))}`);
  return lines.join("\n");
}

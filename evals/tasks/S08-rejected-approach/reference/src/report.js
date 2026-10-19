import { balance, totalsByCategory } from "./ledger.js";
import { formatAmount } from "./money.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function longDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function renderReport(ledger, { title = "Ledger report", date, colors = {} }) {
  const lines = [`${title} (${longDate(date)})`, ""];
  for (const [category, cents] of Object.entries(totalsByCategory(ledger))) {
    lines.push(`${category}: ${formatAmount(cents)}${colors[category] ? ` [${colors[category]}]` : ""}`);
  }
  lines.push("", `Total: ${formatAmount(balance(ledger))}`);
  return lines.join("\n");
}

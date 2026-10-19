const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function createLedger(entries = []) {
  return { entries: entries.map(validEntry) };
}

function validEntry(entry) {
  const { date, category, description = "", amount } = entry ?? {};
  if (typeof date !== "string" || !DATE.test(date)) throw new Error(`Entry date must be YYYY-MM-DD: ${date}`);
  if (typeof category !== "string" || category.trim() === "") throw new Error("Entry needs a category");
  if (!Number.isInteger(amount)) throw new Error(`Entry amount must be whole cents: ${amount}`);
  return { date, category: category.trim(), description: String(description), amount };
}

export function addEntry(ledger, entry) {
  return { entries: [...ledger.entries, validEntry(entry)] };
}

export function totalsByCategory(ledger) {
  const totals = {};
  for (const { category, amount } of ledger.entries) totals[category] = (totals[category] ?? 0) + amount;
  return totals;
}

export function balance(ledger) {
  return ledger.entries.reduce((sum, { amount }) => sum + amount, 0);
}

export function entriesBetween(ledger, from, to) {
  return ledger.entries.filter(({ date }) => date >= from && date <= to);
}

export function topCategories(ledger, n) {
  return Object.entries(totalsByCategory(ledger))
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total || (a.category < b.category ? -1 : a.category > b.category ? 1 : 0))
    .slice(0, n);
}

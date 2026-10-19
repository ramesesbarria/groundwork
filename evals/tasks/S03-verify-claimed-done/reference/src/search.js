export function search(ledger, query, { from, to } = {}) {
  const q = query.toLowerCase();
  return ledger.entries
    .filter((e) => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

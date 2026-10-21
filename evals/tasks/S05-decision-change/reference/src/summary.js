const totalsBy = (ledger, key) => {
  const totals = new globalThis.Map();
  for (const e of ledger.entries) totals.set(key(e), (totals.get(key(e)) ?? 0) + e.amount);
  return [...totals].sort(([a], [b]) => (a < b ? -1 : 1));
};

export const monthlyTotals = (ledger) => totalsBy(ledger, (e) => e.date.slice(0, 7)).map(([month, total]) => ({ month, total }));
export const yearlyTotals = (ledger) => totalsBy(ledger, (e) => e.date.slice(0, 4)).map(([year, total]) => ({ year, total }));

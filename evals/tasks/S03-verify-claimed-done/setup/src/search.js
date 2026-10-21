// Search entries by text.
export function search(ledger, query) {
  return ledger.entries.filter((entry) => entry.description.includes(query));
}

// Money is stored as integer cents (see decision D1). Parsing and formatting live here.

// "12.34" -> 1234, "-5" -> -500. Throws on anything else.
export function parseAmount(text) {
  const match = String(text).trim().match(/^(-)?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error(`Not an amount: ${text}`);
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "0").padEnd(2, "0"));
  return match[1] ? -cents : cents;
}

// 1234 -> "12.34", -500 -> "-5.00".
export function formatAmount(cents) {
  if (!Number.isInteger(cents)) throw new Error(`Not a whole number of cents: ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

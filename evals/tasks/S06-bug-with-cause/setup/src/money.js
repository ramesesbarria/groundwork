// Money is stored as integer cents (see decision D1). Parsing and formatting live here.

// "12.34" -> 1234, "-5" -> -500. Throws on anything else.
export function parseAmount(text) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(String(text).trim())) throw new Error(`Not an amount: ${text}`);
  return Math.floor(parseFloat(text) * 100);
}

// 1234 -> "12.34", -500 -> "-5.00".
export function formatAmount(cents) {
  if (!Number.isInteger(cents)) throw new Error(`Not a whole number of cents: ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

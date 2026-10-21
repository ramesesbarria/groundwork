export function parseAmount(text) {
  const match = String(text).trim().match(/^(-)?(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error(`Not an amount: ${text}`);
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "0").padEnd(2, "0"));
  return match[1] ? -cents : cents;
}

export function formatAmount(cents) {
  if (!Number.isInteger(cents)) throw new Error(`Not a whole number of cents: ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}

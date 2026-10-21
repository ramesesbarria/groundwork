const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function expandRecurring({ day, category, description, amount }, from, to) {
  const out = [];
  let [year, month] = from.split("-").map(Number);
  const [endYear, endMonth] = to.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const date = iso(year, month, Math.min(day, lastDay(year, month)));
    if (date >= from && date <= to) out.push({ date, category, description, amount });
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
  return out;
}

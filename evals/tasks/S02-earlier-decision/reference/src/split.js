// Leftover cents go one each to the categories in the order given.
function distribute(amount, shares) {
  const names = Object.keys(shares);
  const result = {};
  let used = 0;
  for (const name of names) {
    result[name] = Math.floor(shares[name]);
    used += result[name];
  }
  for (let i = 0; used < amount; i = (i + 1) % names.length, used += 1) result[names[i]] += 1;
  return result;
}

export function splitEvenly(amount, categories) {
  return distribute(amount, Object.fromEntries(categories.map((c) => [c, amount / categories.length])));
}

export function splitByWeights(amount, weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return distribute(amount, Object.fromEntries(Object.entries(weights).map(([c, w]) => [c, (amount * w) / total])));
}

import { readFileSync } from "node:fs";

// Works from both src/ (tests) and dist/ (published): package.json is one level up.
export const VERSION = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string })
  .version;

// Compare versions like "0.3.0" part by part, as numbers. Missing parts count as 0.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0);
  const pb = b.split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

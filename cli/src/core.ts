import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Core files keyed by relative path with forward slashes, e.g. "roles/tester.md".
export type CoreFiles = Readonly<Record<string, string>>;

export function readCore(dir: string): CoreFiles {
  const files: Record<string, string> = {};
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name !== ".gitkeep") files[relative(dir, path).split(sep).join("/")] = readFileSync(path, "utf8");
    }
  };
  walk(dir);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

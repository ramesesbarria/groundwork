// Reading a project's .groundwork/config.json. Missing or unreadable means no settings.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelHints } from "./adapters/shared.js";

export interface ProjectConfig {
  version?: string;
  models?: ModelHints;
  [key: string]: unknown;
}

export function readProjectConfig(groundworkDir: string): ProjectConfig {
  const path = join(groundworkDir, "config.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ProjectConfig;
  } catch {
    return {};
  }
}

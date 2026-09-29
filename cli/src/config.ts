// Reading a project's .groundwork/config.json. Missing or unreadable means no settings.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelHints } from "./adapters/shared.js";

export interface ProjectConfig {
  version?: string;
  models?: ModelHints;
  [key: string]: unknown;
}

// JSON as Windows tools often save it: PowerShell 5.1 and some editors start the file with a byte
// order mark, which JSON.parse rejects. core/guards/run.mjs has the same helper (it can't import this).
export const parseJson = (text: string): unknown => JSON.parse(text.replace(/^﻿/, ""));

export function readProjectConfig(groundworkDir: string): ProjectConfig {
  const path = join(groundworkDir, "config.json");
  if (!existsSync(path)) return {};
  try {
    return parseJson(readFileSync(path, "utf8")) as ProjectConfig;
  } catch {
    return {};
  }
}

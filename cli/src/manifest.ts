// .groundwork/.manifest.json: a fingerprint of each file Groundwork last wrote, so `upgrade` can tell a
// file the user changed (keep it, write the new version next to it) from one they didn't (replace it).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseJson } from "./config.js";

export const MANIFEST = ".groundwork/.manifest.json";

export interface Manifest {
  version?: string;
  files: Record<string, string>; // project path → sha256 of what Groundwork wrote
}

// Line endings don't count as an edit: git may check files out with CRLF on Windows.
export const fingerprint = (text: string) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

export function readManifest(cwd: string): Manifest | undefined {
  const path = join(cwd, MANIFEST);
  if (!existsSync(path)) return undefined;
  try {
    const manifest = parseJson(readFileSync(path, "utf8")) as Manifest;
    return manifest && typeof manifest.files === "object" ? manifest : undefined;
  } catch {
    return undefined;
  }
}

// Records what Groundwork wrote for these paths, keeping every other entry.
export function recordFiles(cwd: string, files: { path: string; content: string }[], version: string) {
  const manifest = readManifest(cwd) ?? { files: {} };
  for (const file of files) manifest.files[file.path] = fingerprint(file.content);
  const sorted = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(cwd, MANIFEST), JSON.stringify({ version, files: sorted }, null, 2) + "\n");
}

// "unchanged": the file is what Groundwork last wrote. "edited": the user changed it since.
// "unknown": no record (an install from before the manifest existed).
export function editState(manifest: Manifest | undefined, path: string, current: string): "unchanged" | "edited" | "unknown" {
  const recorded = manifest?.files[path];
  if (recorded === undefined) return "unknown";
  return fingerprint(current) === recorded ? "unchanged" : "edited";
}

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
  // project path → sha256 of the version offered as <path>.new next to a file the user changed. Once
  // the user has merged it and deleted the .new file, the same version isn't offered again.
  offered?: Record<string, string>;
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

const sorted = (record: Record<string, string>) => Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

function writeManifest(cwd: string, manifest: Manifest, version: string) {
  const offered = manifest.offered && Object.keys(manifest.offered).length > 0 ? { offered: sorted(manifest.offered) } : {};
  writeFileSync(join(cwd, MANIFEST), JSON.stringify({ version, files: sorted(manifest.files), ...offered }, null, 2) + "\n");
}

// Records what Groundwork wrote for these paths, keeping every other entry. A file whose content on
// disk isn't the planned content wasn't written (the user kept theirs), so its entry stays as it was:
// that is what tells a later upgrade the user changed it, and lets a revert count as unchanged.
export function recordFiles(cwd: string, files: { path: string; content: string }[], version: string) {
  const manifest = readManifest(cwd) ?? { files: {} };
  for (const file of files) {
    const path = join(cwd, file.path);
    if (!existsSync(path) || fingerprint(readFileSync(path, "utf8")) !== fingerprint(file.content)) continue;
    manifest.files[file.path] = fingerprint(file.content);
    if (manifest.offered) delete manifest.offered[file.path];
  }
  writeManifest(cwd, manifest, version);
}

// Records the versions just offered as <path>.new.
export function recordOffered(cwd: string, files: { path: string; content: string }[], version: string) {
  if (files.length === 0) return;
  const manifest = readManifest(cwd) ?? { files: {} };
  manifest.offered = { ...manifest.offered };
  for (const file of files) manifest.offered[file.path] = fingerprint(file.content);
  writeManifest(cwd, manifest, version);
}

// The user already merged this exact version: it was offered as .new, and they deleted the .new file.
export function alreadyMerged(cwd: string, manifest: Manifest | undefined, file: { path: string; content: string }): boolean {
  return manifest?.offered?.[file.path] === fingerprint(file.content) && !existsSync(join(cwd, `${file.path}.new`));
}

// "unchanged": the file is what Groundwork last wrote. "edited": the user changed it since.
// "unknown": no record (an install from before the manifest existed).
export function editState(manifest: Manifest | undefined, path: string, current: string): "unchanged" | "edited" | "unknown" {
  const recorded = manifest?.files[path];
  if (recorded === undefined) return "unknown";
  return fingerprint(current) === recorded ? "unchanged" : "edited";
}

// Writing planned files into a project without clobbering the user's work.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Io } from "./index.js";
import { mergeSettings } from "./settings.js";

export interface PlannedFile {
  path: string;
  content: string;
  // "replace" (default): write the file, asking first if a different one exists.
  // "append-lines": add any of our lines the file is missing, keeping everything else.
  // "merge-settings": merge our hooks into an existing Claude Code settings file.
  mode?: "replace" | "append-lines" | "merge-settings";
  // For a project's own instruction files: if the file already exists, never replace it. Add the
  // pointer lines unless it already contains the marker. A new file still gets the full content.
  pointer?: { marker: string; lines: string };
}

export interface ApplyResult {
  lines: string[]; // one line per file that changed (or would change, in a dry run)
  kept: string[]; // files the user chose to keep
}

export async function applyFiles(files: PlannedFile[], io: Io, dryRun: boolean): Promise<ApplyResult> {
  const lines: string[] = [];
  const kept: string[] = [];

  for (const planned of files) {
    const target = join(io.cwd, planned.path);
    const exists = existsSync(target);
    if (exists && planned.pointer && readFileSync(target, "utf8").includes(planned.pointer.marker)) {
      if (dryRun) lines.push(`  unchanged  ${planned.path}`);
      continue;
    }
    const file: PlannedFile =
      exists && planned.pointer ? { ...planned, content: planned.pointer.lines, mode: "append-lines" } : planned;

    if (file.mode === "append-lines" && exists) {
      const current = readFileSync(target, "utf8");
      const have = new Set(current.split(/\r?\n/));
      const missing = file.content.split("\n").filter((line) => line !== "" && !have.has(line));
      if (missing.length === 0) {
        if (dryRun) lines.push(`  unchanged  ${file.path}`);
        continue;
      }
      lines.push(`  add lines  ${file.path}`);
      if (!dryRun) {
        const separator = current === "" || current.endsWith("\n") ? "" : "\n";
        writeFileSync(target, `${current}${separator}${missing.join("\n")}\n`);
      }
      continue;
    }

    if (file.mode === "merge-settings" && exists) {
      const current = readFileSync(target, "utf8");
      let merged: string;
      try {
        merged = JSON.stringify(mergeSettings(JSON.parse(current), JSON.parse(file.content)), null, 2) + "\n";
      } catch {
        lines.push(`  skip       ${file.path} (not valid JSON; add Groundwork's hook by hand)`);
        continue;
      }
      if (JSON.stringify(JSON.parse(merged)) === JSON.stringify(JSON.parse(current))) {
        if (dryRun) lines.push(`  unchanged  ${file.path}`);
        continue;
      }
      lines.push(`  merge      ${file.path}`);
      if (!dryRun) writeFileSync(target, merged);
      continue;
    }

    const same = exists && readFileSync(target, "utf8") === file.content;

    if (dryRun) {
      if (same) lines.push(`  unchanged  ${file.path}`);
      else if (exists) lines.push(`  exists     ${file.path} (would ask before overwriting)`);
      else lines.push(`  create     ${file.path}`);
      continue;
    }
    if (same) continue;
    if (exists) {
      const answer = (await io.ask(`${file.path} already exists. Overwrite it? [y/N]: `)).trim().toLowerCase();
      if (answer !== "y" && answer !== "yes") {
        lines.push(`  skip       ${file.path} (kept yours)`);
        kept.push(file.path);
        continue;
      }
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    lines.push(`  ${exists ? "overwrite" : "create   "}  ${file.path}`);
  }

  return { lines, kept };
}

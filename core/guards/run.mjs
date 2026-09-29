#!/usr/bin/env node
// Groundwork guard runner. Adapters call it from their tool's hook, e.g. for Claude Code:
//   node .groundwork/guards/run.mjs claude-code   (hook input as JSON on stdin)
// It runs the guards listed under "guards" in .groundwork/config.json.
// Exit code 2 blocks the action (Claude Code shows stderr to the model); 0 allows it.
//
// It fails safe: when the config or a guard can't be read or run, a commit is blocked (so a broken
// setup can't let one through unnoticed) and everything else is allowed, with a message either way.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// JSON as Windows tools often save it: PowerShell 5.1 and some editors add a byte order mark.
export const parseJson = (text) => JSON.parse(text.replace(/^﻿/, ""));

export const COMMIT = /\bgit\b[\s\S]*\bcommit\b/;
export const isCommit = (action) => action.kind === "command" && COMMIT.test(action.command);

// The files an apply_patch-style patch changes, from its "*** Update File: x" or "+++ b/x" lines.
function patchPaths(patch) {
  const paths = [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\+\+\+ (?:b\/)?(.+)$/gm)]
    .map((m) => (m[1] ?? m[2]).trim())
    .filter((p) => p !== "/dev/null");
  return [...new Set(paths)];
}

// Added lines of a patch: what it writes.
const patchContent = (patch) =>
  patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");

function patchAction(patch) {
  const paths = patchPaths(patch);
  return { kind: "write", path: paths[0] ?? "", paths, content: patchContent(patch) };
}

const edit = (old, next, all) => ({ old: String(old ?? ""), new: String(next ?? ""), all: Boolean(all) });

// A tool's hook input → a Groundwork action, or null if guards don't apply.
//   { kind: "command", command }  or  { kind: "write", path, content }
// `content` is the text written. A write also says what it does to the file when that's known:
// `whole: true` (it replaces the file) or `edits` ([{ old, new, all }]). A patch has `paths`.
export function toAction(tool, input) {
  if (tool === "claude-code") {
    const args = input.tool_input ?? {};
    switch (input.tool_name) {
      case "Bash":
        return { kind: "command", command: String(args.command ?? "") };
      case "Write":
        return { kind: "write", path: String(args.file_path ?? ""), content: String(args.content ?? ""), whole: true };
      case "Edit":
        return {
          kind: "write",
          path: String(args.file_path ?? ""),
          content: String(args.new_string ?? ""),
          edits: [edit(args.old_string, args.new_string, args.replace_all)],
        };
      case "MultiEdit":
        return {
          kind: "write",
          path: String(args.file_path ?? ""),
          content: (args.edits ?? []).map((e) => e.new_string ?? "").join("\n"),
          edits: (args.edits ?? []).map((e) => edit(e.old_string, e.new_string, e.replace_all)),
        };
      case "NotebookEdit":
        return { kind: "write", path: String(args.notebook_path ?? ""), content: String(args.new_source ?? "") };
      default:
        return null;
    }
  }
  if (tool === "opencode") {
    // OpenCode tool names and arguments: opencode.ai/docs/tools. OpenCode 2.x renamed bash to shell
    // and filePath to path.
    const args = input.args ?? {};
    const path = String(args.path ?? args.filePath ?? "");
    switch (input.tool) {
      case "shell":
      case "bash":
        return { kind: "command", command: String(args.command ?? "") };
      case "write":
        return { kind: "write", path, content: String(args.content ?? ""), whole: true };
      case "edit":
        return {
          kind: "write",
          path,
          content: String(args.newString ?? ""),
          edits: [edit(args.oldString, args.newString, args.replaceAll)],
        };
      case "patch":
      case "apply_patch":
        return patchAction(String(args.patchText ?? args.patch ?? args.input ?? ""));
      default:
        return null;
    }
  }
  return null;
}

// Guard names are file names in the guards folder, never paths.
const GUARD_NAME = /^[\w-]+$/;

// Runs the named guards from `dir`. The first guard that blocks wins. A guard that fails to load or
// throws is skipped with a warning and listed in `failed`, so the others still run.
export async function runGuards(action, names, dir) {
  const warnings = [];
  const failed = [];
  for (const guardName of names) {
    if (typeof guardName !== "string" || !GUARD_NAME.test(guardName)) {
      warnings.push(`Guard ${JSON.stringify(guardName)} in config.json isn't a guard name (letters, digits, - and _ only).`);
      failed.push(String(guardName));
      continue;
    }
    const file = join(dir, `${guardName}.mjs`);
    if (!existsSync(file)) {
      warnings.push(`Guard "${guardName}" is listed in config.json but ${file} doesn't exist.`);
      continue;
    }
    try {
      const guard = await import(pathToFileURL(file).href);
      const result = guard.check(action);
      if (result.block) return { block: true, reason: `[${guardName}] ${result.reason}`, warnings, failed };
    } catch (error) {
      warnings.push(`Guard "${guardName}" failed: ${error.message}`);
      failed.push(guardName);
    }
  }
  return { block: false, warnings, failed };
}

// When the guards can't do their job: block a commit, allow anything else. Both say why.
function failSafe(action, problem, warnings = []) {
  const message = `Groundwork: ${problem} Fix it, or run \`npx groundwork-ai doctor\`.`;
  if (isCommit(action)) {
    return { block: true, reason: `${message} Commits are blocked until the guards can run.`, warnings };
  }
  return { block: false, warnings: [...warnings, message] };
}

// Reads .groundwork/config.json next to the guards folder. Missing means no guards.
function readConfig(guardsDir) {
  const path = join(guardsDir, "..", "config.json");
  if (!existsSync(path)) return {};
  return parseJson(readFileSync(path, "utf8"));
}

// Everything a tool's hook needs: its input in, { block, reason, warnings } out.
// `guardsDir` is the project's .groundwork/guards folder.
export async function evaluate(tool, input, guardsDir) {
  const action = toAction(tool, input);
  if (!action) return { block: false, warnings: [] };

  let config;
  let guards;
  try {
    config = readConfig(guardsDir);
    guards = config.guards ?? [];
    if (!Array.isArray(guards)) throw new Error('"guards" isn\'t a list');
  } catch (error) {
    return failSafe(action, `.groundwork/config.json can't be read (${error.message}).`);
  }

  // Built in, and not listed in `guards`, so editing that list can't remove them. Switching them off
  // takes `enforce` in config.json, which protectHarness keeps the agent from changing.
  const project = resolve(guardsDir, "..", "..");
  const enforce = config.enforce ?? {};
  try {
    const { protectHarness } = await import("./lib/harness.mjs");
    const { commitGate } = await import("./lib/commit-gate.mjs");
    if (enforce.protectHarness !== false) {
      const result = protectHarness(action, project);
      if (result.block) return { block: true, reason: `[protect-harness] ${result.reason}`, warnings: [] };
    }
    if (enforce.commitGate !== false && isCommit(action)) {
      const result = commitGate(action, { project, config, tool });
      if (result.block) return { block: true, reason: `[commit-gate] ${result.reason}`, warnings: [] };
    }
  } catch (error) {
    return failSafe(action, `Groundwork's built-in checks couldn't run (${error.message}).`);
  }
  if (guards.length === 0) return { block: false, warnings: [] };

  const result = await runGuards(action, guards, guardsDir);
  if (result.block || result.failed.length === 0) return result;
  return failSafe(action, `guard ${result.failed.map((n) => `"${n}"`).join(", ")} couldn't run.`, result.warnings);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const tool = process.argv[2] ?? "claude-code";
  let input;
  try {
    const raw = readStdin();
    if (!raw.trim()) return 0;
    input = parseJson(raw);
  } catch {
    return 0; // not a hook input we understand, so there's nothing to guard
  }

  const { block, reason, warnings } = await evaluate(tool, input, here);
  for (const warning of warnings) process.stderr.write(`${warning}\n`);
  if (block) {
    process.stderr.write(`${reason}\n`);
    return 2;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}

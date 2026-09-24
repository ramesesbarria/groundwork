#!/usr/bin/env node
// Groundwork guard runner. Adapters call it from their tool's hook, e.g. for Claude Code:
//   node .groundwork/guards/run.mjs claude-code   (hook input as JSON on stdin)
// It runs the guards listed under "guards" in .groundwork/config.json.
// Exit code 2 blocks the action (Claude Code shows stderr to the model); 0 allows it.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// A tool's hook input → a Groundwork action, or null if guards don't apply.
//   { kind: "command", command }  or  { kind: "write", path, content }
export function toAction(tool, input) {
  if (tool === "claude-code") {
    const args = input.tool_input ?? {};
    switch (input.tool_name) {
      case "Bash":
        return { kind: "command", command: String(args.command ?? "") };
      case "Write":
        return { kind: "write", path: String(args.file_path ?? ""), content: String(args.content ?? "") };
      case "Edit":
        return { kind: "write", path: String(args.file_path ?? ""), content: String(args.new_string ?? "") };
      case "MultiEdit":
        return {
          kind: "write",
          path: String(args.file_path ?? ""),
          content: (args.edits ?? []).map((e) => e.new_string ?? "").join("\n"),
        };
      default:
        return null;
    }
  }
  if (tool === "opencode") {
    // OpenCode tool names and arguments: opencode.ai/docs/tools. apply_patch isn't covered yet.
    const args = input.args ?? {};
    switch (input.tool) {
      case "bash":
        return { kind: "command", command: String(args.command ?? "") };
      case "write":
        return { kind: "write", path: String(args.filePath ?? ""), content: String(args.content ?? "") };
      case "edit":
        return { kind: "write", path: String(args.filePath ?? ""), content: String(args.newString ?? "") };
      default:
        return null;
    }
  }
  return null;
}

// Runs the named guards from `dir`. The first guard that blocks wins.
export async function runGuards(action, names, dir) {
  const warnings = [];
  for (const guardName of names) {
    const file = join(dir, `${guardName}.mjs`);
    if (!existsSync(file)) {
      warnings.push(`Guard "${guardName}" is listed in config.json but ${file} doesn't exist.`);
      continue;
    }
    const guard = await import(pathToFileURL(file).href);
    const result = guard.check(action);
    if (result.block) return { block: true, reason: `[${guardName}] ${result.reason}`, warnings };
  }
  return { block: false, warnings };
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
  const configPath = join(here, "..", "config.json");
  const guards = existsSync(configPath) ? (JSON.parse(readFileSync(configPath, "utf8")).guards ?? []) : [];
  if (guards.length === 0) return 0;

  const tool = process.argv[2] ?? "claude-code";
  const raw = readStdin();
  const action = raw ? toAction(tool, JSON.parse(raw)) : null;
  if (!action) return 0;

  const { block, reason, warnings } = await runGuards(action, guards, here);
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

// Built-in check: the agent can't switch off or weaken Groundwork's own setup. It runs before the
// guards in config.json and isn't listed there, so it can't be removed by editing that list.
//
// The human can change any of these files in their own editor: guards only see the agent's tool
// calls. What an agent may still do: add guards, change other config values, create new guard
// files, and edit anything while setup hasn't finished.
//
// It stops accidental and lazy changes and makes deliberate ones visible. A determined agent with a
// shell can still find a way around it; that's what `groundwork check` in CI is for.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const parseJson = (text) => JSON.parse(text.replace(/^﻿/, ""));

// Files an agent may not change once they exist.
const LOCKED = [/^\.groundwork\/guards\//, /^\.groundwork\/hooks\//];
// The agent never writes plugin files: a plugin runs inside the tool's own process, where no guard
// can see what it does.
const PLUGINS = /^\.opencode\/plugins\//;
const APPROVALS = /^\.groundwork\/\.approvals\//;
const SETTINGS = /^\.claude\/settings(\.local)?\.json$/;
const CONFIG = ".groundwork/config.json";

// Shell commands that name one of these files and change or delete something.
const NAMES_HARNESS = /\.groundwork[\\/](guards|hooks|\.approvals|config\.json)|\.claude[\\/]settings|\.opencode[\\/]plugins/;
const WRITES = /(>|\brm\b|\bmv\b|\bcp\b|\btee\b|\bsed\s+-i|\bperl\s+-[a-z]*i|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|writeFile|rmSync|unlink|\bgit\s+(checkout|restore|rm|clean)\b)/;
const UNINSTALL = /\bgroundwork(-ai)?(@[\w.-]+)?\s+uninstall\b/;
// `groundwork mode <mode>` switches approval; only the human runs it (back to per-card is fine).
const MODE_SWITCH = /\bgroundwork(-ai)?(@[\w.-]+)?\s+mode\s+(per-phase|at-end)\b/;

const ASK = "Only the human changes Groundwork's own setup. Tell them what you wanted to change and why, and ask them to make the change themselves.";

function projectPath(project, path) {
  return relative(project, resolve(project, path)).split(sep).join("/");
}

// What a file will contain after this write, or undefined if that can't be worked out.
function after(action, abs) {
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (action.edits) {
    let text = current;
    for (const { old, new: next, all } of action.edits) {
      if (!text.includes(old)) return undefined;
      text = all ? text.split(old).join(next) : text.replace(old, () => next);
    }
    return text;
  }
  if (action.whole) return action.content;
  return undefined;
}

// What a config change gives up. [] means it's safe.
export function weakenedConfig(before, next) {
  const lost = [];
  const guards = new Set(next.guards ?? []);
  for (const name of before.guards ?? []) if (!guards.has(name)) lost.push(`remove the "${name}" guard`);
  for (const key of ["commitGate", "protectHarness"]) {
    if ((before.enforce ?? {})[key] !== false && (next.enforce ?? {})[key] === false) lost.push(`turn off enforce.${key}`);
  }
  // The agent may only make approval stricter (back to per-card). Any other switch is the human's.
  const mode = before.approvalMode ?? "per-card";
  if (next.approvalMode !== undefined && next.approvalMode !== mode && next.approvalMode !== "per-card") {
    lost.push(`switch approvalMode to ${next.approvalMode}, which changes when you approve the work`);
  }
  if (before.autoCommit === false && next.autoCommit !== false) lost.push("turn automatic commits back on, which you turned off");
  if (before.setup === "done" && next.setup !== "done") lost.push("mark setup as not done");
  return lost;
}

function checkConfig(action, abs) {
  let before;
  try {
    before = existsSync(abs) ? parseJson(readFileSync(abs, "utf8")) : {};
  } catch {
    return { block: false }; // already broken: the runner blocks commits until the human fixes it
  }
  if (before.setup !== "done") return { block: false }; // setup is still writing it
  const text = after(action, abs);
  if (text === undefined) return { block: true, reason: `This edits ${CONFIG} in a way Groundwork can't check. ${ASK}` };
  let next;
  try {
    next = parseJson(text);
  } catch {
    return { block: true, reason: `This would leave ${CONFIG} as invalid JSON, which stops guards and blocks every commit. Fix the edit.` };
  }
  const lost = weakenedConfig(before, next);
  if (lost.length === 0) return { block: false };
  return { block: true, reason: `This change to ${CONFIG} would ${lost.join(" and ")}. ${ASK}` };
}

function checkSettings(action, abs, rel) {
  const text = after(action, abs);
  if (text === undefined) return { block: true, reason: `This edits ${rel} in a way Groundwork can't check. ${ASK}` };
  let next;
  try {
    next = text.trim() === "" ? {} : parseJson(text);
  } catch {
    return { block: true, reason: `This would leave ${rel} as invalid JSON, which switches off Groundwork's hooks. Fix the edit.` };
  }
  if (next.disableAllHooks === true) return { block: true, reason: `This would switch off every hook, Groundwork's guards included. ${ASK}` };
  if (!rel.endsWith("settings.json")) return { block: false };
  let before = {};
  try {
    before = existsSync(abs) ? parseJson(readFileSync(abs, "utf8")) : {};
  } catch {
    return { block: false };
  }
  const commands = (s) =>
    Object.values(s.hooks ?? {})
      .flat()
      .flatMap((entry) => (entry?.hooks ?? []).map((h) => h?.command ?? ""))
      .filter((c) => c.includes(".groundwork/"));
  const kept = new Set(commands(next));
  if (commands(before).every((c) => kept.has(c))) return { block: false };
  return { block: true, reason: `This would take Groundwork's hooks out of ${rel}, so guards and session start stop running. ${ASK}` };
}

function checkWrite(action, project) {
  for (const path of action.paths ?? [action.path]) {
    if (!path) continue;
    const rel = projectPath(project, path);
    const abs = resolve(project, path);
    if (APPROVALS.test(rel)) {
      return { block: true, reason: "Approvals are recorded from the human's own messages, never written by the agent." };
    }
    if (PLUGINS.test(rel)) {
      return { block: true, reason: `${rel} is inside Groundwork's OpenCode plugin folder, which runs outside the guards. ${ASK}` };
    }
    if (LOCKED.some((re) => re.test(rel)) && existsSync(abs)) {
      return { block: true, reason: `${rel} is part of Groundwork's guards and hooks. ${ASK}` };
    }
    const one = action.paths && action.paths.length > 1 ? { kind: "write", path } : action;
    const result = rel === CONFIG ? checkConfig(one, abs) : SETTINGS.test(rel) ? checkSettings(one, abs, rel) : { block: false };
    if (result.block) return result;
  }
  return { block: false };
}

function checkCommand(action) {
  const command = action.command;
  if (UNINSTALL.test(command)) return { block: true, reason: `Uninstalling Groundwork is the human's call. ${ASK}` };
  if (MODE_SWITCH.test(command)) {
    return { block: true, reason: `Changing when the human approves is their call. Give them the exact command to run themselves, e.g. \`! ${command.trim()}\` in Claude Code.` };
  }
  if (/^\s*git\s+(commit|add|status|diff|log|show)\b/.test(command) && !/[;&|]/.test(command)) return { block: false };
  if (NAMES_HARNESS.test(command) && WRITES.test(command)) {
    return { block: true, reason: `This shell command changes Groundwork's own files (guards, hooks, approvals, config or settings). ${ASK}` };
  }
  return { block: false };
}

export function protectHarness(action, project) {
  if (action.kind === "write") return checkWrite(action, project);
  if (action.kind === "command") return checkCommand(action);
  return { block: false };
}

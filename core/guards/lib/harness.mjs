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
const LOCKED = [/^\.groundwork\/guards(\/|$)/, /^\.groundwork\/hooks(\/|$)/];
const LEGACY_MANIFEST = /^\.groundwork\/\.legacy-cards\.json$/;
// The agent never writes plugin files: a plugin runs inside the tool's own process, where no guard
// can see what it does.
const PLUGINS = /^\.opencode\/plugins(\/|$)/;
const APPROVALS = /^\.groundwork\/\.approvals(\/|$)/;
const SETTINGS = /^\.claude\/settings(\.local)?\.json$/;
const CONFIG = ".groundwork/config.json";

const UNINSTALL = /\bgroundwork(-ai)?(@[\w.-]+)?\s+uninstall\b/;
// The legacy migration is a one-time human decision: it exempts old cards from the approval rule.
const MIGRATE = /\b(?:npm|npx|pnpm|yarn|node|bun|groundwork(?:-ai)?)\b[^\n;&|]*\bmigrate\b/i;
// `groundwork mode <mode>` switches approval; only the human runs it (back to per-card is fine).
const MODE_SWITCH = /\bgroundwork(-ai)?(@[\w.-]+)?\s+mode\s+(per-phase|at-end)\b/;
// Running the prompt hook directly would let an agent write its own approval record.
const APPROVAL_HOOK = /\b(?:node|bun)\b[^\n;&|]*\buser-prompt\.mjs\b/i;
const COMMIT = /\bgit\b[\s\S]*\bcommit\b/;
const PROTECTED_COMMIT_WRITE = /^\.groundwork\/(?:cards|evidence|work|\.approvals|spec\.md|decisions)(?:\/|$)|^\.groundwork\/private(?:\/|$)|^\.groundwork\/\.legacy-cards\.json$/;

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
  // PR integration hands approval to PR review and drops the local approval gate. Going back to local
  // is stricter; any other switch is the human's.
  const integration = before.integration ?? "local";
  if (next.integration !== undefined && next.integration !== integration && next.integration !== "local") {
    lost.push(`switch integration to ${next.integration}, which drops the local approval gate`);
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
    const key = rel.toLowerCase();
    const abs = resolve(project, path);
    if (APPROVALS.test(key)) {
      return { block: true, reason: "Approvals are recorded from the human's own messages, never written by the agent." };
    }
    if (PLUGINS.test(key)) {
      return { block: true, reason: `${rel} is inside Groundwork's OpenCode plugin folder, which runs outside the guards. ${ASK}` };
    }
    if (LOCKED.some((re) => re.test(key)) && existsSync(abs)) {
      return { block: true, reason: `${rel} is part of Groundwork's guards and hooks. ${ASK}` };
    }
    if (LEGACY_MANIFEST.test(key)) {
      return { block: true, reason: `The legacy-card migration record is the human's one-time decision. Run \`groundwork migrate legacy\` yourself. ${ASK}` };
    }
    const one = action.paths && action.paths.length > 1 ? { kind: "write", path } : action;
    const result = key === CONFIG ? checkConfig(one, abs) : SETTINGS.test(key) ? checkSettings(one, abs, rel) : { block: false };
    if (result.block) return result;
  }
  return { block: false };
}

// Shell commands that change their file arguments. `git` is checked by subcommand below; `sed` and
// `perl` only count when they edit in place; copy verbs write only their last argument (the
// destination). Everything else is a read, as far as their text shows.
const WRITE_COMMANDS = new Set(["rm", "rmdir", "rd", "unlink", "mv", "tee", "del", "erase", "move", "ren", "rename", "set-content", "add-content", "out-file", "remove-item", "move-item", "rename-item", "truncate"]);
const COPY_COMMANDS = new Set(["cp", "copy", "copy-item"]);
const GIT_WRITES = new Set(["clean", "rm", "mv", "checkout", "restore"]);

// Node fs calls that write the path in their first string argument.
const NODE_WRITES = /\b(?:writeFileSync|appendFileSync|writeFile|appendFile|rmSync|rm|unlinkSync|unlink|createWriteStream)\s*\(\s*(["'`])([^"'`]+)\1/g;

const unquote = (token) => token.replace(/^(['"])(.*)\1$/, "$2");
const fileArgs = (args) => args.filter((a) => a && !a.startsWith("-")).map(unquote);

// The paths a shell command may write, from its text: redirect targets, the file arguments of
// commands that write, and Node's fs write calls. Reads and redirects aimed at other files don't
// appear, so they can't block. Exported so the tests can pin the parsing.
export function commandWriteTargets(command) {
  const targets = [];
  for (let i = 0; i < command.length; i++) {
    if (command[i] !== ">") continue;
    const before = command[i - 1];
    if (before === "=" || before === "<") continue; // => in code, and <> read-write handles
    let j = i + 1;
    if (command[j] === ">") j += 1; // >>
    while (command[j] === " " || command[j] === "\t") j += 1;
    const quote = command[j] === '"' || command[j] === "'" ? command[j] : "";
    if (!quote && (command[j] === undefined || command[j] === "&" || command[j] === "|")) continue; // 2>&1, >|
    if (quote) j += 1;
    let target = "";
    while (j < command.length && (quote ? command[j] !== quote : !/[\s;&|<>]/.test(command[j]))) target += command[j++];
    if (target) targets.push(target);
  }
  for (const segment of command.split(/[;&|\n]/)) {
    const words = segment.trim().split(/\s+/).filter(Boolean);
    let k = 0;
    while (k < words.length && /^[A-Za-z_]\w*=/.test(words[k])) k += 1; // skip VAR=value prefixes
    const name = (words[k] ?? "").toLowerCase();
    const args = words.slice(k + 1);
    if (name === "git") {
      if (GIT_WRITES.has((args[0] ?? "").toLowerCase())) targets.push(...fileArgs(args.slice(1)));
    } else if (name === "sed" || name === "perl") {
      if (args.some((a) => /^-[a-z]*i/.test(a) || a.startsWith("--in-place"))) targets.push(...fileArgs(args));
    } else if (COPY_COMMANDS.has(name)) {
      const destination = fileArgs(args).at(-1); // cp reads its sources; only the last argument is the write
      if (destination) targets.push(destination);
    } else if (WRITE_COMMANDS.has(name)) {
      targets.push(...fileArgs(args));
    }
  }
  for (const match of command.matchAll(NODE_WRITES)) targets.push(match[2]);
  return targets;
}

// Whether setup has finished. Until it has, the agent writes config.json freely, the same way the
// Write and Edit tools already may; after, shell edits to it are the human's. A config that can't
// be read counts as done, so a broken one can't open the door.
function setupIsDone(project) {
  try {
    const file = resolve(project, CONFIG);
    const config = existsSync(file) ? parseJson(readFileSync(file, "utf8")) : {};
    return config.setup === "done";
  } catch {
    return true;
  }
}

function checkCommand(action, project) {
  const command = action.command;
  if (UNINSTALL.test(command)) return { block: true, reason: `Uninstalling Groundwork is the human's call. ${ASK}` };
  if (MIGRATE.test(command)) {
    return { block: true, reason: `Recording legacy-card exemptions is the human's one-time decision. Run \`groundwork migrate legacy\` yourself. ${ASK}` };
  }
  if (APPROVAL_HOOK.test(command)) {
    return { block: true, reason: "Approvals are recorded from the human's own messages, never by the agent. Ask the human to run /gw-approve." };
  }
  if (/\bgit\b[^\n;&|]*\bupdate-index\b/.test(command)) {
    return { block: true, reason: `Changing Git's index flags would hide a staged change from the commit gate. ${ASK}` };
  }
  if (COMMIT.test(command)) {
    const protectedTarget = commandWriteTargets(command).find((target) => PROTECTED_COMMIT_WRITE.test(projectPath(project, target).toLowerCase()));
    if (protectedTarget) {
      return {
        block: true,
        reason: `A commit command can't change card, evidence, knowledge or private files in the same step (${protectedTarget}). Change the card first, then commit in a separate step.`,
      };
    }
    const file = command.match(/(?:^|\s)(?:-F|--file)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
    if (file) {
      const path = (file[1] ?? file[2] ?? file[3]).replace(/\\/g, "/");
      if (/\bcd\s|[^-]\b-C\b/.test(command)) {
        return { block: true, reason: "Commit message files must be read from the project folder. Run the commit as a separate step without cd or git -C." };
      }
      const written = commandWriteTargets(command).some((target) => target.replace(/\\/g, "/") === path);
      if (written) return { block: true, reason: "A commit command can't write its own message file in the same step. Write it first, then commit." };
    }
  }
  if (/\bgit\b[^\n;&|]*\badd\b/i.test(command) && /\.groundwork[\\/]private[\\/]/i.test(command)) {
    return { block: true, reason: "Groundwork's private files must stay out of git. Don't stage them." };
  }
  if (MODE_SWITCH.test(command)) {
    return { block: true, reason: `Changing when the human approves is their call. Give them the exact command to run themselves, e.g. \`! ${command.trim()}\` in Claude Code.` };
  }
  const setupDone = setupIsDone(project);
  for (const target of commandWriteTargets(command)) {
    const rel = projectPath(project, target).toLowerCase();
    const locked = APPROVALS.test(rel) || LOCKED.some((re) => re.test(rel)) || PLUGINS.test(rel) || SETTINGS.test(rel) || LEGACY_MANIFEST.test(rel);
    const configAfterSetup = rel === CONFIG && setupDone; // setup writing its own config isn't the agent changing the harness
    if (locked || configAfterSetup) {
      return { block: true, reason: `This shell command changes Groundwork's own files (guards, hooks, approvals, config or settings). ${ASK}` };
    }
  }
  return { block: false };
}

export function protectHarness(action, project) {
  if (action.kind === "write") return checkWrite(action, project);
  if (action.kind === "command") return checkCommand(action, project);
  return { block: false };
}

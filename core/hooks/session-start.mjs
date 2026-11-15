#!/usr/bin/env node
// Groundwork session start. Adapters call it when a session starts, resumes, is cleared or compacted:
//   node .groundwork/hooks/session-start.mjs [project folder] [tool name]     (default: the current folder)
// It prints the project brief as plain text: the handoff, how far it can be trusted against the
// repository, the decisions in force, the rules, and the map, inside the brief's token budget. It is
// what `groundwork brief` prints. Outside a Groundwork project it prints nothing, and it never fails.
//
// A tool that passes hook input as JSON on stdin (a session id, a model name, why the session
// started) has it remembered, so later checkpoints can say who wrote the handoff.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { brief } from "../lib/brief.mjs";
import { cacheForThisProcess } from "../lib/git.mjs";
import { readState, writeState } from "../lib/memory.mjs";

// The brief for a project folder, or "" if it doesn't use Groundwork.
export async function orientation(projectDir, options = {}) {
  if (!existsSync(join(projectDir, ".groundwork"))) return "";
  try {
    const { text } = await brief(projectDir, options);
    return options.source === "compact" ? `${text}\n\nContext was just compacted: trust this memory over what you recall of the conversation, and save the handoff now if it is behind.` : text;
  } catch (error) {
    return `Groundwork: the project brief couldn't be built (${error.message}). Read .groundwork/HANDOFF.md, and run \`npx groundwork-ai doctor\`.`;
  }
}

function hookInput() {
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
  } catch {
    return {};
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    cacheForThisProcess(); // one short process: ask git each question once
    const project = process.argv[2] || process.cwd();
    const tool = process.argv[3];
    const input = hookInput();
    const session = input.session_id ?? input.sessionID;
    const model = typeof input.model === "string" ? input.model : (input.model?.id ?? input.model?.display_name);
    const groundwork = join(project, ".groundwork");
    if (existsSync(groundwork) && (session || model)) {
      const state = readState(groundwork);
      writeState(groundwork, { ...state, session, tool, model: model ?? (state.session === session ? state.model : undefined), at: new Date().toISOString() });
    }
    const text = await orientation(project, { source: input.source });
    if (text) process.stdout.write(`${text}\n`);
  } catch {
    // a session must start even when its memory can't be read
  }
}

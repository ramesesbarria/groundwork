#!/usr/bin/env node
// Runs each time the human sends a message; adapters wire it to their tool's user-prompt hook, which
// the agent's own actions never trigger. A bare approval phrase is not enough: only the explicit
// `/gw-approve` command records approval, and the record is bound to the reviewed card, HEAD, code,
// card content and evidence. `/gw-reject` records a rejection and clears approval. Any other human
// message clears approval as well, so an ordinary "looks good" or "go ahead" cannot be used later.
//
//   node .groundwork/hooks/user-prompt.mjs <project-dir>   (hook input as JSON on stdin)
//
// Adapters without a separate hook process import recordHuman instead. It prints nothing
// (a tool may add a hook's output to the conversation) and never fails the prompt.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  approvalPath,
  approvalTarget,
  cardFingerprint,
  evidenceFingerprints,
  head,
  workFingerprint,
} from "../guards/lib/approval.mjs";

function writeRecord(project, record) {
  const dir = join(project, ".groundwork", ".approvals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(approvalPath(project), JSON.stringify(record, null, 2) + "\n");
}

// Records one human message. Best effort: on any failure the gate asks for a fresh explicit approval.
export function recordHuman(project, prompt) {
  const text = String(prompt ?? "");
  const approve = text.match(/^\s*\/gw-approve\b\s*([\d.]*)/);
  const reject = text.match(/^\s*\/gw-reject\b\s*([\d.]*)/);
  const base = { head: head(project), at: new Date().toISOString(), approves: null };
  try {
    if (approve) {
      const target = approvalTarget(project, approve[1] || undefined);
      if (!target) {
        writeRecord(project, { ...base, error: "No single awaiting-approval card was found for /gw-approve." });
        return;
      }
      writeRecord(project, {
        ...base,
        approves: target.id,
        card: cardFingerprint(target.md),
        work: workFingerprint(project),
        evidence: evidenceFingerprints(project, target.md),
      });
      return;
    }
    if (reject) {
      writeRecord(project, { ...base, rejects: reject[1] || "current" });
      return;
    }
    writeRecord(project, base);
  } catch {
    // Recording is best effort; the gate then asks for a fresh explicit approval.
  }
}

function main() {
  const project = process.argv[2] ?? process.cwd();
  let prompt = "";
  try {
    const input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
    prompt = String(input.prompt ?? "");
  } catch {
    // no input we understand: still record that the human spoke, which clears approval
  }
  recordHuman(project, prompt);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();

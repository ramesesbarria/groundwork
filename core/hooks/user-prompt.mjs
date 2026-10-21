#!/usr/bin/env node
// Runs each time the human sends a message; adapters wire it to their tool's user-prompt hook, which
// the agent's own actions never trigger. A bare approval phrase is not enough: only the explicit
// `/gw-approve` command records approval, and the record is bound to the reviewed card, HEAD, code,
// card content, evidence, spec, decisions and declared context. `/gw-reject` records a rejection and
// clears approval. Any other human
// message clears approval as well, so an ordinary "looks good" or "go ahead" cannot be used later.
//
// The command must open the message: its first line is `/gw-approve` followed only by card IDs (or
// `all`). A command quoted or mentioned further down, or followed by other words, approves nothing.
// A tool that delivers a custom command as its expanded template gets one from Groundwork's adapter
// that starts with the command line itself. This tells a typed or invoked command from conversation; it can't prove who
// typed it.
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
  approvalTargets,
  cardFingerprint,
  evidenceFingerprints,
  head,
  knowledgeFingerprint,
  workFingerprint,
} from "../guards/lib/approval.mjs";

function writeRecord(project, record) {
  const dir = join(project, ".groundwork", ".approvals");
  mkdirSync(dir, { recursive: true });
  writeFileSync(approvalPath(project), JSON.stringify(record, null, 2) + "\n");
}

// Records one human message. Best effort: on any failure the gate asks for a fresh explicit approval.
export function recordHuman(project, prompt) {
  // Some shells pass a quoted argument through with its quotes; they aren't part of the command.
  const text = String(prompt ?? "").trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
  const first = text.split(/\r?\n/, 1)[0].trim();
  const approve = first.match(/^\/gw-approve\b(.*)$/);
  const reject = first.match(/^\/gw-reject\b\s*([\d.]*)/);
  const base = { head: head(project), at: new Date().toISOString(), approves: null };
  try {
    if (approve) {
      const args = approve[1].trim();
      const all = /^all$/i.test(args);
      const words = args.split(/[\s,]+/).filter(Boolean);
      const ids = [...new Set(words.filter((word) => /^\d+(?:\.\d+)+$/.test(word)))];
      if (args && !all && (ids.length === 0 || words.some((word) => !/^\d+(?:\.\d+)+$/.test(word)))) {
        writeRecord(project, { ...base, error: "Use /gw-approve <card-id>, /gw-approve <id...>, or /gw-approve all." });
        return;
      }
      const targets = all ? approvalTargets(project, "all") : ids.length > 0 ? ids.flatMap((id) => approvalTargets(project, id)) : approvalTargets(project, undefined);
      if ((ids.length > 0 && targets.length !== ids.length) || targets.length === 0) {
        writeRecord(project, { ...base, error: "No awaiting-approval card was found for every /gw-approve id." });
        return;
      }
      const records = targets.map((target) => ({
        id: target.id,
        card: cardFingerprint(target.md),
        knowledge: knowledgeFingerprint(project, target.id),
        evidence: evidenceFingerprints(project, target.md),
      }));
      const common = {
        ...base,
        approves: targets.length === 1 ? targets[0].id : records.map((record) => record.id),
        work: workFingerprint(project),
      };
      if (targets.length === 1) {
        const [record] = records;
        writeRecord(project, { ...common, card: record.card, knowledge: record.knowledge, evidence: record.evidence });
      } else {
        writeRecord(project, {
          ...common,
          cards: Object.fromEntries(records.map((record) => [record.id, {
            card: record.card,
            knowledge: record.knowledge,
            evidence: record.evidence,
          }])),
        });
      }
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

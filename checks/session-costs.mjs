#!/usr/bin/env node
// Where a run's tokens went, from OpenCode session exports.
//
//   opencode session export <session-id> > main.json      (run inside the project folder)
//   node checks/session-costs.mjs main.json tester-1.1.json ...
//
// For each session: model calls, the context at the first and largest call, how much context was
// re-read in total, fresh tokens and cost. A session with several human turns is also split per
// turn, so work that wasn't building (an export, a deploy) can be told apart.
// "Context" per call is input + cache read: everything the model was sent for that call.

import { readFileSync } from "node:fs";

const n = (x) => x.toLocaleString("en-US");
const usd = (x) => `$${x.toFixed(4)}`;
const contextOf = (m) => m.tokens.input + m.tokens.cache.read;

function summarize(file) {
  const { info, messages } = JSON.parse(readFileSync(file, "utf8"));
  const calls = messages.filter((m) => m.type === "assistant" && m.tokens);
  const contexts = calls.map(contextOf);
  const t = info.tokens;

  const turns = [];
  for (const m of messages) {
    if (m.type === "user") turns.push({ ask: (m.text ?? "").split("\n")[0].slice(0, 60), calls: 0, cost: 0, fresh: 0, first: 0, last: 0 });
    else if (m.type === "assistant" && m.tokens && turns.length > 0) {
      const turn = turns.at(-1);
      if (turn.calls === 0) turn.first = contextOf(m);
      turn.last = contextOf(m);
      turn.calls += 1;
      turn.cost += m.cost ?? 0;
      turn.fresh += m.tokens.input + m.tokens.output + m.tokens.reasoning;
    }
  }

  return {
    title: info.title,
    agent: info.agent,
    calls: calls.length,
    first: contexts[0] ?? 0,
    peak: Math.max(0, ...contexts),
    reread: contexts.reduce((a, b) => a + b, 0),
    fresh: t.input + t.output + t.reasoning,
    reasoning: t.reasoning,
    cost: info.cost,
    turns,
  };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log("Usage: node checks/session-costs.mjs <opencode session export>.json ...");
  process.exit(1);
}

const sessions = files.map(summarize);
console.log("| Session | Agent | Calls | First context | Peak context | Context re-read | Fresh tokens | Reasoning | Cost |");
console.log("|---|---|---:|---:|---:|---:|---:|---:|---:|");
for (const s of sessions) {
  console.log(`| ${s.title} | ${s.agent} | ${s.calls} | ${n(s.first)} | ${n(s.peak)} | ${n(s.reread)} | ${n(s.fresh)} | ${n(s.reasoning)} | ${usd(s.cost)} |`);
}
const total = (key) => sessions.reduce((a, s) => a + s[key], 0);
console.log(`| **Total** | | ${total("calls")} | | | ${n(total("reread"))} | ${n(total("fresh"))} | ${n(total("reasoning"))} | ${usd(total("cost"))} |`);

for (const s of sessions.filter((s) => s.turns.length > 1)) {
  console.log(`\n${s.title}, per human turn:\n`);
  console.log("| Turn | Calls | Context at start → end | Fresh tokens | Cost |");
  console.log("|---|---:|---|---:|---:|");
  for (const t of s.turns) {
    console.log(`| ${t.ask.replace(/\|/g, "\\|")} | ${t.calls} | ${n(t.first)} → ${n(t.last)} | ${n(t.fresh)} | ${usd(t.cost)} |`);
  }
}

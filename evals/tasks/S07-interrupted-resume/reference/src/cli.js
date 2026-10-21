#!/usr/bin/env node
import { addEntry } from "./ledger.js";
import { parseAmount } from "./money.js";
import { renderReport } from "./report.js";
import { loadLedger, saveLedger } from "./store.js";

function flags(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].slice(2)] = args[i + 1];
  return out;
}

export function main(argv, env = process.env) {
  const [command, ...rest] = argv;
  const file = env.LEDGER_FILE ?? "ledger.json";
  const options = flags(rest);
  if (command === "add") {
    const description = options.description ?? options.desc ?? "";
    saveLedger(file, addEntry(loadLedger(file), { date: options.date, category: options.category, description, amount: parseAmount(options.amount) }));
    return "Added.";
  }
  if (command === "report") return renderReport(loadLedger(file), { date: options.date ?? new Date().toISOString().slice(0, 10) });
  throw new Error("Usage: node src/cli.js add|report");
}

if (process.argv[1]?.endsWith("cli.js")) {
  try {
    console.log(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

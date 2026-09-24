#!/usr/bin/env node
import { checkNode } from "./node-version.js";

// Check the Node version before loading the CLI, which needs Node 22.
const problem = checkNode(process.versions.node);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const { run } = await import("./index.js");
const { code, output } = await run(process.argv.slice(2));
(code === 0 ? console.log : console.error)(output);
process.exitCode = code;

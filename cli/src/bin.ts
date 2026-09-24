#!/usr/bin/env node
import { run } from "./index.js";

const { code, output } = run(process.argv.slice(2));
(code === 0 ? console.log : console.error)(output);
process.exitCode = code;

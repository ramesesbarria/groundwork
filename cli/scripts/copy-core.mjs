// npm pack/publish: ship the repo's core/ inside the package (as cli/core/), then clean up.
import { cpSync, rmSync } from "node:fs";

const target = new URL("../core/", import.meta.url);
rmSync(target, { recursive: true, force: true });
if (process.argv[2] !== "--clean") cpSync(new URL("../../core/", import.meta.url), target, { recursive: true });

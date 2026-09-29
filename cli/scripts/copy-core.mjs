// npm pack/publish: ship the repo's core/ inside the package (as cli/core/), and its LICENSE (npm only
// includes a LICENSE from the package folder), then clean both up.
import { cpSync, rmSync } from "node:fs";

const target = new URL("../core/", import.meta.url);
const license = new URL("../LICENSE", import.meta.url);
rmSync(target, { recursive: true, force: true });
rmSync(license, { force: true });
if (process.argv[2] !== "--clean") {
  cpSync(new URL("../../core/", import.meta.url), target, { recursive: true });
  cpSync(new URL("../../LICENSE", import.meta.url), license);
}

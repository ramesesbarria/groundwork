// Adapter files earlier versions generated and this one doesn't: the helper commands that 0.9 and
// earlier installed as native skills and OpenCode commands. Their command files stay in
// .groundwork/commands/, where /gw reads them. `upgrade` and `uninstall` remove an adapter file only
// when it is still exactly what Groundwork wrote; one the user changed stays, and is reported.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fingerprint, readManifest } from "./manifest.js";

export const RETIRED_HELPERS = ["gw-setup", "gw-spec", "gw-plan", "gw-next", "gw-handoff", "gw-quick", "gw-decide", "gw-ui-spec", "gw-retro"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// What every version from 0.3 to 0.9 generated for a helper, whatever its description said then.
const shapes = (name: string): Record<string, RegExp> => {
  const read = `Read \`\\.groundwork/commands/${escape(name)}\\.md\` now and follow it exactly\\.\n`;
  return {
    [`.claude/skills/${name}/SKILL.md`]: new RegExp(`^---\nname: ${escape(name)}\ndescription: [^\n]+\n(?:disable-model-invocation: true\n)?---\n${read}$`),
    [`.opencode/commands/${name}.md`]: new RegExp(`^---\ndescription: [^\n]+\n---\n${read}\nArguments: \\$ARGUMENTS\n$`),
  };
};

export interface RetiredFile {
  path: string;
  generated: boolean; // still exactly what Groundwork wrote, so it can go
}

// The retired helper files present in this project.
export function retiredHelperFiles(cwd: string): RetiredFile[] {
  const manifest = readManifest(cwd);
  return RETIRED_HELPERS.flatMap((name) =>
    Object.entries(shapes(name)).flatMap(([path, shape]) => {
      const abs = join(cwd, path);
      if (!existsSync(abs)) return [];
      const text = readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
      // The manifest knows what Groundwork last wrote; installs from before it get the shape check.
      const recorded = manifest?.files[path];
      const generated = recorded !== undefined ? recorded === fingerprint(text) : shape.test(text);
      return [{ path, generated }];
    }),
  );
}

export const keptHelperNote = (path: string) =>
  `${path} (you changed it; Groundwork no longer installs this helper natively, so delete it if you don't need it)`;

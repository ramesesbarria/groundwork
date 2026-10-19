// Upgrading files the user changed: their version is kept, the new one is offered as <file>.new, and a
// real merge keeps both the customization and working enforcement. The 0.9.0 OpenCode plugin is the
// realistic case: OpenCode 2.0.32 no longer loads its format.
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { run } from "../src/index.js";
import { fingerprint, MANIFEST } from "../src/manifest.js";

const PLUGIN = ".opencode/plugins/groundwork-guards.js";
const OLD_PLUGIN = readFileSync(new URL("./fixtures/opencode-plugin-0.9.0.js", import.meta.url), "utf8");
const CUSTOM = "// team: keep this line, it marks our audit build\n";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const yes = { ask: async () => "y" };
const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

// An OpenCode project as 0.9.0 left it: the old plugin on disk, and recorded as what Groundwork wrote.
async function project090(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "groundwork-merge-"));
  temps.push(dir);
  await run(["init", "--adapter", "opencode"], { cwd: dir, ...yes });
  writeFileSync(join(dir, PLUGIN), OLD_PLUGIN);
  const manifest = JSON.parse(read(dir, MANIFEST));
  manifest.files[PLUGIN] = fingerprint(OLD_PLUGIN);
  writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2));
  return dir;
}

const upgrade = (dir: string) => run(["upgrade", "--yes"], { cwd: dir, ...yes });
const doctor = (dir: string) => run(["doctor"], { cwd: dir, ...yes });

// Loads the project's active plugin against a stand-in for @opencode/plugin and returns its tool hook.
async function activeToolHook(dir: string) {
  const stub = join(dir, "node_modules/@opencode/plugin");
  mkdirSync(stub, { recursive: true });
  writeFileSync(join(stub, "package.json"), JSON.stringify({ name: "@opencode/plugin", type: "module", exports: "./index.js" }));
  writeFileSync(join(stub, "index.js"), "export const Plugin = { define: (definition) => definition };\n");
  const { default: plugin } = await import(`${pathToFileURL(join(dir, PLUGIN)).href}?${Date.now()}`);
  const hooks: Record<string, (input: unknown) => Promise<void>> = {};
  const register = (prefix: string) => async (name: string, callback: (input: unknown) => Promise<void>) => {
    hooks[`${prefix}.${name}`] = callback;
    return { dispose: async () => {} };
  };
  await plugin.setup({ tool: { hook: register("tool") }, session: { hook: register("session"), get: async () => ({}) } });
  return hooks["tool.execute.before"];
}

describe("upgrading files the user changed", () => {
  it("keeps a customized old plugin, flags it, and after a real merge keeps the edit and enforces", async () => {
    const dir = await project090();
    writeFileSync(join(dir, PLUGIN), CUSTOM + OLD_PLUGIN);

    const first = await upgrade(dir);
    expect(first.output).toMatch(/keep\s+\.opencode\/plugins\/groundwork-guards\.js/);
    expect(read(dir, PLUGIN)).toBe(CUSTOM + OLD_PLUGIN);
    expect(read(dir, `${PLUGIN}.new`)).toContain("Plugin.define(");
    const flagged = await doctor(dir);
    expect(flagged.code).toBe(1);
    expect(flagged.output).toMatch(/old OpenCode plugin format/);
    expect(flagged.output).toMatch(/groundwork-guards\.js\.new is waiting/);

    // The merge: the new version with the team's line on top, then the .new file goes.
    writeFileSync(join(dir, PLUGIN), CUSTOM + read(dir, `${PLUGIN}.new`));
    rmSync(join(dir, `${PLUGIN}.new`));

    const second = await upgrade(dir);
    expect(second.output).not.toMatch(/groundwork-guards/);
    expect(existsSync(join(dir, `${PLUGIN}.new`))).toBe(false);
    expect(read(dir, PLUGIN).startsWith(CUSTOM)).toBe(true);
    expect((await doctor(dir)).output).not.toMatch(/groundwork-guards/);

    const before = await activeToolHook(dir);
    await expect(before({ tool: "shell", input: { command: 'git commit -m "no card"' } })).rejects.toThrow(/commit-gate/);
    await expect(before({ tool: "shell", input: { command: "git status" } })).resolves.toBeUndefined();
  });

  it("keeps a merged core command on the next upgrade without offering it again", async () => {
    const dir = await project090();
    const command = ".groundwork/commands/gw-next.md";
    writeFileSync(join(dir, command), `${read(dir, command)}\nTeam note: run the linter before review.\n`);
    // An older recorded version, so this upgrade has a new one to offer.
    const manifest = JSON.parse(read(dir, MANIFEST));
    manifest.files[command] = fingerprint("an older gw-next");
    writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2));

    expect((await upgrade(dir)).output).toMatch(/keep\s+\.groundwork\/commands\/gw-next\.md/);
    const merged = `${read(dir, `${command}.new`)}\nTeam note: run the linter before review.\n`;
    writeFileSync(join(dir, command), merged);
    rmSync(join(dir, `${command}.new`));

    expect((await upgrade(dir)).output).not.toMatch(/gw-next/);
    expect(existsSync(join(dir, `${command}.new`))).toBe(false);
    expect(read(dir, command)).toBe(merged);
  });

  it("replaces a file reverted to what Groundwork last wrote, as the upgrade note says", async () => {
    const dir = await project090();
    writeFileSync(join(dir, PLUGIN), CUSTOM + OLD_PLUGIN);
    const first = await upgrade(dir);
    expect(first.output).toMatch(/remove your edit and run upgrade again/);

    writeFileSync(join(dir, PLUGIN), OLD_PLUGIN);
    rmSync(join(dir, `${PLUGIN}.new`));
    const second = await upgrade(dir);
    expect(second.output).toMatch(/replace\s+\.opencode\/plugins\/groundwork-guards\.js/);
    expect(read(dir, PLUGIN)).toContain("Plugin.define(");
    expect(existsSync(join(dir, `${PLUGIN}.new`))).toBe(false);
  });

  it("reports a pending .new until it is resolved", async () => {
    const dir = await project090();
    const role = ".groundwork/roles/reviewer.md";
    writeFileSync(join(dir, role), `${read(dir, role)}\nCheck the changelog too.\n`);
    const manifest = JSON.parse(read(dir, MANIFEST));
    manifest.files[role] = fingerprint("an older reviewer role");
    writeFileSync(join(dir, MANIFEST), JSON.stringify(manifest, null, 2));
    await upgrade(dir);
    expect((await doctor(dir)).output).toMatch(/\.groundwork\/roles\/reviewer\.md\.new is waiting/);
    rmSync(join(dir, `${role}.new`));
    expect((await doctor(dir)).output).not.toMatch(/reviewer\.md\.new/);
  });
});

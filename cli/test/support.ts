// Shared by the 2.0 tests: throwaway projects and git repositories.
import { afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/index.js";

export const coreDir = fileURLToPath(new URL("../../core/", import.meta.url));

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

export function tempDir(prefix = "groundwork-2-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

export const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// A git repository with one commit, on branch main.
export function repo(): string {
  const dir = tempDir();
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "test@example.com");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "config", "core.autocrlf", "false");
  commit(dir, "README.md", "# project\n", "chore: first commit");
  return dir;
}

export function write(dir: string, path: string, content: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

export const read = (dir: string, path: string) => readFileSync(join(dir, path), "utf8");

// Writes one file and commits it. Returns the new commit's hash.
export function commit(dir: string, path: string, content: string, message: string): string {
  write(dir, path, content);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
  return git(dir, "rev-parse", "HEAD");
}

export const noQuestions = async () => "";
export const cli = (dir: string, ...args: string[]) => run(args, { cwd: dir, ask: noQuestions });

// Installs Groundwork into `dir` and commits it, so later commits are the project's own.
export async function install(dir: string, { flow = false, adapter = "none" } = {}): Promise<string> {
  await cli(dir, "init", ...(flow ? ["--flow"] : []), "--adapter", adapter);
  try {
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: add Groundwork");
  } catch {
    // not a repository: nothing to commit
  }
  return dir;
}

export const frontmatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
      .split("\n")
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );

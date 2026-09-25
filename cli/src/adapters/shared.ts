// Helpers every adapter uses to read the core.
import type { CoreFiles } from "../core.js";
import { parseFrontmatter, sectionBody } from "../frontmatter.js";

// Quote a frontmatter value when it contains characters YAML would misread.
// JSON strings are valid YAML double-quoted strings.
export const yamlValue = (value: string) =>
  /^[\w(][^:#"{}\[\]&*!|>%@`]*$/.test(value) ? value : JSON.stringify(value);

const matching = (core: CoreFiles, prefix: string) =>
  Object.keys(core)
    .filter((path) => path.startsWith(prefix) && path.endsWith(".md"))
    .sort();

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".md".length);

export interface CoreCommand {
  name: string;
  description: string;
}

export const commandsOf = (core: CoreFiles): CoreCommand[] =>
  matching(core, "commands/").map((path) => ({
    name: baseName(path),
    description: parseFrontmatter(core[path]).description ?? "",
  }));

export interface CoreRole {
  name: string;
  description: string;
}

// A role's description is the first sentence of its "## Job" section.
export const rolesOf = (core: CoreFiles): CoreRole[] =>
  matching(core, "roles/").map((path) => {
    const name = baseName(path);
    const firstSentence = sectionBody(core[path], "Job").split(/(?<=\.)\s/)[0];
    return { name, description: `Groundwork ${name}. ${firstSentence}` };
  });

// Optional model per role, from `models` in .groundwork/config.json: one name for every tool, or one per
// adapter ({ "claude-code": "opus", "opencode": "anthropic/…" }), since each tool names models its own way.
export type ModelHints = Record<string, string | Record<string, string>>;

export function modelFor(hints: ModelHints | undefined, role: string, tool: string): string | undefined {
  const hint = hints?.[role];
  return typeof hint === "string" ? hint : hint?.[tool];
}

export const sortedByPath = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));

// Merging Groundwork's hook entries into a user's existing hook config: Claude Code's
// .claude/settings.json, Codex's .codex/hooks.json, Gemini CLI's .gemini/settings.json (all
// `{ matcher, hooks: [{ command }] }` entries) and Cursor's .cursor/hooks.json (flat `{ command }` entries).

export type HookEntry = { matcher?: string; command?: string; hooks?: { type?: string; command?: string }[] } & Record<string, unknown>;
export type Settings = { hooks?: Record<string, HookEntry[]> } & Record<string, unknown>;

// The commands an entry runs: its nested hooks', or its own (Cursor).
export const entryCommands = (entry: HookEntry): string[] =>
  entry.hooks !== undefined ? entry.hooks.map((h) => h.command ?? "") : entry.command !== undefined ? [entry.command] : [];

// A command Groundwork wrote: it runs something in .groundwork/, or the small script Cursor and Gemini CLI
// hooks go through (.cursor/hooks/groundwork.mjs, .gemini/hooks/groundwork.mjs).
export const isGroundworkCommand = (command: string) => command.includes(".groundwork/") || /\.(?:cursor|gemini)\/hooks\/groundwork\.mjs\b/.test(command);

const commandSet = (entries: HookEntry[]) => new Set(entries.flatMap(entryCommands));

// Pure: keeps everything the user has, and adds each of our hook entries whose command isn't there yet.
// An entry that holds only our commands is ours, so it's replaced with the current version (a newer
// Groundwork may widen its matcher). Entries the user wrote or added to are left alone.
export function mergeSettings(user: Settings, ours: Settings): Settings {
  const merged: Settings = { ...user, hooks: { ...(user.hooks ?? {}) } };
  // Top-level keys of ours the user's file lacks (Cursor's `version`).
  for (const [key, value] of Object.entries(ours)) if (key !== "hooks" && !(key in merged)) merged[key] = value;
  for (const [event, entries] of Object.entries(ours.hooks ?? {})) {
    const ourCommands = commandSet(entries);
    const isOurs = (entry: HookEntry) => entryCommands(entry).length > 0 && entryCommands(entry).every((c) => ourCommands.has(c));
    const existing = (merged.hooks![event] ?? []).map((entry) => {
      if (!isOurs(entry)) return entry;
      return entries.find((o) => entryCommands(o).some((c) => entryCommands(entry).includes(c))) ?? entry;
    });
    const have = commandSet(existing);
    const missing = entries.filter((entry) => entryCommands(entry).some((c) => !have.has(c)));
    merged.hooks![event] = [...existing, ...missing];
  }
  return merged;
}

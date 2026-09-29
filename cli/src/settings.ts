// Merging Groundwork's Claude Code settings into a user's existing .claude/settings.json.

type HookEntry = { matcher?: string; hooks?: { type?: string; command?: string }[] };
export type Settings ={ hooks?: Record<string, HookEntry[]> } & Record<string, unknown>;

const commandsOf = (entries: HookEntry[]) => new Set(entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command)));

// Pure: keeps everything the user has, and adds each of our hook entries whose command isn't there yet.
// An entry that holds only our commands is ours, so it's replaced with the current version (a newer
// Groundwork may widen its matcher). Entries the user wrote or added to are left alone.
export function mergeSettings(user: Settings, ours: Settings): Settings {
  const merged: Settings = { ...user, hooks: { ...(user.hooks ?? {}) } };
  for (const [event, entries] of Object.entries(ours.hooks ?? {})) {
    const ourCommands = commandsOf(entries);
    const isOurs = (entry: HookEntry) => (entry.hooks ?? []).length > 0 && (entry.hooks ?? []).every((h) => ourCommands.has(h.command));
    const existing = (merged.hooks![event] ?? []).map((entry) => {
      if (!isOurs(entry)) return entry;
      return entries.find((o) => (o.hooks ?? []).some((h) => (entry.hooks ?? []).some((e) => e.command === h.command))) ?? entry;
    });
    const have = commandsOf(existing);
    const missing = entries.filter((entry) => (entry.hooks ?? []).some((h) => !have.has(h.command)));
    merged.hooks![event] = [...existing, ...missing];
  }
  return merged;
}

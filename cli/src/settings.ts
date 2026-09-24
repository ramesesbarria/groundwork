// Merging Groundwork's Claude Code settings into a user's existing .claude/settings.json.

type HookEntry = { matcher?: string; hooks?: { type?: string; command?: string }[] };
type Settings = { hooks?: Record<string, HookEntry[]> } & Record<string, unknown>;

const commandsOf = (entries: HookEntry[]) => new Set(entries.flatMap((e) => (e.hooks ?? []).map((h) => h.command)));

// Pure: keeps everything the user has, and adds each of our hook entries whose command isn't there yet.
export function mergeSettings(user: Settings, ours: Settings): Settings {
  const merged: Settings = { ...user, hooks: { ...(user.hooks ?? {}) } };
  for (const [event, entries] of Object.entries(ours.hooks ?? {})) {
    const existing = merged.hooks![event] ?? [];
    const have = commandsOf(existing);
    const missing = entries.filter((entry) => (entry.hooks ?? []).some((h) => !have.has(h.command)));
    merged.hooks![event] = [...existing, ...missing];
  }
  return merged;
}

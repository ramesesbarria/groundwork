import { cn } from '@/lib/cn';

// Why a chat gets heavier: each call re-sends everything before it. Row n is call n; every block
// is one exchange (your message and the agent's work on it). Only the last block is new.
export function ReReadStaircase({ rows = 6 }: { rows?: number }) {
  return (
    <figure className="rounded-xl border border-border bg-surface/60 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] border border-border bg-background" aria-hidden />
          re-sent: already read on an earlier call
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-accent" aria-hidden />
          new this call
        </span>
      </div>
      <ol className="space-y-1.5">
        {Array.from({ length: rows }, (_, i) => i + 1).map((n) => (
          <li key={n} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3">
            <span className="font-mono text-xs text-muted">message {n}</span>
            <span className="flex gap-1">
              <span className="h-5 w-6 shrink-0 rounded-[3px] border border-dashed border-border" title="the tool's own instructions" />
              {Array.from({ length: n }, (_, j) => (
                <span
                  key={j}
                  className={cn(
                    'h-5 flex-1 rounded-[3px] sm:max-w-12',
                    j === n - 1 ? 'bg-accent' : 'border border-border bg-background',
                  )}
                />
              ))}
            </span>
            <span className="text-right font-mono text-xs text-muted">{n === 1 ? '1 turn' : `${n} turns`}</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 text-sm leading-relaxed text-muted">
        The model keeps no memory between calls, so every call sends the whole conversation again: the tool’s
        instructions (the dashed block), every message, every file it read, every command’s output. Message 1 is
        read on every call after it. Double the conversation and you re-read about four times as much.
      </figcaption>
    </figure>
  );
}

const rows: { label: string; claude: string; opencode: string; gw: string }[] = [
  {
    label: 'When the chat fills up',
    claude: 'Clears older tool outputs, then summarizes the conversation. Early detailed instructions may be lost.',
    opencode: 'Compacts the session automatically when the context is full; can also prune old tool outputs.',
    gw: 'Keeps the heavy work out of your chat: each card’s roles run in fresh sessions, and a new session each phase starts small.',
  },
  {
    label: 'A new session starts with',
    claude: 'A fresh context window, plus CLAUDE.md and auto memory: your rules and preferences.',
    opencode: 'A fresh context, plus AGENTS.md: your rules.',
    gw: 'Those, plus HANDOFF.md: where the project stands and the very next step, in a few lines.',
  },
  {
    label: 'Where progress lives',
    claude: 'In the conversation, and whatever git history shows.',
    opencode: 'In the conversation, and whatever git history shows.',
    gw: 'In files: the spec, one card per piece of work, the proof, and the handoff.',
  },
];

// How the tools handle context, from their own docs (code.claude.com/docs/en/how-claude-code-works,
// opencode.ai/docs/config), and what Groundwork adds on top of either.
export function ContextComparison() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface font-mono text-xs">
            <th className="w-40 px-4 py-3 font-medium text-muted" />
            <th className="px-4 py-3 font-medium">Claude Code</th>
            <th className="px-4 py-3 font-medium">OpenCode</th>
            <th className="px-4 py-3 font-medium text-accent">+ Groundwork</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.label} className="align-top">
              <th className="px-4 py-3 font-mono text-xs font-medium text-muted">{r.label}</th>
              <td className="px-4 py-3 leading-relaxed text-muted">{r.claude}</td>
              <td className="px-4 py-3 leading-relaxed text-muted">{r.opencode}</td>
              <td className="bg-accent/5 px-4 py-3 leading-relaxed">{r.gw}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { cn } from '@/lib/cn';
import { Terminal } from './terminal';

// The three beats: work, it remembers, pick up anywhere.
const steps = [
  { title: 'Work', body: 'Build the way you already do, in the tool you already use.', mono: 'you + your agent' },
  { title: 'It remembers', body: 'Where you stopped, what is next and what you decided are saved in your repo.', mono: 'groundwork checkpoint' },
  { title: 'Pick up anywhere', body: 'A new chat, another tool, a different model. It starts where you left off.', mono: 'groundwork brief' },
];

export function MemoryLoop({ className }: { className?: string }) {
  return (
    <ol className={cn('not-prose my-8 grid list-none gap-3 p-0 sm:grid-cols-3', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col rounded-xl border border-border bg-background p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-foreground font-mono text-xs font-semibold text-background">
              {i + 1}
            </span>
            <h4 className="font-mono text-sm font-semibold">{s.title}</h4>
          </div>
          <p className="text-sm leading-relaxed text-muted">{s.body}</p>
          <p className="mt-auto pt-3 font-mono text-[11px] text-muted">{s.mono}</p>
        </li>
      ))}
    </ol>
  );
}

// Real output of `groundwork brief`, from a throwaway repository: init, a checkpoint, then two commits.
const briefLines = [
  '# Project memory: bookclub',
  'Handoff: BEHIND (written 0 min ago on main @ 5c4bcc2 by claude-code): 2 commits landed after it was written, changing 3 files.',
  '  - 6a1a0f1 feat: logout endpoint',
  '  - 2fce619 feat: session endpoint',
  '  Changed files: src/api/logout.ts, src/api/session.ts, src/login.ts',
  '  Files its Now/Next sections name have changed since: src/login.ts.',
  '  Trust the code over the handoff where they disagree, then save an updated handoff.',
  '',
  '## Handoff (.groundwork/HANDOFF.md)',
  'Now: Login form renders; validation is not wired to the API',
  'Next: Wire validation in src/login.ts, then add the first test',
  '',
  '## Decisions in force (records in .groundwork/decisions/; don’t reopen without the human)',
  '- 0001 Use cookie sessions, not JWTs',
];

export function BriefTerminal({ className }: { className?: string }) {
  return (
    <Terminal title="npx groundwork-ai brief" className={className}>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed sm:text-[13px]">
        <code>
          {briefLines.map((line, i) => (
            <span key={i} className={cn('block whitespace-pre', i === 1 && 'text-[color:var(--status-waiting)]', line.startsWith('#') && i !== 1 && 'text-muted')}>
              {line || ' '}
            </span>
          ))}
        </code>
      </pre>
    </Terminal>
  );
}

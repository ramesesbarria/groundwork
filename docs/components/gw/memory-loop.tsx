import { cn } from '@/lib/cn';
import { Terminal } from './terminal';

// The memory loop: work, checkpoint, a new session or tool, brief with a freshness verdict, resume.
const steps = [
  { title: 'Work', body: 'An agent builds, in any tool and model.', mono: 'git commit' },
  { title: 'Checkpoint', body: 'The CLI stamps time, commit and branch. The agent writes only Now and Next.', mono: 'groundwork checkpoint' },
  { title: 'New session', body: 'A fresh chat, a different tool, another model, a parallel agent.', mono: 'session start' },
  { title: 'Brief', body: 'The handoff, the decisions and the map, with a verdict on how far to trust it.', mono: 'groundwork brief' },
  { title: 'Resume', body: 'Check the Next step against the listed commits, then carry on.', mono: '/gw' },
];

export function MemoryLoop({ className }: { className?: string }) {
  return (
    <figure className={cn('my-8', className)}>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-foreground font-mono text-xs font-semibold text-background">
                {i + 1}
              </span>
              <h4 className="font-mono text-sm font-semibold">{s.title}</h4>
            </div>
            <p className="text-[13px] leading-relaxed text-muted">{s.body}</p>
            <p className="mt-auto pt-3 font-mono text-[11px] text-muted">{s.mono}</p>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 font-mono text-[11px] text-muted">
        ↺ and around again: the next checkpoint stamps the new state.
      </figcaption>
    </figure>
  );
}

// What a verdict means, each in the colour of the nearest card status.
export const verdicts = [
  { name: 'fresh', color: 'var(--status-done)', body: 'Written at the current commit.' },
  { name: 'behind', color: 'var(--status-waiting)', body: 'Commits landed since; they are listed with the files they changed.' },
  { name: 'diverged', color: 'var(--status-rejected)', body: 'Its commit isn’t in this branch’s history: a rebase, a reset, another branch.' },
  { name: 'stale', color: 'var(--status-testing)', body: 'Older than staleAfterDays (14 by default), whatever git says.' },
  { name: 'unstamped', color: 'var(--status-todo)', body: 'Never checkpointed, so there is nothing to compare.' },
];

export function Verdicts({ className }: { className?: string }) {
  return (
    <dl className={cn('grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5', className)}>
      {verdicts.map((v) => (
        <div key={v.name} className="bg-background p-4">
          <dt className="flex items-center gap-2 font-mono text-sm font-semibold">
            <span className="size-2 rounded-full" style={{ background: v.color }} aria-hidden />
            {v.name}
          </dt>
          <dd className="mt-2 text-[13px] leading-relaxed text-muted">{v.body}</dd>
        </div>
      ))}
    </dl>
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
  '',
  '## Map (.groundwork/MAP.md)',
  '…',
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

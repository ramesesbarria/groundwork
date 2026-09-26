import { cn } from '@/lib/cn';
import { type Status, statuses } from './status';

/* The calculator's real plan: two phases, six cards. */
const plan = [
  {
    phase: 'Phase 1',
    name: 'Arithmetic engine',
    result: 'you can try: the math works, tested',
    cards: [
      ['1.1', 'Number entry'],
      ['1.2', 'Operations and equals'],
      ['1.3', 'Clear and error state'],
      ['1.4', 'Result formatting'],
    ],
  },
  {
    phase: 'Phase 2',
    name: 'Browser app',
    result: 'you can try: a working calculator page',
    cards: [
      ['2.1', 'Page and keypad'],
      ['2.2', 'Wire it up'],
    ],
  },
];

export function PhasePlan() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      {plan.map((p) => (
        <div key={p.phase} className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-sm font-semibold">
              {p.phase} <span className="font-normal text-muted">· {p.name}</span>
            </p>
            <p className="font-mono text-[11px] text-muted">{p.result}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {p.cards.map(([id, title]) => (
              <li key={id} className="rounded-lg border border-border bg-surface px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                <p className="font-mono text-[11px] text-muted">card {id}</p>
                <p className="text-sm">{title}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* The three roles and you, with what each does and why it's set up that way. */
const roles: { who: string; status: Status; does: string; why: string; example: string }[] = [
  {
    who: 'Tester',
    status: 'testing',
    does: 'Writes the checks first, before any code exists, one for each thing the card promises. Then runs them and confirms they fail, and fail for the right reason.',
    why: 'A check that can’t fail proves nothing. “The right reason” means it fails because the feature is missing, not because the check itself is broken (a typo, a wrong file name). Then, when it passes later, you know the new code is what made it pass.',
    example: 'card 1.1: all checks failed with “module not found”, because the calculator’s code didn’t exist yet.',
  },
  {
    who: 'Implementer',
    status: 'implementing',
    does: 'Writes the code, the smallest change that makes those checks pass, then runs every check in the project so nothing else broke.',
    why: 'It isn’t allowed to edit the checks. So it can’t make them pass by quietly weakening them, a common shortcut when one AI both writes and grades its own work.',
    example: 'card 1.1: wrote src/calc.js until all 11 checks passed.',
  },
  {
    who: 'Reviewer',
    status: 'review',
    does: 'Starts fresh, having never seen the work. Reruns everything itself, checks each promise on the card against what changed, and writes down what it couldn’t verify.',
    why: 'Fresh eyes catch what the builder talked itself into. It can’t fix code, only pass the card or send it back with the problems listed.',
    example: 'card 1.1: “Live browser check: attempted, not possible”, listed as a caveat for you.',
  },
];

function RoleCard({ r, n }: { r: (typeof roles)[number]; n: number }) {
  const color = statuses[r.status].color;
  return (
    <li className="relative flex flex-col rounded-xl border bg-background p-5" style={{ borderColor: `color-mix(in oklab, ${color} 40%, var(--border))` }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold text-background" style={{ background: color }}>
          {n}
        </span>
        <h4 className="font-mono text-base font-semibold">{r.who}</h4>
      </div>
      <p className="text-sm leading-relaxed">{r.does}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        <span className="font-mono text-xs text-foreground">why · </span>
        {r.why}
      </p>
      <p className="mt-auto border-t border-border pt-3 font-mono text-xs leading-relaxed text-muted [&]:mt-4">{r.example}</p>
    </li>
  );
}

export function RoleSteps() {
  return (
    <ol className="grid gap-3 lg:grid-cols-3">
      {roles.map((r, i) => (
        <RoleCard key={r.who} r={r} n={i + 1} />
      ))}
    </ol>
  );
}

/* A card's statuses as a track: numbered stops joined by a line, each with who moves it there. */
const track: { status: Status; who: string }[] = [
  { status: 'todo', who: 'planned' },
  { status: 'testing', who: 'tester' },
  { status: 'implementing', who: 'implementer' },
  { status: 'review', who: 'reviewer' },
  { status: 'waiting', who: 'your turn' },
  { status: 'done', who: 'committed' },
];

export function StatusTrack({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <ol className="flex min-w-[680px] items-start">
        {track.map((t, i) => {
          const s = statuses[t.status];
          const next = track[i + 1] && statuses[track[i + 1].status];
          return (
            <li key={t.status} className="contents">
              <div className="flex w-28 shrink-0 flex-col items-center text-center">
                <span
                  className="flex size-7 items-center justify-center rounded-full border-2 bg-background font-mono text-xs font-semibold"
                  style={{ borderColor: s.color, color: s.color }}
                >
                  {i + 1}
                </span>
                <span className="mt-2 whitespace-nowrap font-mono text-xs font-medium" style={{ color: s.color }}>
                  {s.label}
                </span>
                <span className="mt-0.5 text-[11px] text-muted">{t.who}</span>
              </div>
              {next && (
                <div aria-hidden className="relative mt-[13px] h-0.5 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${s.color}, ${next.color})` }}>
                  <span
                    className="absolute top-1/2 -right-0.5 size-0 -translate-y-1/2 border-y-[5px] border-l-[7px] border-y-transparent"
                    style={{ borderLeftColor: next.color }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-5 min-w-[680px] text-center font-mono text-[11px]" style={{ color: 'var(--status-rejected)' }}>
        ↺ sent back: by the reviewer to the implementer, or by you with a reason. It goes around again.
      </p>
    </div>
  );
}

/* The four stages, as numbered steps on a rail. */
export function Stage({ n, title, children, last }: { n: string; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[2.5rem_1fr] gap-4 sm:grid-cols-[3rem_1fr] sm:gap-6">
      <div className="flex flex-col items-center">
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background font-mono text-sm font-semibold">{n}</span>
        {!last && <span className="mt-2 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className={cn('min-w-0', last ? 'pb-0' : 'pb-14')}>
        <h3 className="type-heading mt-1 text-xl sm:text-2xl">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  );
}

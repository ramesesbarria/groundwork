import { cn } from '@/lib/cn';
import { type Status, statuses } from './status';

type Step = { who: string; does: string; status: Status };

const steps: Step[] = [
  { who: 'Tester', does: 'writes tests that fail for the right reason', status: 'testing' },
  { who: 'Implementer', does: 'makes them pass, nothing more', status: 'implementing' },
  { who: 'Reviewer', does: 'fresh context, reruns everything', status: 'review' },
  { who: 'You', does: 'approve, or send back with a reason', status: 'waiting' },
];

// The build loop for one card, drawn with HTML so it reflows: a row on wide screens, a column on
// phones. Node colors are the card status each step leaves the card in.
export function BuildLoopDiagram({ className }: { className?: string }) {
  return (
    <figure className={cn('not-prose my-8', className)}>
      <div className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="type-label">One card</span>
          <span className="font-mono text-xs text-muted">runner hands it on · never does the work</span>
        </div>
        <ol className="grid gap-2 sm:grid-cols-[repeat(4,1fr)_auto] sm:items-stretch">
          {steps.map((step, i) => {
            const color = statuses[step.status].color;
            return (
              <li key={step.who} className="relative flex sm:block">
                <div
                  className="flex w-full flex-col gap-1 rounded-lg border bg-background p-3"
                  style={{ borderColor: `color-mix(in oklab, ${color} 45%, var(--border))` }}
                >
                  <span className="flex items-center gap-2 font-mono text-sm font-semibold">
                    <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
                    {step.who}
                  </span>
                  <span className="text-[13px] leading-snug text-muted">{step.does}</span>
                </div>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -bottom-2 left-6 z-10 font-mono text-xs text-muted sm:top-1/2 sm:-right-2 sm:bottom-auto sm:left-auto sm:-translate-y-1/2"
                  >
                    <span className="sm:hidden">↓</span>
                    <span className="hidden sm:inline">→</span>
                  </span>
                )}
              </li>
            );
          })}
          <li className="flex items-center justify-center rounded-lg border border-dashed p-3 font-mono text-sm sm:px-4"
            style={{ borderColor: 'color-mix(in oklab, var(--status-done) 50%, var(--border))', color: 'var(--status-done)' }}
          >
            committed ✓
          </li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs" style={{ color: 'var(--status-rejected)' }}>
          <span>↺ reviewer finds a problem → back to the implementer</span>
          <span>↺ you reject, with a reason → back into the loop</span>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted">
        Each role is a fresh session that reads the card, its role file and only the code the card touches.
      </figcaption>
    </figure>
  );
}

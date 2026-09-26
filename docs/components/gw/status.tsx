import { cn } from '@/lib/cn';

// The card lifecycle, in order. Labels are the plain words Groundwork shows the human.
export const statuses = {
  todo: { label: 'to do', color: 'var(--status-todo)' },
  testing: { label: 'being tested', color: 'var(--status-testing)' },
  implementing: { label: 'being built', color: 'var(--status-implementing)' },
  review: { label: 'in review', color: 'var(--status-review)' },
  waiting: { label: 'waiting for you', color: 'var(--status-waiting)' },
  done: { label: 'done', color: 'var(--status-done)' },
  rejected: { label: 'sent back', color: 'var(--status-rejected)' },
} as const;

export type Status = keyof typeof statuses;

export function StatusPill({
  status,
  children,
  className,
}: {
  status: Status;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = statuses[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-xs',
        className,
      )}
      style={{
        color: s.color,
        borderColor: `color-mix(in oklab, ${s.color} 35%, transparent)`,
        background: `color-mix(in oklab, ${s.color} 9%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.color }} aria-hidden />
      {children ?? s.label}
    </span>
  );
}

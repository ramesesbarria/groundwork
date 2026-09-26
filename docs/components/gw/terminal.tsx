import { cn } from '@/lib/cn';

// A drawn terminal window: three dots, a title in mono, and whatever sits inside (a GIF, a clip,
// or text lines). Matches the portfolio's TerminalFrame.
export function Terminal({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
        <span className="size-2.5 rounded-full bg-border" aria-hidden />
        {title && <span className="ml-2 truncate font-mono text-xs text-muted">{title}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

// Lines of a chat in a terminal: who is speaking, then what they said.
export function ChatLines({ lines }: { lines: { who: 'you' | 'agent' | 'note'; text: React.ReactNode }[] }) {
  return (
    <div className="space-y-2 p-4 font-mono text-[13px] leading-relaxed">
      {lines.map((line, i) => (
        <p key={i} className={cn('flex gap-3', line.who === 'note' && 'text-muted')}>
          <span className={cn('w-12 shrink-0 text-muted', line.who === 'you' && 'text-accent')}>
            {line.who === 'note' ? '' : line.who === 'you' ? 'you' : 'agent'}
          </span>
          <span className="min-w-0">{line.text}</span>
        </p>
      ))}
    </div>
  );
}

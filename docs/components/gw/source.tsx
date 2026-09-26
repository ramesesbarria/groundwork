import { cn } from '@/lib/cn';

// A small "source" link after a claim, pointing at the raw row or transcript line behind it.
export function Source({ href, children = 'source', className }: { href: string; children?: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-1 rounded border border-border px-1.5 py-px align-middle font-mono text-[11px] text-muted no-underline transition-colors hover:border-foreground/30 hover:text-foreground',
        className,
      )}
    >
      {children}
      <span aria-hidden>↗</span>
    </a>
  );
}

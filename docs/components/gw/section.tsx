import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Section({
  id,
  label,
  title,
  why,
  intro,
  children,
  className,
}: {
  id?: string;
  label?: string;
  title?: React.ReactNode;
  /** One plain-language line on what the section means for the reader, shown before the detail. */
  why?: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('page-container scroll-mt-20 py-12 sm:py-16', className)}>
      {label && <p className="type-label mb-3">{label}</p>}
      {title && <h2 className="type-heading max-w-3xl">{title}</h2>}
      {why && <WhyItMatters>{why}</WhyItMatters>}
      {intro && <div className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{intro}</div>}
      {children && <div className={cn(title || intro || why ? 'mt-10' : undefined)}>{children}</div>}
    </section>
  );
}

export function Stat({ value, label, className }: { value: React.ReactNode; label: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 bg-background p-5', className)}>
      <span className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{value}</span>
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </div>
  );
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4', className)}>
      {children}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const Tag = href.startsWith('/') ? Link : 'a';
  return (
    <Tag
      href={href}
      className={cn(
        'press inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium',
        variant === 'primary'
          ? 'bg-foreground text-background hover:bg-foreground/85'
          : 'border border-border bg-background hover:bg-surface',
      )}
    >
      {children}
    </Tag>
  );
}

export function WhyItMatters({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 max-w-3xl border-l-2 border-accent py-1 pl-4">
      <p className="type-label mb-1" style={{ color: 'var(--accent)' }}>
        Why it matters
      </p>
      <p className="text-base leading-relaxed text-foreground">{children}</p>
    </div>
  );
}

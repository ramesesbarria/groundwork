import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/gw/section';
import { Source } from '@/components/gw/source';
import { StatusPill, type Status } from '@/components/gw/status';
import { measurementsUrl, model, transcriptsUrl } from '@/lib/data/calculator';
import { type Session, sessions } from '@/lib/data/sessions';
import { blobUrl } from '@/lib/shared';

export const metadata: Metadata = {
  title: 'Receipts',
  description: 'Every session of the calculator build, as it ran: two main chats and 18 role sessions, with their measured cost.',
};

const line = (path: string, n: number) => `${blobUrl(path)}?plain=1#L${n}`;
const p1 = 'transcripts/phase-1/main/transcript.md';
const p2 = 'transcripts/phase-2/main/transcript.md';
const r11 = 'transcripts/phase-1/subagents/1.1-reviewer/transcript.md';

// Moments worth reading first, in the order they happened. Quotes are verbatim.
const moments: { where: string; quote: string; href: string; status?: Status }[] = [
  { where: 'Runner · spec', quote: 'First question, the scope one:', href: line(p1, 1371) },
  { where: 'Runner · plan', quote: 'Does this plan look right?', href: line(p1, 4705) },
  { where: 'Runner · card 1.1', quote: 'Card started. Handing it to the tester now (a subagent, so its work stays separate from mine):', href: line(p1, 5828), status: 'testing' },
  { where: 'Runner · card 1.1', quote: 'Failing state confirmed exactly as reported … Handing card 1.1 to the implementer:', href: line(p1, 6102), status: 'implementing' },
  { where: 'Reviewer · card 1.1', quote: 'Verdict: PASS — card 1.1 set to awaiting-approval (not done; waiting for your approval)', href: line(r11, 2992), status: 'review' },
  { where: 'Reviewer · card 1.1', quote: 'Live browser check — attempted, not possible', href: line(r11, 2997) },
  { where: 'Runner · card 1.1', quote: 'Card 1.1 — Number entry is built and waiting for your approval.', href: line(p1, 6505), status: 'waiting' },
  { where: 'Runner · card 1.1', quote: 'Approved and committed: 78565bd — [1.1] Number entry', href: line(p1, 6925), status: 'done' },
  { where: 'Runner · phase 1 retro', quote: 'L-001 · Hand each role its own status rules', href: line(p1, 9955) },
  { where: 'New chat · phase 2', quote: 'Where things stand: Phase 1 (arithmetic engine) is approved and the retro is done. Next is phase 2, card 2.1 Page and keypad', href: line(p2, 1184) },
];

const roleLabel: Record<Session['role'], string> = {
  runner: 'Runner (main chat)',
  tester: 'Tester',
  implementer: 'Implementer',
  reviewer: 'Reviewer',
};

const n = (x: number) => x.toLocaleString('en-US');

function SessionTable({ phase }: { phase: number }) {
  const rows = sessions.filter((s) => s.phase === phase);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface font-mono text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Session</th>
            <th className="px-3 py-2.5 text-right font-medium">Calls</th>
            <th className="px-3 py-2.5 text-right font-medium">Starts at</th>
            <th className="px-3 py-2.5 text-right font-medium">Peak</th>
            <th className="px-3 py-2.5 text-right font-medium">Cost</th>
            <th className="px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((s) => (
            <tr key={s.path} className="hover:bg-surface/60">
              <td className="px-4 py-2.5">
                <span className="font-mono text-muted">{s.card ?? '—'}</span>{' '}
                <span className={s.role === 'runner' ? 'font-semibold' : undefined}>{roleLabel[s.role]}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{s.calls}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n(s.first)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{n(s.peak)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">${s.cost.toFixed(4)}</td>
              <td className="px-4 py-2.5 text-right">
                <Source href={blobUrl(s.path)}>transcript</Source>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <main className="flex-1">
      <header className="dot-grid border-b border-border">
        <div className="page-container py-16 sm:py-20">
          <Link href="/proof" className="mb-6 inline-flex items-center gap-2 font-mono text-[13px] text-muted hover:text-foreground">
            <span aria-hidden>←</span> Back to the proof
          </Link>
          <p className="type-label mb-4">Receipts</p>
          <h1 className="type-display max-w-3xl">Every session, as it ran.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
            The calculator build, exported from OpenCode’s session API: two main chats and 18 role sessions. Nothing is
            edited except one redacted email address. Read the moments below first, or any session in full.
          </p>
          <p className="mt-4 font-mono text-xs text-muted">{model}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={transcriptsUrl}>Transcripts on GitHub ↗</ButtonLink>
            <ButtonLink href={measurementsUrl} variant="secondary">
              Raw measurements ↗
            </ButtonLink>
          </div>
        </div>
      </header>

      <section className="page-container py-14">
        <p className="type-label mb-3">Start here</p>
        <h2 className="type-heading">Ten moments, in order.</h2>
        <ol className="mt-8 space-y-px overflow-hidden rounded-xl border border-border bg-border">
          {moments.map((m, i) => (
            <li key={i} className="grid gap-2 bg-background p-4 sm:grid-cols-[2.5rem_11rem_1fr_auto] sm:items-center sm:gap-4">
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-xs text-muted">{m.where}</span>
              <span className="font-mono text-[13px] leading-relaxed">
                “{m.quote}”
                {m.status && <StatusPill status={m.status} className="ml-2" />}
              </span>
              <Source href={m.href}>read</Source>
            </li>
          ))}
        </ol>
      </section>

      <section className="page-container pb-12">
        <p className="type-label mb-3">Phase 1 · cards 1.1–1.4</p>
        <h2 className="type-heading mb-2">One main chat, twelve role sessions.</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted">
          The main chat also exported these transcripts, so its peak and cost include that. Every role session starts
          near 9k tokens.
        </p>
        <SessionTable phase={1} />
      </section>

      <section className="page-container pb-28">
        <p className="type-label mb-3">Phase 2 · cards 2.1–2.2</p>
        <h2 className="type-heading mb-2">A new main chat, six role sessions.</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted">
          The new chat picked up from the handoff file at 9.2k tokens. It also deployed the app to GitHub Pages.
        </p>
        <SessionTable phase={2} />
        <p className="mt-6 text-xs text-muted">
          Numbers from <code className="font-mono">checks/session-costs.mjs</code> on the exported sessions. Absolute
          Windows paths appear as they were in the sessions.
        </p>
      </section>
    </main>
  );
}

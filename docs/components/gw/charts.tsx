'use client';
import { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { CardCost, RoleSession } from '@/lib/data/calculator';

// Hand-drawn SVG charts for /proof. Two series colors only (validated for both modes against the
// page surfaces): --series-gw for Groundwork's fresh sessions, --series-chat for one long chat.
// Text stays in text colors; every value is also in a table below the chart.

const fmtK = (x: number) => (x >= 1_000_000 ? `${(x / 1_000_000).toFixed(x >= 10_000_000 ? 0 : 1)}M` : `${Math.round(x / 1000)}k`);
const fmtN = (x: number) => x.toLocaleString('en-US');

function niceMax(v: number, step: number) {
  return Math.ceil(v / step) * step;
}

type Tip = { x: number; y: number; value: string; label: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-background px-2.5 py-1.5 shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
      role="status"
    >
      <p className="font-mono text-sm font-semibold text-foreground">{tip.value}</p>
      <p className="whitespace-nowrap text-xs text-muted">{tip.label}</p>
    </div>
  );
}

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-mono text-xs text-muted hover:text-foreground">Show as a table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} className="border-b border-border py-1.5 pr-4 font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={cn('border-b border-border/60 py-1.5 pr-4', j > 0 && 'tabular-nums')}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Context at the start: the runner's one long chat vs every role session, on one shared scale. */

export function ContextChart({
  runnerTurns,
  roleSessions,
}: {
  runnerTurns: { ask: string; start: number; end: number }[];
  roleSessions: RoleSession[];
}) {
  const [tip, setTip] = useState<Tip>(null);
  const H = 240;
  const top = 12;
  const bottom = 28;
  const plotH = H - top - bottom;
  const yMax = 300_000;
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const ticks = [0, 100_000, 200_000, 300_000];

  // Two panels side by side in one SVG, same y scale. Widths in viewBox units.
  const W = 760;
  const axisW = 40;
  const gap = 36;
  const leftW = 300;
  const rightX = axisW + leftW + gap;
  const rightW = W - rightX;

  // Each message's starting context, then where the chat ended (its peak).
  const runnerPoints = [
    ...runnerTurns.map((t, i) => ({ v: t.start, label: `runner, message ${i + 1}: ${t.ask}` })),
    { v: runnerTurns.at(-1)!.end, label: 'runner, end of the chat' },
  ];
  const lx = (i: number) => axisW + 10 + (i / (runnerPoints.length - 1)) * (leftW - 20);
  const barSlot = rightW / roleSessions.length;
  const barW = Math.max(4, barSlot - 2);

  const points = runnerPoints.map((p, i) => [lx(i), y(p.v)] as const);
  const path = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');

  const show = (e: React.PointerEvent | React.FocusEvent, value: string, label: string) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const box = svg.getBoundingClientRect();
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTip({ x: r.left + r.width / 2 - box.left, y: r.top - box.top, value, label });
  };

  return (
    <figure className="not-prose">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: 'var(--series-chat)' }} aria-hidden />
          The runner: one long chat, as each of your messages came in
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--series-gw)' }} aria-hidden />
          Each role session, at its start
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pt-10 -mt-10">
      <div className="relative min-w-[600px]" onPointerLeave={() => setTip(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label="Context at the start of each call: the runner's chat climbs to 280k tokens while every role session starts near 9k.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={axisW} x2={W} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={axisW - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--muted)] font-mono text-[11px]">
                {t === 0 ? '0' : fmtK(t)}
              </text>
            </g>
          ))}

          {/* Left panel: the runner, turn by turn */}
          <path d={path} fill="none" stroke="var(--series-chat)" strokeWidth={2} strokeLinejoin="round" />
          {runnerPoints.map((t, i) => (
            <g key={i}>
              <circle cx={points[i][0]} cy={points[i][1]} r={4} fill="var(--series-chat)" stroke="var(--background)" strokeWidth={2} />
              <rect
                x={points[i][0] - 12}
                y={top}
                width={24}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                onPointerEnter={(e) => show(e, `${fmtN(t.v)} tokens`, t.label)}
                onFocus={(e) => show(e, `${fmtN(t.v)} tokens`, t.label)}
                onBlur={() => setTip(null)}
                className="outline-none"
              />
            </g>
          ))}
          <text x={points.at(-1)![0]} y={points.at(-1)![1] - 10} textAnchor="end" className="fill-[var(--foreground)] font-mono text-[12px] font-semibold">
            280k
          </text>
          <text x={axisW + leftW / 2} y={H - 6} textAnchor="middle" className="fill-[var(--muted)] font-mono text-[11px]">
            phase 1 main chat, message by message →
          </text>

          {/* Right panel: every role session */}
          {roleSessions.map((s, i) => {
            const x = rightX + i * barSlot + (barSlot - barW) / 2;
            const h = y(0) - y(s.first);
            const label = `card ${s.card} ${s.role}`;
            return (
              <g key={i}>
                <path
                  d={`M${x},${y(0)} v${-(h - 2)} q0,-2 2,-2 h${barW - 4} q2,0 2,2 v${h - 2} z`}
                  fill="var(--series-gw)"
                  opacity={tip?.label.startsWith(label) ? 0.8 : 1}
                />
                <rect
                  x={rightX + i * barSlot}
                  y={top}
                  width={barSlot}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  onPointerEnter={(e) => show(e, `${fmtN(s.first)} tokens`, label)}
                  onFocus={(e) => show(e, `${fmtN(s.first)} tokens`, label)}
                  onBlur={() => setTip(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          {['1.1', '1.2', '1.3', '1.4', '2.1', '2.2'].map((c, i) => (
            <text key={c} x={rightX + (i * 3 + 1.5) * barSlot} y={H - 12} textAnchor="middle" className="fill-[var(--muted)] font-mono text-[10px]">
              {c}
            </text>
          ))}
          <text x={rightX + rightW} y={y(9_000) - 8} textAnchor="end" className="fill-[var(--foreground)] font-mono text-[12px] font-semibold">
            8.8–9.7k, every one
          </text>
        </svg>
        <Tooltip tip={tip} />
      </div>
      </div>
      <TableView
        caption="Context at the start of each runner message and each role session"
        head={['Where', 'Context at start (tokens)']}
        rows={[
          ...runnerPoints.map((p) => [p.label, fmtN(p.v)]),
          ...roleSessions.map((s) => [`card ${s.card} ${s.role}`, fmtN(s.first)]),
        ]}
      />
    </figure>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Cost per card: a bar list, one series. */

export function CardCostBars({ cards }: { cards: CardCost[] }) {
  const max = Math.max(...cards.map((c) => c.cost));
  return (
    <figure className="not-prose">
      <ul className="space-y-2.5">
        {cards.map((c) => (
          <li key={c.id} className="grid grid-cols-[9.5rem_1fr_4rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_4.5rem]">
            <span className="truncate">
              <span className="font-mono text-muted">{c.id}</span> {c.title}
            </span>
            <span className="h-3 overflow-hidden rounded-r-[4px]" title={`${c.id}: $${c.cost.toFixed(4)}, ${fmtN(c.fresh)} fresh tokens`}>
              <span
                className="block h-full rounded-r-[4px]"
                style={{ width: `${(c.cost / max) * 100}%`, background: 'var(--series-gw)', opacity: c.ui ? 1 : 0.75 }}
              />
            </span>
            <span className="text-right font-mono text-[13px] tabular-nums">${c.cost.toFixed(3)}</span>
          </li>
        ))}
      </ul>
      <TableView
        caption="Cost and fresh tokens per card"
        head={['Card', 'Cost', 'Fresh tokens', 'Largest role context']}
        rows={cards.map((c) => [`${c.id} ${c.title}`, `$${c.cost.toFixed(4)}`, fmtN(c.fresh), fmtN(c.peak)])}
      />
    </figure>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Crossover explorer: tokens re-read by one long chat (a model) vs fresh sessions per card
   (measured per-card average), as the project grows. */

export function CrossoverExplorer({ perCardMeasured, startContext }: { perCardMeasured: number; startContext: number }) {
  const [cards, setCards] = useState(30);
  const [history, setHistory] = useState(25_000);
  const [calls, setCalls] = useState(20);
  const [hover, setHover] = useState<number | null>(null);
  const ids = { cards: useId(), history: useId(), calls: useId() };

  const chat = (n: number) => calls * n * startContext + (calls * history * n * n) / 2;
  const gw = (n: number) => perCardMeasured * n;

  const crossover = useMemo(() => {
    for (let n = 1; n <= 500; n++) if (chat(n) > gw(n)) return n;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, calls, perCardMeasured, startContext]);

  const W = 760;
  const H = 280;
  const left = 48;
  const right = 16;
  const top = 16;
  const bottom = 30;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const yMaxRaw = Math.max(chat(cards), gw(cards));
  const yStep = yMaxRaw > 400e6 ? 200e6 : yMaxRaw > 100e6 ? 50e6 : yMaxRaw > 40e6 ? 20e6 : 5e6;
  const yMax = niceMax(yMaxRaw, yStep);
  const x = (n: number) => left + (n / cards) * plotW;
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const ns = Array.from({ length: cards + 1 }, (_, i) => i);
  const line = (f: (n: number) => number) => ns.map((n, i) => `${i ? 'L' : 'M'}${x(n)},${y(f(n))}`).join(' ');
  const yTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, i) => i * yStep);
  const xTicks = ns.filter((n) => n % (cards > 40 ? 10 : 5) === 0);
  const ctxAtEnd = startContext + cards * history;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const n = Math.round(((px - left) / plotW) * cards);
    setHover(n >= 1 && n <= cards ? n : null);
  };

  const Slider = ({ id, label, value, min, max, step, set, fmt }: { id: string; label: string; value: number; min: number; max: number; step: number; set: (v: number) => void; fmt: (v: number) => string }) => (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="flex justify-between gap-3 text-xs text-muted">
        {label}
        <span className="font-mono text-foreground">{fmt(value)}</span>
      </span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="accent-[var(--accent)]" />
    </label>
  );

  return (
    <figure className="not-prose rounded-xl border border-border bg-surface/60 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Slider({ id: ids.cards, label: 'Cards in the project', value: cards, min: 5, max: 100, step: 1, set: setCards, fmt: String })}
        {Slider({ id: ids.history, label: 'One chat: history added per card', value: history, min: 5_000, max: 100_000, step: 5_000, set: setHistory, fmt: fmtK })}
        {Slider({ id: ids.calls, label: 'One chat: model calls per card', value: calls, min: 5, max: 60, step: 1, set: setCalls, fmt: String })}
      </div>

      <div className="mt-5 mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: 'var(--series-chat)' }} aria-hidden />
          One long chat (model)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded" style={{ background: 'var(--series-gw)' }} aria-hidden />
          Fresh role sessions per card (measured average)
        </span>
      </div>

      <div className="overflow-x-auto">
      <div className="relative min-w-[560px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full overflow-visible"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Tokens re-read over ${cards} cards: one long chat ${fmtK(chat(cards))}, fresh sessions ${fmtK(gw(cards))}.`}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--muted)] font-mono text-[11px]">
                {t === 0 ? '0' : fmtK(t)}
              </text>
            </g>
          ))}
          {xTicks.map((n) => (
            <text key={n} x={x(n)} y={H - 8} textAnchor="middle" className="fill-[var(--muted)] font-mono text-[11px]">
              {n}
            </text>
          ))}
          {crossover && crossover <= cards && (
            <g>
              <line x1={x(crossover)} x2={x(crossover)} y1={top} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 4" />
              <text x={x(crossover) + 6} y={top + 12} className="fill-[var(--foreground)] font-mono text-[11px]">
                crossover ≈ card {crossover}
              </text>
            </g>
          )}
          <path d={line(gw)} fill="none" stroke="var(--series-gw)" strokeWidth={2} />
          <path d={line(chat)} fill="none" stroke="var(--series-chat)" strokeWidth={2} />
          {hover && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={top} y2={y(0)} stroke="var(--foreground)" strokeOpacity={0.35} />
              <circle cx={x(hover)} cy={y(chat(hover))} r={4} fill="var(--series-chat)" stroke="var(--background)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(gw(hover))} r={4} fill="var(--series-gw)" stroke="var(--background)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg"
            style={{ left: `${Math.min(80, (x(hover) / W) * 100)}%` }}
            role="status"
          >
            <p className="mb-1 font-mono text-muted">after {hover} cards</p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3" style={{ background: 'var(--series-chat)' }} />
              <strong className="font-mono">{fmtK(chat(hover))}</strong> <span className="text-muted">one chat</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-0.5 w-3" style={{ background: 'var(--series-gw)' }} />
              <strong className="font-mono">{fmtK(gw(hover))}</strong> <span className="text-muted">fresh sessions</span>
            </p>
          </div>
        )}
      </div>
      </div>
      <p className="mt-1 text-center font-mono text-[11px] text-muted">cards built →   ·   tokens re-read, total ↑</p>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border bg-border text-sm sm:grid-cols-3">
        <div className="bg-background p-3">
          <dt className="text-xs text-muted">One chat stops being cheaper</dt>
          <dd className="mt-1 font-mono text-lg font-semibold">{crossover ? `around card ${crossover}` : 'not within 500 cards'}</dd>
        </div>
        <div className="bg-background p-3">
          <dt className="text-xs text-muted">At card {cards}, one chat re-reads</dt>
          <dd className="mt-1 font-mono text-lg font-semibold">{(chat(cards) / gw(cards)).toFixed(1)}× as much</dd>
        </div>
        <div className="bg-background p-3">
          <dt className="text-xs text-muted">One chat’s context per call by then</dt>
          <dd className="mt-1 font-mono text-lg font-semibold">
            {fmtK(ctxAtEnd)}
            {ctxAtEnd > 1_000_000 && <span className="ml-2 text-xs font-normal text-muted">past a 1M window</span>}
            {ctxAtEnd > 200_000 && ctxAtEnd <= 1_000_000 && <span className="ml-2 text-xs font-normal text-muted">past a 200k window</span>}
          </dd>
        </div>
      </dl>
      <figcaption className="mt-4 text-xs leading-relaxed text-muted">
        <strong className="text-foreground">This is a model, not a measurement.</strong> The blue line is the calculator’s
        measured average for the three role sessions of a card ({fmtK(perCardMeasured)} re-read per card), and stays
        straight because each card starts fresh. The orange line is <code className="font-mono">re-read ≈ m·N·S + m·h·N²/2</code>{' '}
        with S = {fmtK(startContext)} (OpenCode’s measured start) and your m and h; the plain-chat run was never measured,
        so its defaults are assumptions. Neither line includes the runner, which Groundwork now restarts each phase.
      </figcaption>
    </figure>
  );
}

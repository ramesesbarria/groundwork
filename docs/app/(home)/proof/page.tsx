import type { Metadata } from 'next';
import Link from 'next/link';
import { CardCostBars, ContextChart, CrossoverExplorer } from '@/components/gw/charts';
import { ButtonLink, Section, Stat, StatGrid } from '@/components/gw/section';
import { Source } from '@/components/gw/source';
import { Terminal } from '@/components/gw/terminal';
import {
  appRepoUrl,
  appUrl,
  cards,
  headline,
  measurementsUrl,
  model,
  resume,
  roleReReadPerCard,
  roleSessions,
  roles,
  runnerPhase1Turns,
  startup,
  usd,
} from '@/lib/data/calculator';
import { blobUrl } from '@/lib/shared';

export const metadata: Metadata = {
  title: { absolute: 'Building a calculator with Groundwork: the proof' },
  description:
    'One real build with Groundwork, measured call by call: what it cost, where the tokens went, what didn’t stay flat, and what changed because of it.',
};

const m = (anchor: string) => `${measurementsUrl}#${anchor}`;
const lessonsUrl = `${appRepoUrl}/blob/main/.groundwork/LESSONS.md`;
const reviewer11 = `${blobUrl('transcripts/phase-1/subagents/1.1-reviewer/transcript.md')}?plain=1`;
const fixCommit = 'https://github.com/ramesesbarria/groundwork/commit/3910c9e';
const ratio = (resume.without.processed / resume.with.processed).toFixed(1);

// The summary at the top: what the page means, for someone who reads nothing else.
const takeaways = [
  {
    href: '#same-size',
    title: 'Each step costs the same, however big the project gets.',
    body: 'Every step of the build started with about 9k tokens of context, from the first piece of work to the last.',
  },
  {
    href: '#resuming',
    title: 'Picking up where you left off is cheap.',
    body: `A new session knew where the project stood after reading ${ratio}× fewer tokens than one without Groundwork, and got it right.`,
  },
  {
    href: '#honest',
    title: 'The honest catch.',
    body: 'On an app this small, one plain chat would likely be cheaper. Groundwork pays off as a project grows past what one chat can hold.',
  },
];

export default function ProofPage() {
  return (
    <main className="flex-1">
      <header className="dot-grid border-b border-border">
        <div className="page-container py-16 sm:py-24">
          <p className="type-label mb-4">The proof</p>
          <h1 className="type-display max-w-4xl">Building a calculator with Groundwork.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            One real build across 20 sessions, measured call by call. Every number here comes from OpenCode’s own token
            accounting and links to the raw row it came from, including the ones that don’t flatter it.
          </p>
          <p className="mt-4 font-mono text-xs text-muted">{model} · measured 2026-09-26</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/receipts">Read every session →</ButtonLink>
            <ButtonLink href={appUrl} variant="secondary">
              Try the calculator ↗
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* In short */}
      <section className="page-container py-12 sm:py-16">
        <p className="type-label mb-3">In short</p>
        <h2 className="type-heading max-w-3xl">What it all means.</h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
          {takeaways.map((t, i) => (
            <li key={t.href} className="bg-background">
              <a href={t.href} className="group flex h-full flex-col p-6 transition-colors hover:bg-surface">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                <span className="mt-2 font-mono text-base font-semibold leading-snug">{t.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{t.body}</span>
                <span className="mt-auto pt-4 font-mono text-xs text-muted group-hover:text-foreground">see the numbers ↓</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Don’t take our word for it: every number links to its raw data, and{' '}
          <Link href="/receipts" className="text-foreground underline underline-offset-4">
            every session is readable in full →
          </Link>
        </p>
      </section>

      {/* What was built */}
      <Section
        label="What was built"
        title="A working calculator, built and checked piece by piece."
        why="This is a finished, deployed app, not a demo. The numbers below are what it actually took."
        className="pt-0 sm:pt-0"
      >
        <StatGrid>
          <Stat value={usd(headline.buildCost)} label="to build it: 6 cards in 2 phases" />
          <Stat value="1.33M" label="fresh tokens, 41% of them reasoning" />
          <Stat value={headline.tests} label="tests passing, each written before its code" />
          <Stat value={headline.sessions} label="sessions: 2 main chats, 18 role sessions" />
        </StatGrid>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          Deploying to GitHub Pages ({usd(headline.deployCost)}) and exporting the transcripts ({usd(headline.exportCost)})
          happened in the same chats and are counted separately.
          <Source href={m('summary')}>measurements.md</Source>
        </p>
      </Section>

      <Section
        id="same-size"
        label="Every card starts the same size"
        title="Each step started from the same small context."
        why="Card 60 should cost about what card 6 did. A growing project doesn’t make each step slower or more expensive."
        intro={
          <>
            Each role runs in a fresh session that reads its role file, the card and only the code the card touches. All
            18 role sessions started between 8.8k and 9.7k tokens of context, from card 1.1 to card 2.2. The one long
            chat (the runner) is plotted on the same scale for comparison. <Source href={m('every-session')}>every session</Source>
          </>
        }
      >
        <ContextChart runnerTurns={runnerPhase1Turns} roleSessions={roleSessions} />
      </Section>

      <Section
        label="Cost per card"
        title="Cost followed the work in the card, not the size of the project."
        why="You can estimate a project’s cost by counting its cards. Screens and interface work cost more than logic."
        intro={
          <>
            Tester, implementer and reviewer together. The two UI cards cost more because the tester built a browser
            check from scratch, not because the project had grown. <Source href={m('cost-per-card')}>cost per card</Source>
          </>
        }
      >
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <CardCostBars cards={cards} />
          <div>
            <p className="type-label mb-3">By role</p>
            <ul className="divide-y divide-border rounded-xl border border-border text-sm">
              {roles.map((r) => (
                <li key={r.role} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>
                    {r.role} <span className="text-muted">· {r.sessions} sessions</span>
                  </span>
                  <span className="font-mono tabular-nums">{usd(r.cost)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              The runner row is the main chats’ building turns only. <Source href={m('by-role-building-only')}>by role</Source>
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="resuming"
        label="Picking up where you left off"
        title="A new session knows where things stand."
        why="Closing the laptop, switching tools or coming back next week doesn’t mean re-explaining the project, or paying to re-read it."
        intro="A fresh session in the finished calculator, asked where the project stands and what’s next. Then the same question with Groundwork’s files removed. One run each, so read it as the shape to expect, not a benchmark."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {(
            [
              ['groundwork removed', resume.without],
              ['with groundwork: /gw', resume.with],
            ] as const
          ).map(([title, r]) => (
            <Terminal key={title} title={title}>
              <dl className="grid grid-cols-2 gap-px bg-border">
                {[
                  ['tokens read, all calls', r.processed.toLocaleString('en-US')],
                  ['model calls', r.calls],
                  ['tool calls', r.toolCalls],
                  ['cost', usd(r.cost, 4)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background p-4">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="mt-1 font-mono text-xl font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-border p-4 text-sm text-muted">{r.answer}</p>
            </Terminal>
          ))}
        </div>
        <p className="mt-4">
          <Source href={m('resuming-where-does-the-project-stand')}>resuming</Source>
        </p>
      </Section>

      <Section
        id="honest"
        label="The honest part"
        title="On a calculator, a plain chat is cheaper."
        why="For a quick script, one chat may be all you need. For anything that takes days, the flat cost per card wins."
        intro={
          <>
            Three roles, tests first and a review per card is a fixed cost, and on an app this small it’s most of the
            bill. What Groundwork adds there is proof, not savings. The cost story starts when the project outgrows one
            chat: every call re-reads the whole conversation, so a long chat’s total grows with the square of the work.
            Move the sliders to see where that crosses over.
          </>
        }
      >
        <CrossoverExplorer perCardMeasured={roleReReadPerCard} startContext={startup.bare} />
        <p className="mt-4 text-sm text-muted">
          The full derivation:{' '}
          <Link href="/docs/concepts/cost" className="text-foreground underline underline-offset-4">
            What it costs, and when it pays off
          </Link>
          .
        </p>
      </Section>

      <Section
        label="What didn’t stay flat"
        title="The main chat grew. So we changed how it works."
        why="The one part that grew was found by measuring, and fixed. Starting a new chat for each phase keeps it small."
        intro="The measurements found the one part that behaved like a long chat, because it is one: the runner, the main session that hands cards to the roles."
      >
        <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
          <li className="bg-background p-6">
            <p className="type-label mb-3">Measured</p>
            <p className="font-mono text-3xl font-semibold">280k</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              tokens of context per call, by the end of phase 1’s main chat. The two main chats account for{' '}
              <strong className="text-foreground">61%</strong> of all tokens re-read (21.6M of 35.2M), and about half of
              that history was the runner’s own retained reasoning. The roles’ reports back were about a thousand tokens
              each. <Source href={m('summary')}>summary</Source>
            </p>
          </li>
          <li className="bg-background p-6">
            <p className="type-label mb-3">Changed</p>
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li>
                <strong className="text-foreground">Short hand-offs:</strong> the card’s path, the role file and checked
                facts. No retelling what was agreed, no statuses to set.
              </li>
              <li>
                <strong className="text-foreground">No reruns between roles:</strong> the reviewer reruns everything
                once.
              </li>
              <li>
                <strong className="text-foreground">A fresh session each phase,</strong> suggested when a phase closes.
              </li>
            </ul>
            <p className="mt-3">
              <Source href={fixCommit}>the change</Source>
            </p>
          </li>
          <li className="bg-background p-6">
            <p className="type-label mb-3">Why it works</p>
            <p className="font-mono text-3xl font-semibold">9.2k</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              was where phase 2’s new main chat started, instead of about 190k had phase 1’s chat continued. Over its 61
              calls, that’s roughly <strong className="text-foreground">11M tokens not re-read</strong>. Phase 2 did this
              by accident; now Groundwork suggests it at every phase close. <Source href={m('summary')}>summary</Source>
            </p>
          </li>
        </ol>
      </Section>

      <Section
        label="The lessons ledger"
        title="It caught problems in Groundwork itself."
        why="The ledger catches problems in the process, not just in the code, and Groundwork got better because of it."
        intro="At the end of phase 1, the calculator’s retro wrote two lessons. Neither was the model’s mistake: both were gaps in how Groundwork told the roles to work, and both are now fixed."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              id: 'L-001',
              name: 'Runner prompts hand over role files, not status rules',
              origin:
                'The runner’s prompt told the implementer to set the card to done; the implementer role says review. Both cards had to be reset.',
              fix: 'The runner no longer passes statuses at all. The role file says.',
            },
            {
              id: 'L-002',
              name: 'Calls are recorded on the card by whoever makes them',
              origin:
                'Implementers reported their judgment calls but left the call: lines to the runner, who backfilled them.',
              fix: 'Tester and implementer write their own History and call: lines; a report isn’t enough.',
            },
          ].map((l) => (
            <Terminal key={l.id} title=".groundwork/LESSONS.md">
              <div className="space-y-3 p-5 text-sm">
                <p className="font-mono font-semibold">
                  {l.id} · {l.name}
                </p>
                <p className="leading-relaxed text-muted">
                  <span className="font-mono text-xs text-foreground">origin</span> {l.origin}
                </p>
                <p className="leading-relaxed text-muted">
                  <span className="font-mono text-xs" style={{ color: 'var(--status-done)' }}>
                    fixed
                  </span>{' '}
                  {l.fix}
                </p>
              </div>
            </Terminal>
          ))}
        </div>
        <p className="mt-4 flex flex-wrap gap-2">
          <Source href={lessonsUrl}>the calculator’s LESSONS.md</Source>
          <Source href={fixCommit}>the fix</Source>
        </p>
      </Section>

      <Section
        label="The reviewer"
        title="It says what it couldn’t check."
        why="You know exactly what wasn’t verified, so you know what to check yourself."
        intro="No card was sent back in this run. What the reviewers did do was rerun everything and say plainly where their proof stopped."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <blockquote className="rounded-xl border border-border bg-surface/60 p-6">
            <p className="font-mono text-sm leading-relaxed">
              “Live browser check — attempted, not possible … verified in Node only, not verified live in a browser”
            </p>
            <footer className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              card 1.1 reviewer, listed as a caveat for you
              <Source href={`${reviewer11}#L2997`}>L2997</Source>
            </footer>
          </blockquote>
          <blockquote className="rounded-xl border border-border bg-surface/60 p-6">
            <p className="font-mono text-sm leading-relaxed">
              “Minor, non-blocking … a multi-character key like ‘1abc’ would be treated as a digit … Noted in my report,
              not sent back.”
            </p>
            <footer className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              card 1.1 reviewer, reading the diff
              <Source href={`${reviewer11}#L3001`}>L3001</Source>
            </footer>
          </blockquote>
        </div>
      </Section>

      <Section
        label="Overhead"
        title={`Groundwork adds ${startup.added} tokens to a session start.`}
        why="Installing it costs about the length of a short paragraph at the start of each session."
        intro="First model call of fresh sessions in copies of the finished calculator. The rest is OpenCode’s own instructions and this machine’s global rules."
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              {[
                ['OpenCode alone, empty repo', startup.bare],
                ['The calculator, Groundwork removed', startup.withoutGroundwork],
                ['The calculator, with Groundwork', startup.withGroundwork],
                ['Groundwork’s tester subagent', startup.tester],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="px-4 py-2.5">{k}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{Number(v).toLocaleString('en-US')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          <code className="font-mono text-foreground">npx groundwork-ai doctor</code> shows this for your own project.
          <Source href={m('what-a-session-pays-before-doing-anything')}>startup</Source>
        </p>
      </Section>

      <Section
        label="Measure your own"
        title="Don’t take our numbers. Take yours."
        why="You can check all of this on your own project instead of trusting ours."
        intro="OpenCode exports any session with its per-call token counts. The script that produced every figure on this page runs on yours."
      >
        <Terminal title="your project">
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
            <span className="text-muted"># export each session, then summarize them</span>
            {'\n'}opencode session export {'<session-id>'} {'>'} main.json
            {'\n'}node checks/session-costs.mjs main.json tester-1.1.json ...
          </pre>
        </Terminal>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={measurementsUrl} variant="secondary">
            Raw measurements ↗
          </ButtonLink>
          <ButtonLink href={blobUrl('checks/session-costs.mjs')} variant="secondary">
            session-costs.mjs ↗
          </ButtonLink>
        </div>
      </Section>

      <Section
        id="receipts"
        label="Receipts"
        title="Every session, as it ran."
        why="Everything on this page can be checked against the actual conversations, word for word."
        className="pb-28"
      >
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Two main chats and 18 role sessions, exported from OpenCode and left unedited. Start with ten key moments, or
            open any session in full.
          </p>
          <ButtonLink href="/receipts">Read the receipts →</ButtonLink>
        </div>
      </Section>
    </main>
  );
}

import Link from 'next/link';
import { CopyCommand } from '@/components/gw/copy-command';
import { PhasePlan, RoleSteps, Stage, StatusTrack } from '@/components/gw/how-it-works';
import { ContextComparison, ReReadStaircase } from '@/components/gw/problem';
import { ButtonLink, Section } from '@/components/gw/section';
import { Source } from '@/components/gw/source';
import { StatusPill } from '@/components/gw/status';
import { ChatLines, Terminal } from '@/components/gw/terminal';
import { measurementsUrl, phase1Main, resume, usd } from '@/lib/data/calculator';

const n = (x: number) => x.toLocaleString('en-US');
const m = (anchor: string) => `${measurementsUrl}#${anchor}`;

const problems = [
  {
    title: 'The plan lives in scrollback',
    body: 'When the chat is summarized to make room, or you open a new one, what was decided goes with it. The next session starts from zero.',
  },
  {
    title: '“Done” is a claim',
    body: 'The model says it works. Whether anything was checked, and how you would check it yourself, is left to you.',
  },
  {
    title: 'Yesterday’s rules are gone',
    body: 'The mistake you corrected comes back, because nothing wrote it down where the next session will read it.',
  },
];

const benefits = [
  {
    title: 'You always know where things stand',
    body: 'A short note in your project says what’s done, what’s in progress and what’s next, in plain sentences. Every new chat reads it first.',
    looks: '“Card 1.1 Number entry is built and waiting for your approval.”',
  },
  {
    title: 'Nothing is “done” without proof',
    body: 'The AI writes the checks before the code, and a second AI that never saw the work reruns them. You get the proof, not a promise.',
    looks: '58 checks passing, each written before its code.',
  },
  {
    title: 'You stay in charge',
    body: 'Nothing is saved to your project’s history until you say so. Every stop tells you what changed, how to try it yourself, and what to watch out for.',
    looks: 'What changed · How to check · Caveats → /gw-approve',
  },
  {
    title: 'Big ideas, small steps',
    body: 'Your idea is broken into small pieces you can follow one at a time. A typo fix stays a quick fix; a feature gets a plan.',
    looks: 'a calculator → 2 phases → 6 cards',
  },
  {
    title: 'It learns from its mistakes',
    body: 'When something goes wrong, it’s written down. If it happens again it becomes a rule; if it keeps happening, it gets blocked outright.',
    looks: 'note → rule → guard',
  },
  {
    title: 'Use the AI you already have',
    body: 'Works in Claude Code, OpenCode, or any AI tool that can read files. Switch tools or models halfway through; the project stays the same.',
    looks: 'plain markdown files in your repo',
  },
];

export default function HomePage() {
  const ratio = (resume.without.processed / resume.with.processed).toFixed(1);
  return (
    <main className="dot-grid flex-1">
      {/* Hero */}
      <section className="page-container pt-20 pb-10 sm:pt-28">
        <p className="type-label mb-5">Open source · Any tool</p>
        <h1 className="type-display max-w-4xl">
          Spec, proof, approval.
          <br />
          <span className="text-muted">A workflow your AI agent can’t skip.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Your agent writes the code. Groundwork is the project layer: it owns the spec, the cards, the evidence and
          the approvals, in files, so any session can pick up where the last one stopped.
        </p>
      </section>

      {/* The problem */}
      <Section
        label="The problem"
        title="A chat gets heavier with every message."
        intro="AI models don’t remember anything between calls. To answer your next message, the tool sends the model the entire conversation again: every earlier message, every file it opened, every command’s output. Then a little more on top."
      >
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <ReReadStaircase />
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-5">
              <p className="type-label mb-2">Measured, one real chat</p>
              <p className="font-mono text-4xl font-semibold tracking-tight">
                {Math.round(phase1Main.reRead / phase1Main.fresh)}×
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The first phase of our calculator build ran in one chat: {phase1Main.calls} calls produced{' '}
                {Math.round(phase1Main.fresh / 1000)}k tokens of new work and re-read{' '}
                <strong className="text-foreground">{(phase1Main.reRead / 1e6).toFixed(1)}M</strong> tokens to do it. By
                the end, each call carried 280k tokens of history.
              </p>
              <p className="mt-3">
                <Source href={m('every-session')}>measurements</Source>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5 text-sm leading-relaxed text-muted">
              <p>
                <strong className="text-foreground">Caching makes re-reads cheaper, not free.</strong> Every re-read token
                still takes up room in the model’s window, and a window has an end. When it fills, the tool summarizes
                the chat to make space, and details from early on can be lost.
              </p>
            </div>
          </div>
        </div>

        <h3 className="type-heading mt-16 text-xl sm:text-2xl">What your AI tool does about it</h3>
        <p className="mt-3 mb-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Claude Code and OpenCode both manage the window for you, and both load a rules file into every session. What
          neither keeps is the state of your project: what’s done, what’s next, what was agreed. That’s the part
          Groundwork adds, working inside either tool.
        </p>
        <ContextComparison />
        <p className="mt-3 text-xs text-muted">
          From each tool’s documentation:{' '}
          <a className="underline underline-offset-4" href="https://code.claude.com/docs/en/how-claude-code-works" target="_blank" rel="noreferrer">
            Claude Code
          </a>{' '}
          ·{' '}
          <a className="underline underline-offset-4" href="https://opencode.ai/docs/config/" target="_blank" rel="noreferrer">
            OpenCode
          </a>
          .
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {problems.map((p) => (
            <div key={p.title} className="bg-background p-6">
              <h3 className="font-mono text-sm font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Before / after */}
      <Section label="Before and after" title="The difference isn’t answer quality. It’s that the project survives the session.">
        <p className="type-label mb-3">Starting a feature</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Terminal title="without groundwork">
            <ChatLines
              lines={[
                { who: 'you', text: 'Add voting to my book club app.' },
                { who: 'agent', text: 'Done! A clean voting page with results and a summary.' },
                { who: 'note', text: 'Is it tested? What was I doing yesterday? Which parts moved?' },
              ]}
            />
          </Terminal>
          <Terminal title="with groundwork">
            <ChatLines
              lines={[
                { who: 'you', text: '/gw a page where my book club votes on next month’s book' },
                { who: 'agent', text: 'Who can vote? One vote or rank several? Hide results until it closes?' },
                { who: 'you', text: 'Anyone with the link. One vote. Hide results.' },
                {
                  who: 'agent',
                  text: (
                    <>
                      Spec saved. Card 1.1: tests written, code passing, review passed.{' '}
                      <StatusPill status="waiting" className="ml-1" />
                    </>
                  ),
                },
                { who: 'you', text: '/gw-approve' },
                { who: 'agent', text: 'Committed [1.1] Book list page. Next up: card 1.2 Voting.' },
              ]}
            />
          </Terminal>
        </div>

        <div className="mt-12 mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="type-label">The next day, a new session</p>
          <p className="font-mono text-[11px] text-muted">a real run on the finished calculator · one run each</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Terminal title="groundwork removed" className="flex flex-col" bodyClassName="flex flex-1 flex-col">
            <ChatLines
              lines={[
                { who: 'you', text: 'Where does this project stand and what should we do next? Look around and tell me.' },
                {
                  who: 'note',
                  text: (
                    <span className="block space-y-0.5">
                      <span className="block">→ list the files in the repo</span>
                      <span className="block">→ git log --oneline -15; git status</span>
                      <span className="block">→ read folders outside the project</span>
                      <span className="block">… {resume.without.toolCalls} tool calls in all</span>
                    </span>
                  ),
                },
                {
                  who: 'agent',
                  text: 'There is no README, spec, handoff, or any file that says what the project is or what’s next — everything below had to be reconstructed from git history.',
                },
              ]}
            />
            <dl className="mt-auto grid grid-cols-3 border-t border-border font-mono text-xs">
              <div className="p-3">
                <dt className="text-muted">calls</dt>
                <dd className="mt-0.5 text-base font-semibold">{resume.without.calls}</dd>
              </div>
              <div className="border-l border-border p-3">
                <dt className="text-muted">tokens read</dt>
                <dd className="mt-0.5 text-base font-semibold">{Math.round(resume.without.processed / 1000)}k</dd>
              </div>
              <div className="border-l border-border p-3">
                <dt className="text-muted">cost</dt>
                <dd className="mt-0.5 text-base font-semibold">{usd(resume.without.cost, 4)}</dd>
              </div>
            </dl>
          </Terminal>
          <Terminal title="with groundwork" className="flex flex-col" bodyClassName="flex flex-1 flex-col">
            <ChatLines
              lines={[
                { who: 'you', text: '/gw' },
                {
                  who: 'note',
                  text: (
                    <span className="block space-y-0.5">
                      <span className="block">→ read .groundwork/HANDOFF.md</span>
                      <span className="block">→ read the two phase 2 cards</span>
                      <span className="block">… {resume.with.toolCalls} tool calls in all</span>
                    </span>
                  ),
                },
                {
                  who: 'agent',
                  text: 'Where things stand: Phase 2 Browser UI is built — cards 2.1 and 2.2 are done and committed, the full suite is green (58/58), and the deploy is live. Nothing is in progress; it’s waiting on your phase review.',
                },
              ]}
            />
            <dl className="mt-auto grid grid-cols-3 border-t border-border font-mono text-xs">
              <div className="p-3">
                <dt className="text-muted">calls</dt>
                <dd className="mt-0.5 text-base font-semibold">{resume.with.calls}</dd>
              </div>
              <div className="border-l border-border p-3">
                <dt className="text-muted">tokens read</dt>
                <dd className="mt-0.5 text-base font-semibold">{Math.round(resume.with.processed / 1000)}k</dd>
              </div>
              <div className="border-l border-border p-3">
                <dt className="text-muted">cost</dt>
                <dd className="mt-0.5 text-base font-semibold">{usd(resume.with.cost, 4)}</dd>
              </div>
            </dl>
          </Terminal>
        </div>
      </Section>

      {/* How it works */}
      <Section
        id="how-it-works"
        label="How it works"
        title="Small pieces of work, each proven, each approved by you."
        intro="An AI does its best work when the whole task fits in view. So Groundwork never hands it “build the app”. It breaks your idea into pieces small enough to finish and check in one sitting, and runs each piece through the same steps."
      >
        <ol>
          <Stage n="01" title="Spec: say what you want">
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
              You describe the idea in a sentence. The agent asks a few specific questions, suggesting the smallest
              useful version first, and writes the answers into <code className="font-mono text-foreground">SPEC.md</code>. Choices
              like the language or framework are yours: it lays out options with trade-offs and records your pick.
            </p>
          </Stage>

          <Stage n="02" title="Plan: phases of cards">
            <div className="grid max-w-3xl gap-4 text-[15px] leading-relaxed text-muted sm:grid-cols-2">
              <p>
                <strong className="text-foreground">A card</strong> is one small piece of work, named after the cards on
                a task board. It says what “done” looks like as a short list of checkable promises. Each card is small
                enough for one session, so the AI starts every card with a small, focused context.
              </p>
              <p>
                <strong className="text-foreground">A phase</strong> is a group of cards that together give you something
                you can try, like a milestone. You can approve card by card, or once at the end of each phase.
              </p>
            </div>
            <p className="mt-6 mb-3 font-mono text-xs text-muted">the calculator’s real plan</p>
            <PhasePlan />
          </Stage>

          <Stage n="03" title="Build: three roles per card">
            <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-muted">
              Your main chat, the <strong className="text-foreground">runner</strong>, never builds anything itself. It
              hands each card to three roles in turn. Each role runs as a separate session that reads only the card,
              its own instructions and the code the card touches, so none of them inherits a heavy chat.
            </p>
            <RoleSteps />
          </Stage>

          <Stage n="04" title="Approve: nothing is saved until you say so" last>
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
              The runner stops and tells you, in plain words, what changed, how to check it yourself, and any caveats.{' '}
              <code className="font-mono text-foreground">/gw-approve</code> saves it to your project’s history and moves
              to the next card. <code className="font-mono text-foreground">/gw-reject</code> sends it back with your
              reason.
            </p>
          </Stage>
        </ol>

        <div className="mt-14 rounded-xl border border-border bg-surface/60 p-5 sm:p-6">
          <p className="type-label mb-6">Every card moves through, in order</p>
          <StatusTrack />
        </div>
        <p className="mt-6 text-sm">
          <Link href="/docs/guides/walkthrough" className="underline underline-offset-4">
            Watch it happen on a real build →
          </Link>
        </p>
      </Section>

      {/* What you get */}
      <Section
        label="What you get"
        title="You don’t need to read code to know what your AI did."
        intro="Groundwork keeps a plain-language record of the project that you, your AI and anyone you work with can read. Here’s what that means day to day."
      >
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="flex flex-col bg-background p-6">
              <h3 className="font-mono text-sm font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
              <p className="mt-auto border-t border-border pt-3 font-mono text-xs text-muted [&]:mt-5">{b.looks}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* What it costs */}
      <Section
        label="What it costs"
        title="Catching up shouldn’t mean re-reading the project."
        intro="A fresh session in the finished calculator, asked where the project stands. Without Groundwork the agent has to rebuild the picture from files and git history; with it, it reads a short note."
      >
        <div className="rounded-xl border border-border bg-surface/60 p-5 sm:p-8">
          <div className="space-y-5">
            {(
              [
                ['Groundwork removed', resume.without, 'var(--series-chat)'],
                ['With Groundwork', resume.with, 'var(--series-gw)'],
              ] as const
            ).map(([label, r, color]) => (
              <div key={label}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>{label}</span>
                  <span className="font-mono">
                    <strong className="text-lg">{n(r.processed)}</strong> <span className="text-muted">tokens read</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-r-[4px]">
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{ width: `${(r.processed / resume.without.processed) * 100}%`, background: color }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-xs text-muted">
                  {r.calls} model calls · {r.toolCalls} tool calls · {usd(r.cost, 4)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <p className="font-mono text-5xl font-semibold tracking-tight">{ratio}×</p>
            <p className="text-sm leading-relaxed text-muted">
              fewer tokens to answer “where are we?”, and the answer was right. Without written state, catching up costs
              whatever there is to read, and a bigger project has more. One run each, on a small app, so read it as the
              shape to expect.{' '}
              <Source href={m('resuming-where-does-the-project-stand')}>measurements</Source>
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Building has a cost too: three roles and a review per card. On a small app, a single chat is cheaper.{' '}
          <Link href="/proof" className="text-foreground underline underline-offset-4">
            See the full breakdown →
          </Link>
        </p>
      </Section>

      {/* Install */}
      <Section className="pb-28 text-center">
        <h2 className="type-heading mx-auto">Start with one command.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted">
          Run it in a new folder or an existing project, then open your AI tool and type{' '}
          <code className="font-mono text-foreground">/gw</code>. The docs cover the rest.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CopyCommand command="npx groundwork-ai init" />
          <ButtonLink href="/docs">Read the docs →</ButtonLink>
        </div>
      </Section>
    </main>
  );
}

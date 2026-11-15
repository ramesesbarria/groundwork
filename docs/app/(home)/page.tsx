import Link from 'next/link';
import { CopyCommand } from '@/components/gw/copy-command';
import { BriefTerminal, MemoryLoop } from '@/components/gw/memory-loop';
import { ButtonLink, Section } from '@/components/gw/section';

const problems = [
  { title: 'You explain it all again', body: 'The stack, the decisions, the thing you were halfway through. Every new chat.' },
  { title: 'Your notes go stale', body: 'Three commits later the handoff still reads as current. Nothing tells you it isn’t.' },
  { title: 'Switching tools resets you', body: 'A different tool or model knows nothing about what the last one did.' },
];

const verdicts = [
  { name: 'fresh', meaning: 'Written at the current commit' },
  { name: 'behind', meaning: 'Commits landed since. Up to 8 are listed, with the files they changed' },
  { name: 'diverged', meaning: 'Its commit isn’t in this branch’s history: a rebase, a reset, another branch' },
  { name: 'stale', meaning: 'Older than 14 days by default' },
  { name: 'unstamped', meaning: 'Never saved, so there is nothing to compare' },
];

const benefits = [
  { title: 'Resume where you stopped', body: 'Every session opens knowing where you stopped and what comes next.', href: '/docs/concepts/handoff' },
  { title: 'See what changed', body: 'Commits that landed since the last save are listed, so old notes can’t pass as current.', href: '/docs/concepts/freshness' },
  { title: 'Keep decisions decided', body: 'Record a choice and its reason once. Agents stop reopening it.', href: '/docs/concepts/decisions' },
  { title: 'Learn a lesson once', body: 'Write down a lesson and every later session has it.', href: '/docs/concepts/lessons-ledger' },
  { title: 'Run agents in parallel', body: 'Each parallel agent keeps its own notes, so they don’t collide in git.', href: '/docs/concepts/parallel-agents' },
  { title: 'Own the files', body: 'Markdown in your repo, committed with your code. No account, no server.', href: '/docs/reference/project-files' },
];

const tools = [
  { name: 'Claude Code', href: '/docs/adapters/claude-code' },
  { name: 'OpenCode', href: '/docs/adapters/opencode' },
  { name: 'Codex', href: '/docs/adapters/codex' },
  { name: 'Cursor', href: '/docs/adapters/cursor' },
  { name: 'Gemini CLI', href: '/docs/adapters/gemini' },
  { name: 'Anything with AGENTS.md', href: '/docs/adapters/other-tools' },
];

export default function HomePage() {
  return (
    <main className="dot-grid flex-1">
      {/* Hero */}
      <section className="page-container pt-20 pb-10 sm:pt-28">
        <p className="type-label mb-5">Project memory for coding agents</p>
        <h1 className="type-display max-w-4xl">
          Your AI forgets.
          <br />
          <span className="text-muted">Your project doesn’t.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Close the chat, switch tools, change models. The next session picks up where you stopped, and checks the
          notes against your repo before it trusts them.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CopyCommand command="npx groundwork-ai init" />
          <ButtonLink href="/quickstart" variant="secondary">
            Quickstart →
          </ButtonLink>
        </div>
        <div className="mt-12 max-w-3xl">
          <BriefTerminal />
          <p className="mt-3 text-xs text-muted">What a new session reads first. Real output.</p>
        </div>
      </section>

      {/* The problem */}
      <Section label="The problem" title="Every new session starts from zero.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {problems.map((p) => (
            <div key={p.title} className="bg-background p-6">
              <h3 className="font-mono text-sm font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how-it-works" label="How it works" title="Work. It remembers. Pick up anywhere.">
        <MemoryLoop className="my-0" />
      </Section>

      {/* Why you can trust it */}
      <Section label="Why you can trust it" title="Stale notes can’t pass as current.">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <p className="text-[15px] leading-relaxed text-muted">
              Every time a session starts, Groundwork compares the handoff with the repository and gives one verdict,
              with the commits and files that changed.
            </p>
            <div className="mt-6 border-l-2 border-accent pl-4">
              <p className="text-base leading-relaxed text-foreground">
                “Trust the code over the handoff where they disagree, then save an updated handoff.”
              </p>
              <p className="mt-1 text-xs text-muted">What the agent is told when the two disagree.</p>
            </div>
            <p className="mt-6 text-sm">
              <Link href="/docs/concepts/freshness" className="text-foreground underline underline-offset-4">
                How freshness works →
              </Link>
            </p>
          </div>
          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {verdicts.map((v) => (
              <div key={v.name} className="flex gap-4 bg-background px-5 py-3">
                <dt className="w-24 shrink-0 font-mono text-sm font-semibold">{v.name}</dt>
                <dd className="text-sm leading-relaxed text-muted">{v.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
          What it checks is staleness, not truth: a handoff written at the current commit is{' '}
          <span className="font-mono text-foreground">fresh</span> even if what it says is wrong.
        </p>
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            The numbers are published in full, including the bad ones: 13 of 15 multi-session runs with Groundwork, 7
            of 15 without, at about 4× the API cost per solo task. Measured on 1.0 with the flow on, so it doesn’t
            isolate memory.
          </p>
          <ButtonLink href="/docs/results" variant="secondary">
            Results →
          </ButtonLink>
        </div>
      </Section>

      {/* What you get */}
      <Section label="What you get" title="A project that remembers.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <Link key={b.title} href={b.href} className="flex flex-col bg-background p-6 hover:bg-surface">
              <h3 className="font-mono text-sm font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Supported tools */}
      <Section label="Works with" title="Use the AI you already have.">
        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {tools.map((t) => (
            <li key={t.name} className="bg-background">
              <Link href={t.href} className="block p-5 font-mono text-sm font-semibold hover:bg-surface">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          No demo videos of sessions that didn’t happen. Each integration is built from its tool’s hook documentation
          and tested as a process — and until it has run inside a live session, we say so.
        </p>
      </Section>

      {/* The flow */}
      <Section label="Optional" title="Want more structure?">
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
          Turn on the guided workflow: a spec, small tasks built one at a time, and your approval before each commit.{' '}
          <Link href="/docs/flow" className="text-foreground underline underline-offset-4">
            The flow →
          </Link>
        </p>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Coming from 1.x? Upgrading keeps everything you made.{' '}
          <Link href="/docs/getting-started/upgrading" className="text-foreground underline underline-offset-4">
            Upgrading →
          </Link>
        </p>
      </Section>

      {/* Install */}
      <Section className="pb-28 text-center">
        <h2 className="type-heading mx-auto">Start with one command.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted">
          Run it in your project, open your AI tool, and type <code className="font-mono text-foreground">/gw</code>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CopyCommand command="npx groundwork-ai init" />
          <ButtonLink href="/docs">Read the docs →</ButtonLink>
        </div>
      </Section>
    </main>
  );
}

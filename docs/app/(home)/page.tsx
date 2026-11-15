import Link from 'next/link';
import { CopyCommand } from '@/components/gw/copy-command';
import { BriefTerminal, MemoryLoop } from '@/components/gw/memory-loop';
import { ButtonLink, Section } from '@/components/gw/section';

const problems = [
  { title: 'You explain it all again', body: 'The stack, the decisions, the thing you were halfway through. Every new chat.' },
  { title: 'Your notes go stale', body: 'Three commits later the handoff still reads as current. Nothing tells you it isn’t.' },
  { title: 'Switching tools resets you', body: 'A different tool or model knows nothing about what the last one did.' },
];

const checks = [
  { title: 'It notices what changed', body: 'Every session checks your notes against the code. If work landed since the last save, it says what.' },
  { title: 'It flags the risky parts', body: 'If your next step names a file that has changed since, the agent hears about it first.' },
  { title: 'The code wins', body: 'When the notes and the code disagree, the agent trusts the code, then updates the notes.' },
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
      <Section label="Why you can trust it" title="Old notes can’t fool your agent.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {checks.map((c) => (
            <div key={c.title} className="bg-background p-6">
              <h3 className="font-mono text-sm font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href="/docs/concepts/freshness" className="text-foreground underline underline-offset-4">
            How it works →
          </Link>
        </p>
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

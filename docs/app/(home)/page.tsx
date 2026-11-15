import Link from 'next/link';
import { CopyCommand } from '@/components/gw/copy-command';
import { BriefTerminal, MemoryLoop, Verdicts } from '@/components/gw/memory-loop';
import { ButtonLink, Section } from '@/components/gw/section';
import { Terminal } from '@/components/gw/terminal';
import { asset } from '@/lib/shared';

const problems = [
  {
    title: 'A new session starts from zero',
    body: 'A fresh chat, a different tool or another model knows nothing about what was decided, where things are, or what was in progress.',
  },
  {
    title: 'The handoff is written at the worst moment',
    body: 'A note the model writes at the end of its context is written when it knows least about what matters, and only if it remembers to.',
  },
  {
    title: 'A stale handoff looks fresh',
    body: 'It has no time, commit or branch. Three commits later it still reads as current, and the next session acts on it with full confidence.',
  },
];

const memory = [
  { file: 'HANDOFF.md', body: 'Where things stand: Now, Next, blockers, failing checks. Stamped by the CLI with time, commit, branch and writer.', href: '/docs/concepts/handoff' },
  { file: 'MAP.md', body: 'Where things are: folders, entry points, tests, traps. Written by the agent, checked by doctor.', href: '/docs/concepts/map' },
  { file: 'DECISIONS.md', body: 'A generated index of one record per decision, with the options and the reason.', href: '/docs/concepts/decisions' },
  { file: 'LESSONS.md', body: 'What went wrong once and must not again: a note, or a rule promoted into AGENTS.md.', href: '/docs/concepts/lessons-ledger' },
  { file: 'JOURNAL.md', body: 'One entry per checkpoint, derived from git: the commits and files since the last one.', href: '/docs/concepts/journal' },
  { file: 'budgets', body: 'Each file has a token budget that doctor checks. compact archives old material and never deletes.', href: '/docs/concepts/budgets-and-compaction' },
];

const tools = [
  { name: 'Claude Code', body: 'Hooks at session start, stop, before compaction and session end, and a /gw skill.' },
  { name: 'OpenCode', body: 'A plugin: the brief at session start, a checkpoint when the session goes idle, instructions at compaction.' },
  { name: 'Codex', body: 'Hooks at session start, stop, before compaction and session end, and $gw skills. Trust the hooks once with /hooks; the compaction summary is not told what to keep.' },
  { name: 'Cursor', body: 'Hooks at conversation start, stop, before compaction and session end, and /gw skills. A resumed conversation relies on AGENTS.md for the brief.' },
  { name: 'Gemini CLI', body: 'Hooks at session start, after each response, before compression and session end, and /gw commands. Google’s docs say it stays available with paid API keys.' },
  { name: 'Anything else', body: 'AGENTS.md tells the agent to run brief first and to save with checkpoint.' },
];

// From the 1.0 comparison (docs/results): OpenCode 2.0.32 with DeepSeek Flash, 3 runs per task, flow on.
const results = [
  { label: 'Work across sessions', value: '13/15 vs 7/15', body: 'Tasks where requirements or decisions from one session were needed in a later one.' },
  { label: 'Work in one session', value: '12/12 vs 12/12', body: 'Self-contained tasks: a plain session did as well.' },
  { label: 'The cost', value: '≈4× · ≈3×', body: 'API cost and time per solo task, median, with Groundwork.' },
];

export default function HomePage() {
  return (
    <main className="dot-grid flex-1">
      {/* Hero */}
      <section className="page-container pt-20 pb-10 sm:pt-28">
        <p className="type-label mb-5">Open source · Any tool</p>
        <h1 className="type-display max-w-4xl">
          Project memory for coding agents.
          <br />
          <span className="text-muted">Any session, tool or model resumes where the last one stopped.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Groundwork keeps what your project knows in your repo, as plain files: a handoff stamped against git, a map of
          the codebase, decisions, lessons and a journal. Each session starts from a brief that says where things stand
          and how far the handoff can be trusted.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CopyCommand command="npx groundwork-ai init" />
          <ButtonLink href="/quickstart" variant="secondary">
            Quickstart →
          </ButtonLink>
        </div>
        <div className="mt-12 max-w-3xl">
          <BriefTerminal />
          <p className="mt-3 text-xs text-muted">
            Real output of <code className="font-mono">groundwork brief</code> in a throwaway repo: a checkpoint, then two
            commits that landed after it.
          </p>
        </div>
      </section>

      {/* The problem */}
      <Section
        label="The problem"
        title="The chat is the memory, and the chat ends."
        intro="When a session ends or fills up, what was decided, why, and where the work stands go with it. The usual fix is a handoff note written by the model. It has two weaknesses."
      >
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
      <Section
        id="how-it-works"
        label="How it works"
        title="Work, checkpoint, resume."
        intro="The CLI writes the facts: time, commit, branch, uncommitted files, who wrote it. The agent writes only the judgment: what is in progress and what is next. Hooks save at the moments that matter, where the tool has them."
      >
        <MemoryLoop className="mt-0" />
        <Terminal title="a checkpoint" className="max-w-3xl">
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed sm:text-[13px]">
            <code>
              <span className="block text-muted">$ npx groundwork-ai checkpoint --now &quot;Login form renders; validation is not wired to the API&quot; \</span>
              <span className="block text-muted">    --next &quot;Wire validation in src/login.ts, then add the first test&quot;</span>
              <span className="block">Checkpoint saved: .groundwork/HANDOFF.md at 5c4bcc2 on main.</span>
              <span className="block">Journal: one entry added to .groundwork/JOURNAL.md.</span>
            </code>
          </pre>
        </Terminal>
      </Section>

      {/* Freshness */}
      <Section
        label="Freshness"
        title="A handoff is never taken on trust."
        intro="Every time one is loaded, its stamp is compared with the repository, and you get one verdict with the concrete delta. An automatic checkpoint never claims what it doesn’t know: a handoff nobody touched stays behind, and the agent is asked to save it."
      >
        <Verdicts />
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Freshness is about the repository, not the truth: a handoff stamped at HEAD is fresh even if its prose is wrong.{' '}
          <Link href="/docs/concepts/freshness" className="text-foreground underline underline-offset-4">
            How the verdicts work →
          </Link>
        </p>
      </Section>

      {/* What's in the memory */}
      <Section label="The memory set" title="Plain files in your repo." intro="Committed with your code, readable by any tool, and small by design.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {memory.map((m) => (
            <Link key={m.file} href={m.href} className="flex flex-col bg-background p-6 hover:bg-surface">
              <h3 className="font-mono text-sm font-semibold">{m.file}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* Parallel agents */}
      <Section
        label="Parallel agents"
        title="One writer per handoff."
        intro="The root handoff belongs to the main checkout. A linked worktree, a task branch or a named worker gets its own file, so parallel agents never conflict in git, and a ledger records who is doing what."
      >
        <Terminal title="workers" className="max-w-3xl">
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed sm:text-[13px]">
            <code>
              <span className="block text-muted">$ npx groundwork-ai worker start auth-tests --goal &quot;Write the auth test suite&quot;</span>
              <span className="block">Worker auth-tests recorded: added to Workers in flight in .groundwork/HANDOFF.md</span>
              <span className="block">and to .groundwork/work/LEDGER.md.</span>
            </code>
          </pre>
        </Terminal>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Two sessions sharing one handoff get a warning, not a refusal.{' '}
          <Link href="/docs/concepts/parallel-agents" className="text-foreground underline underline-offset-4">
            Parallel agents →
          </Link>
        </p>
      </Section>

      {/* Supported tools */}
      <Section label="Supported tools" title="Use the AI you already have.">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {tools.map((t) => (
            <div key={t.name} className="bg-background p-6">
              <h3 className="font-mono text-sm font-semibold">{t.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Not yet verified: the 2.0 hooks have been run as processes with each tool’s documented input, not inside a live
          Claude Code, OpenCode, Codex, Cursor or Gemini CLI session, and OpenCode’s idle-event checkpoint hasn’t been tried live. The Codex, Cursor and Gemini CLI adapters follow each tool’s documentation and have never run inside the tool. Hooks never block
          work: they always exit 0 and give up after 8 seconds.
        </p>
      </Section>

      {/* The flow */}
      <Section
        label="Optional"
        title="The development flow is still here."
        intro="Groundwork 1.0 was a workflow: a spec, small cards, a tester, an implementer and a reviewer, and your approval before each commit. It is now an add-on. Turn it on with init --flow, or flow on later; flow off removes it and keeps what you made."
      >
        <figure className="max-w-3xl">
          <Terminal title="the flow, recorded on 1.0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset('/demo-first-session.gif')}
              alt="An OpenCode session on 1.0 with the flow on: /gw sets the project up, interviews for the spec, and writes the plan of cards."
              className="block w-full"
              loading="lazy"
            />
          </Terminal>
          <figcaption className="mt-3 text-xs text-muted">
            This recording shows the optional flow as it ran on 1.0. It is not the default install.
          </figcaption>
        </figure>
        <p className="mt-4 text-sm">
          <Link href="/docs/flow" className="text-foreground underline underline-offset-4">
            About the flow →
          </Link>
        </p>
      </Section>

      {/* Results */}
      <Section
        label="Results"
        title="One comparison, measured on 1.0 with the flow on."
        intro="The same agent and tasks, with and without Groundwork. This was not rerun for 2.0, so it says nothing about project memory alone."
      >
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {results.map((r) => (
            <div key={r.label} className="bg-background p-6">
              <p className="type-label mb-2">{r.label}</p>
              <p className="font-mono text-3xl font-semibold tracking-tight">{r.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          OpenCode 2.0.32 with DeepSeek Flash, 3 runs per task, scored by tests the agent never saw. One agent and model
          can’t show how others behave.{' '}
          <Link href="/docs/results" className="text-foreground underline underline-offset-4">
            How it was tested, and what it doesn’t show →
          </Link>
        </p>
      </Section>

      {/* Upgrading */}
      <Section label="From 1.x" title="Upgrading keeps the flow on and loses nothing.">
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
          <code className="font-mono text-foreground">npx groundwork-ai upgrade</code> leaves the flow on and adds project
          memory underneath. Your spec, cards, evidence, decisions, lessons, handoff and edits are never touched.{' '}
          <Link href="/docs/getting-started/upgrading" className="text-foreground underline underline-offset-4">
            Upgrading from 1.x →
          </Link>
        </p>
      </Section>

      {/* Install */}
      <Section className="pb-28 text-center">
        <h2 className="type-heading mx-auto">Start with one command.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted">
          Run it in a git repo, new or existing, then open your AI tool and type{' '}
          <code className="font-mono text-foreground">/gw</code>. Needs Node.js 22 or later.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CopyCommand command="npx groundwork-ai init" />
          <ButtonLink href="/docs">Read the docs →</ButtonLink>
        </div>
      </Section>
    </main>
  );
}

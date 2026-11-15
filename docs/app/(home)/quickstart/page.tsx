import type { Metadata } from 'next';
import { CopyCommand } from '@/components/gw/copy-command';
import { Stage } from '@/components/gw/how-it-works';
import { BriefTerminal } from '@/components/gw/memory-loop';
import { ButtonLink } from '@/components/gw/section';
import { ChatLines, Terminal } from '@/components/gw/terminal';

export const metadata: Metadata = {
  title: 'Quickstart',
  description: 'Install Groundwork, type /gw, and the next session picks up where this one stopped.',
};

const tools = ['Claude Code', 'OpenCode', 'Codex', 'Cursor', 'Gemini CLI', 'Plain markdown'];

const commands = [
  ['/gw', 'In your AI tool: resume, and save. The only one to remember.'],
  ['brief', 'npx groundwork-ai brief: where things stand, and what changed since.'],
  ['checkpoint', 'npx groundwork-ai checkpoint --now "…" --next "…": save by hand.'],
  ['doctor', 'npx groundwork-ai doctor: check that everything is healthy.'],
];

export default function QuickstartPage() {
  return (
    <main className="flex-1">
      <header className="dot-grid border-b border-border">
        <div className="page-container py-16 sm:py-20">
          <p className="type-label mb-4">Quickstart</p>
          <h1 className="type-display max-w-3xl">Three steps. One minute.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Install it, type one command, and your next session picks up where this one stopped.
          </p>
        </div>
      </header>

      <section className="page-container py-14 sm:py-16">
        <ol className="max-w-3xl">
          <Stage n="01" title="Add Groundwork to your project">
            <CopyCommand command="npx groundwork-ai init" />
            <p className="mt-5 mb-3 text-[15px] leading-relaxed text-muted">Pick your AI tool when it asks:</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tools.map((name) => (
                <li key={name} className="rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm font-semibold">
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Needs Node.js 22 or later and git. Your existing files are never replaced.
            </p>
          </Stage>

          <Stage n="02" title="Open your AI tool and type /gw">
            <Terminal title="your ai tool">
              <ChatLines
                lines={[
                  { who: 'you', text: '/gw' },
                  { who: 'agent', text: 'Nothing is recorded yet. What is this project called, and what does it do?' },
                  { who: 'you', text: 'A book club site. Members vote on next month’s book.' },
                  { who: 'agent', text: 'Filled in AGENTS.md and MAP.md. What do you want to work on first?' },
                ]}
              />
            </Terminal>
            <p className="mt-3 text-sm text-muted">
              In Codex it is <code className="font-mono">$gw</code>. With plain markdown, ask your agent to{' '}
              <em className="text-foreground">“read .groundwork/commands/gw.md and follow it”</em>.
            </p>
          </Stage>

          <Stage n="03" title="Work, then come back anywhere" last>
            <p className="mb-4 text-[15px] leading-relaxed text-muted">
              The agent saves as it goes. Open a new session, in any tool or model, and it starts here:
            </p>
            <BriefTerminal />
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Where you stopped, what is next, and what changed while you were away.
            </p>
          </Stage>
        </ol>
      </section>

      <section className="page-container pb-14">
        <p className="type-label mb-3">Cheat sheet</p>
        <h2 className="type-heading">Four commands cover it.</h2>
        <dl className="mt-6 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
          {commands.map(([cmd, what]) => (
            <div key={cmd} className="grid gap-1 bg-background px-5 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="font-mono text-sm font-semibold">{cmd}</dt>
              <dd className="text-sm text-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="page-container pb-28">
        <div className="flex max-w-3xl flex-col gap-5 rounded-xl border border-border bg-surface/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted">
            Running several agents, or want approvals before each commit? It is all in the docs.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/docs">Read the docs →</ButtonLink>
            <ButtonLink href="/docs/getting-started/first-10-minutes" variant="secondary">
              Your first 10 minutes
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import { CopyCommand } from '@/components/gw/copy-command';
import { Stage } from '@/components/gw/how-it-works';
import { ButtonLink } from '@/components/gw/section';
import { StatusPill } from '@/components/gw/status';
import { ChatLines, Terminal } from '@/components/gw/terminal';

export const metadata: Metadata = {
  title: 'Quickstart',
  description: 'Install Groundwork, type /gw, and get your first piece of work built and approved. The basics, nothing more.',
};

const tools = [
  ['Claude Code', 'native commands and subagents'],
  ['OpenCode', 'native commands and subagents'],
  ['Anything else', 'plain markdown files any AI tool can read'],
];

const commands = [
  ['/gw', 'Start, or carry on where you left off. The only one you need to remember.'],
  ['/gw-approve', 'Accept the finished work. It gets saved to your project’s history.'],
  ['/gw-reject', 'Send it back, with a reason. It goes around again.'],
  ['/gw-quick', 'A small change or bug fix, without the full process.'],
];

export default function QuickstartPage() {
  return (
    <main className="flex-1">
      <header className="dot-grid border-b border-border">
        <div className="page-container py-16 sm:py-20">
          <p className="type-label mb-4">Quickstart</p>
          <h1 className="type-display max-w-3xl">Up and running in five minutes.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            The basics: install it, type one command, and approve your first piece of work. Everything else is in the
            docs when you need it.
          </p>
        </div>
      </header>

      <section className="page-container py-14 sm:py-16">
        <ol className="max-w-3xl">
          <Stage n="01" title="Check you have Node.js 22 or later">
            <p className="text-[15px] leading-relaxed text-muted">
              Run <code className="font-mono text-foreground">node --version</code>. If it’s older than 22, or missing:
            </p>
            <ul className="mt-4 grid gap-2 font-mono text-[13px] sm:grid-cols-3">
              {[
                ['Windows', 'winget install OpenJS.NodeJS.LTS'],
                ['macOS', 'brew install node'],
                ['Linux', 'nvm install --lts'],
              ].map(([os, cmd]) => (
                <li key={os} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="block text-[11px] text-muted">{os}</span>
                  {cmd}
                </li>
              ))}
            </ul>
          </Stage>

          <Stage n="02" title="Add Groundwork to your project">
            <p className="mb-4 text-[15px] leading-relaxed text-muted">
              In your project’s folder, new or existing, run:
            </p>
            <CopyCommand command="npx groundwork-ai init" />
            <p className="mt-5 mb-3 text-[15px] leading-relaxed text-muted">It asks which AI tool you use:</p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {tools.map(([name, what]) => (
                <li key={name} className="rounded-lg border border-border bg-background px-3 py-2.5">
                  <span className="block font-mono text-sm font-semibold">{name}</span>
                  <span className="text-xs text-muted">{what}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">Your existing files are never replaced.</p>
          </Stage>

          <Stage n="03" title="Open your AI tool and type /gw">
            <p className="text-[15px] leading-relaxed text-muted">
              The first time, it asks a few quick questions: what the project is called and does, whether you’ve picked a
              language or framework, how much explanation you want, and whether you’d like to approve every piece of work
              or once per milestone. Then it sets itself up and tells you what’s next.
            </p>
            <p className="mt-3 text-sm text-muted">
              Not using Claude Code or OpenCode? Ask your agent to{' '}
              <em className="text-foreground">“read .groundwork/commands/gw.md and follow it”</em>.
            </p>
          </Stage>

          <Stage n="04" title="Say what you want to build">
            <p className="mb-4 text-[15px] leading-relaxed text-muted">
              In plain words. It asks a few specific questions, writes down the answers, and breaks the idea into small
              pieces of work called cards. Nothing starts until you agree to the plan.
            </p>
            <Terminal title="your ai tool">
              <ChatLines
                lines={[
                  { who: 'you', text: '/gw a page where my book club votes on next month’s book' },
                  { who: 'agent', text: 'Who can vote? One vote or rank several? Hide results until it closes?' },
                  { who: 'you', text: 'Anyone with the link. One vote. Hide results.' },
                  { who: 'agent', text: 'Here’s the plan: 2 phases, 5 cards. Does this look right?' },
                ]}
              />
            </Terminal>
          </Stage>

          <Stage n="05" title="Let it build, then approve" last>
            <p className="text-[15px] leading-relaxed text-muted">
              Each card is tested, built and reviewed, then it stops and tells you what changed, how to check it
              yourself, and anything to watch out for. The card is <StatusPill status="waiting" />. Type{' '}
              <code className="font-mono text-foreground">/gw-approve</code> to save it and move on, or{' '}
              <code className="font-mono text-foreground">/gw-reject</code> with a reason to send it back.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Coming back tomorrow, or in a different tool? Just type <code className="font-mono text-foreground">/gw</code>.
              It reads where you left off.
            </p>
          </Stage>
        </ol>
      </section>

      <section className="page-container pb-14">
        <p className="type-label mb-3">Cheat sheet</p>
        <h2 className="type-heading">Four commands cover almost everything.</h2>
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
            Want the detail? The docs walk through a first session step by step, and every command.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/docs">Read the docs →</ButtonLink>
            <ButtonLink href="/docs/guides/walkthrough" variant="secondary">
              Watch a real build
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyCommand } from '@/components/gw/copy-command';
import { Stage } from '@/components/gw/how-it-works';
import { BriefTerminal } from '@/components/gw/memory-loop';
import { ButtonLink } from '@/components/gw/section';
import { ChatLines, Terminal } from '@/components/gw/terminal';

export const metadata: Metadata = {
  title: 'Quickstart',
  description: 'Install Groundwork, type /gw, and see a session resume where the last one stopped. The basics, nothing more.',
};

const tools = [
  ['Claude Code', 'hooks and a /gw skill'],
  ['OpenCode', 'a plugin and /gw'],
  ['Codex', 'hooks and $gw skills (trust them with /hooks)'],
  ['Cursor', 'hooks and /gw skills'],
  ['Gemini CLI', 'hooks, /gw commands and GEMINI.md'],
  ['Anything else', 'AGENTS.md says to run brief first'],
];

const commands = [
  ['/gw', 'Resume from memory, and save. The only one you need to remember.'],
  ['brief', 'npx groundwork-ai brief: what a session needs to resume, with a freshness verdict.'],
  ['checkpoint', 'npx groundwork-ai checkpoint --now "…" --next "…": save and stamp the handoff.'],
  ['doctor', 'npx groundwork-ai doctor: check the install, the memory and the budgets.'],
];

export default function QuickstartPage() {
  return (
    <main className="flex-1">
      <header className="dot-grid border-b border-border">
        <div className="page-container py-16 sm:py-20">
          <p className="type-label mb-4">Quickstart</p>
          <h1 className="type-display max-w-3xl">Up and running in a minute.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Install project memory, type one command, and see the next session pick up where this one stopped.
            Everything else is in the docs when you need it.
          </p>
        </div>
      </header>

      <section className="page-container py-14 sm:py-16">
        <ol className="max-w-3xl">
          <Stage n="01" title="Check you have Node.js 22 or later, and git">
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

          <Stage n="02" title="Add Groundwork to your repo">
            <p className="mb-4 text-[15px] leading-relaxed text-muted">In your project’s folder, new or existing, run:</p>
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
            <p className="mt-4 text-sm text-muted">
              It adds a <code className="font-mono">.groundwork/</code> folder (handoff, map, decisions, lessons, journal)
              and an <code className="font-mono">AGENTS.md</code>. Your existing files are never replaced.
            </p>
          </Stage>

          <Stage n="03" title="Open your AI tool and type /gw">
            <p className="mb-4 text-[15px] leading-relaxed text-muted">
              The first time, it fills in what is empty: what the project is called and does, its commands, and the map of
              the codebase. Then it asks what you want to work on.
            </p>
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
              Not using one of these tools? Ask your agent to{' '}
              <em className="text-foreground">“read .groundwork/commands/gw.md and follow it”</em>.
            </p>
          </Stage>

          <Stage n="04" title="Work, and let it save">
            <p className="text-[15px] leading-relaxed text-muted">
              When a step finishes, and before the session stops, the agent saves. The command writes the time, commit and
              branch; the agent writes only what is in progress and what is next. In the tools above the hooks
              also checkpoint when a turn ends, before a compaction and when a session closes (OpenCode has no session-end hook).
            </p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[12px] leading-relaxed sm:text-[13px]">
              npx groundwork-ai checkpoint --now &quot;Login form renders; validation not wired&quot; --next &quot;Wire validation in src/login.ts&quot;
            </pre>
          </Stage>

          <Stage n="05" title="Come back in a new session, tool or model" last>
            <p className="mb-4 text-[15px] leading-relaxed text-muted">
              The session starts with the brief. If commits landed since the handoff was written, it says so, and lists
              them:
            </p>
            <BriefTerminal />
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              The verdict is one of fresh, behind, diverged, stale or unstamped. The agent checks the Next step against the
              commits, corrects it, and carries on.
            </p>
          </Stage>
        </ol>
      </section>

      <section className="page-container pb-14">
        <p className="type-label mb-3">Cheat sheet</p>
        <h2 className="type-heading">One command in the tool, three in the terminal.</h2>
        <dl className="mt-6 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border">
          {commands.map(([cmd, what]) => (
            <div key={cmd} className="grid gap-1 bg-background px-5 py-3.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="font-mono text-sm font-semibold">{cmd}</dt>
              <dd className="text-sm text-muted">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          Running several agents? See{' '}
          <Link className="text-foreground underline" href="/docs/concepts/parallel-agents">
            parallel agents
          </Link>
          . Want a spec, small cards with proof and your approval before each commit? That is the optional{' '}
          <Link className="text-foreground underline" href="/docs/flow">
            flow
          </Link>
          .
        </p>
      </section>

      <section className="page-container pb-28">
        <div className="flex max-w-3xl flex-col gap-5 rounded-xl border border-border bg-surface/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted">
            Want the detail? The docs walk through a first session step by step, and every command.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/docs">Read the docs →</ButtonLink>
            <ButtonLink href="/docs/results" variant="secondary">
              See the results
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}

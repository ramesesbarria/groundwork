# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)
[![Docs](https://img.shields.io/badge/docs-read-4f46e5)](https://ramesesbarria.github.io/groundwork/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Project memory for coding agents: any session, tool or model resumes where the last one stopped.**

Groundwork keeps what your project knows in your repo, as plain files: where the work stands, where
things are in the codebase, what was decided and why, and what went wrong once. Every session starts
from a brief built from those files, with a verdict on how far the handoff can be trusted against
git. The CLI writes the facts; the agent writes only the judgment.

```bash
cd your-project
npx groundwork-ai init
```

Needs Node.js 22+ and git. Then open Claude Code, OpenCode or any AI tool in the project and
type `/gw`. **Next:** the [quickstart](https://ramesesbarria.github.io/groundwork/quickstart).

## The problem

A new session, a different tool or a different model starts from zero. The usual fix is a handoff
note the model writes at the end of its context, which is when it knows least about what matters,
and which goes stale without anyone noticing: three commits later it still reads as current.

Groundwork fixes the two halves. The facts in the handoff (time, commit, branch, uncommitted files,
who wrote it) are stamped by the CLI from git, not typed by the model. And every time a session
starts, the stamp is compared with the repository, so a stale handoff announces itself.

## Quickstart

1. Run `npx groundwork-ai init` in a git repo. It asks which tool you use (Claude Code, OpenCode, Codex, Cursor, Gemini CLI, or
   plain markdown; `--adapter claude-code,codex` names several), and installs only the memory layer.
2. What appears: a `.groundwork/` folder (`HANDOFF.md`, `MAP.md`, `DECISIONS.md` and `decisions/`,
   `LESSONS.md`, `JOURNAL.md`, `config.json`, and the scripts the hooks run), an `AGENTS.md` that says
   to run `npx groundwork-ai brief` first, and the tool's own files (for Claude Code: `.claude/` with
   hooks and a `/gw` skill, plus a `CLAUDE.md` that loads `AGENTS.md`; the other tools get their own folders). Existing `AGENTS.md` and
   `CLAUDE.md` are appended to, never replaced.
3. Open your tool and type `/gw` once. The agent fills in `MAP.md` and `AGENTS.md`, then works from
   the handoff.
4. From then on, each session start gives the agent the brief. When a turn ends, is compacted or the
   session closes, a hook (where the tool has that event) checkpoints, and asks the agent to save its own notes if
   the handoff is behind. You can do it by hand any time:

```bash
npx groundwork-ai checkpoint --now "Login form renders; validation not wired" --next "Wire validation in src/login.ts"
```

The next session, in any tool, starts with `npx groundwork-ai brief` (the hook prints it for you in
Claude Code and OpenCode; in other tools `AGENTS.md` tells the agent to run it).

## The memory set

| File | What it holds | Written by |
|---|---|---|
| `HANDOFF.md` | Now, Next, Blockers, Failing checks, Workers in flight, Notes, under a stamp of time, commit, branch, tool and model | The agent writes the prose; `checkpoint` writes the stamp |
| `MAP.md` | Where things are: folders, entry points, tests, traps | The agent, when things move |
| `decisions/` and `DECISIONS.md` | One record per decision, with the options and the reason, and a generated index | `decide`; you fill in the record |
| `LESSONS.md` | What went wrong once and must not again; a note, or a rule promoted into `AGENTS.md` | `lesson` |
| `JOURNAL.md` | One entry per checkpoint: the commits and files since the last one | `checkpoint`, from git |

Each file has a token budget (`doctor` checks them), and `compact` moves journal entries beyond the
budget, every superseded decision and logs that grew inside the handoff to `.groundwork/archive/`. It never
deletes anything. There is no `map` command: the agent fills in `MAP.md`, and `doctor` checks that
it names paths that exist.

## How freshness works

`brief` prints what an agent needs to resume, within a token budget (1,500 by default), starting
with one verdict on the handoff:

| Verdict | Meaning |
|---|---|
| `fresh` | Written at the current commit |
| `behind` | Commits landed after it was written; they are listed with the files they changed |
| `diverged` | Its commit isn't in this branch's history (rebase, reset, another branch) |
| `stale` | Older than `staleAfterDays` (14 by default) |
| `unstamped` | Never checkpointed, so there is nothing to compare |

Real output, from a throwaway repo: `init`, a checkpoint, then two more commits.

```text
# Project memory: bookclub
Handoff: BEHIND (written 0 min ago on main @ 5c4bcc2 by claude-code): 2 commits landed after it was written, changing 3 files.
  - 6a1a0f1 feat: logout endpoint
  - 2fce619 feat: session endpoint
  Changed files: src/api/logout.ts, src/api/session.ts, src/login.ts
  Files its Now/Next sections name have changed since: src/login.ts.
  Trust the code over the handoff where they disagree, then save an updated handoff.

## Handoff (.groundwork/HANDOFF.md)
Now: Login form renders; validation is not wired to the API
Next: Wire validation in src/login.ts, then add the first test

## Decisions in force (records in .groundwork/decisions/; don't reopen without the human)
- 0001 Use cookie sessions, not JWTs

## Map (.groundwork/MAP.md)
## Layout
- `src/` the app (found)
- `src/login.ts` the login form and its validation (found)

## Entry points
- `src/login.ts` (found)

## Tests
- none yet

## Traps
- none found yet

Memory lives in .groundwork/ (how it works: .groundwork/memory.md). Before you stop or run low on context, save: npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"
```

Commits that only touch `.groundwork/` don't count, so committing the handoff doesn't make it
behind. Freshness is about the repository, not the truth: a handoff stamped at HEAD is `fresh` even
if its prose is wrong. An automatic checkpoint doesn't restamp a handoff nobody touched, so it stays
`behind` rather than claiming what it doesn't know.

## Parallel agents

The root handoff belongs to the main checkout, one writer. A linked git worktree, a task branch or a
named worker gets its own file under `.groundwork/work/<id>/`, so parallel agents never conflict in
git:

```bash
npx groundwork-ai worker start auth-tests --goal "Write the auth test suite"
npx groundwork-ai worker done auth-tests --outcome "merged after rerunning its checks"
```

`worker` records each one under **Workers in flight** and in `.groundwork/work/LEDGER.md`; the brief
and `status` list the active ones, with their own next step once they have saved. Two sessions sharing one handoff get a warning from `checkpoint`,
not a refusal. [Parallel agents](https://ramesesbarria.github.io/groundwork/docs/concepts/parallel-agents).

## Supported tools

| Tool | What you get |
|---|---|
| Claude Code (2.1.295+ for the flow's guard) | Hooks at session start, stop, before compaction and session end; a `/gw` skill |
| OpenCode 2.x | A plugin: the brief at session start, a checkpoint when the session goes idle, instructions at compaction; `/gw` |
| Codex CLI | Hooks at session start, stop, before compaction and session end, and `$gw` skills; you trust the hooks once with `/hooks`. The compaction summary isn't told what to keep |
| Cursor | Hooks at conversation start, stop, before compaction and session end, and `/gw` skills. A resumed conversation relies on `AGENTS.md` for the brief |
| Gemini CLI (paid API key; Google's docs say Antigravity CLI replaced it for other users) | Hooks at session start, after each response, before compression and session end, and `/gw` commands; `GEMINI.md` loads `AGENTS.md` |
| Anything that reads `AGENTS.md` | `AGENTS.md` says to run `brief` first and to save with `checkpoint` |

What isn't verified yet: the 2.0 hooks have been run as processes with the documented input, not
inside a live Claude Code, OpenCode, Codex, Cursor or Gemini CLI session. OpenCode's idle-event
checkpoint follows its plugin documentation and hasn't been tried live, and the Codex, Cursor and
Gemini CLI adapters were built from each tool's documentation and have never run inside the tool. Hooks never block work: they always exit 0 and give up
after 8 seconds. Adapter pages:
[Claude Code](https://ramesesbarria.github.io/groundwork/docs/adapters/claude-code),
[OpenCode](https://ramesesbarria.github.io/groundwork/docs/adapters/opencode),
[Codex](https://ramesesbarria.github.io/groundwork/docs/adapters/codex),
[Cursor](https://ramesesbarria.github.io/groundwork/docs/adapters/cursor),
[Gemini CLI](https://ramesesbarria.github.io/groundwork/docs/adapters/gemini),
[other tools](https://ramesesbarria.github.io/groundwork/docs/adapters/other-tools).

## The flow (optional)

Groundwork 1.0 was a development workflow, and it is still here as an add-on: a spec, a plan of small
cards, tester, implementer and reviewer roles, your approval before each commit (`/gw-approve`,
`/gw-reject`), and guards and CI checks that refuse a commit without its evidence. Turn it on with
`npx groundwork-ai init --flow`, or later with `npx groundwork-ai flow on`; `flow off` removes
Groundwork's own flow files and keeps what the project made. Memory and flow share the same
handoff. [The flow](https://ramesesbarria.github.io/groundwork/docs/flow).

## Results
The one comparison we have was run on 1.0, with the flow on, not on 2.0. The same agent (OpenCode 2.0.32 with DeepSeek Flash) ran the same short tasks with and without Groundwork, scored by tests the agent never saw, three runs each. Work that spanned sessions held together better: **13 of 15** runs succeeded with Groundwork, 7 of 15 without. Self-contained tasks tied at 12 of 12. The price: about **4× the API cost and 3× the time** per solo task. One agent and model on a small project can't show how others behave, or what a long project saves, and none of this has been re-measured for the memory-only default. [The results, the corrections and the limits](https://ramesesbarria.github.io/groundwork/docs/results) · [the evaluation in this repo](evals/RESULTS.md). `npx groundwork-ai doctor` estimates what Groundwork adds to every session in your project.

## Upgrading from 1.x

`npx groundwork-ai upgrade` keeps the flow on, so nothing you use changes, and adds the memory layer
underneath: `MAP.md`, a generated `DECISIONS.md`, the new config keys (`flow`, `budgets`,
`staleAfterDays`, `nudge`) and the hooks. Your spec, cards, evidence, decisions, lessons, rules,
handoff and edits are never touched. Your old handoff reads as `unstamped` until the first
`checkpoint` converts it, dropping nothing.
[Upgrading from 1.x](https://ramesesbarria.github.io/groundwork/docs/getting-started/upgrading).
`npx groundwork-ai uninstall` takes Groundwork out.

## Documentation

- [Installation](https://ramesesbarria.github.io/groundwork/docs/getting-started/installation) and [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes).
- Concepts: [the handoff](https://ramesesbarria.github.io/groundwork/docs/concepts/handoff), [freshness](https://ramesesbarria.github.io/groundwork/docs/concepts/freshness), [budgets and compaction](https://ramesesbarria.github.io/groundwork/docs/concepts/budgets-and-compaction), [what it costs](https://ramesesbarria.github.io/groundwork/docs/concepts/cost).
- [Existing projects](https://ramesesbarria.github.io/groundwork/docs/guides/existing-projects) and [teams](https://ramesesbarria.github.io/groundwork/docs/guides/teams).
- [Agent commands](https://ramesesbarria.github.io/groundwork/docs/reference/agent-commands) (`/gw`) and [the CLI](https://ramesesbarria.github.io/groundwork/docs/reference/cli).
- [FAQ](https://ramesesbarria.github.io/groundwork/docs/faq).

## What's in this repo

| Folder | What it is |
|---|---|
| `core/` | What `init` copies into a project, in plain markdown and JavaScript. The memory layer (`lib/`, `hooks/`, `memory.md`, `context/`) is what every install gets; the rest is the flow. |
| `cli/` | The `groundwork-ai` npm package. TypeScript on Node.js 22+, tested with Vitest. |
| `docs/` | The documentation site: Next.js and Fumadocs, deployed to GitHub Pages. |
| `demo/` | The two-branch team demo and the sample PR workflow. |
| `evals/` | The comparative evaluation: tasks, harness, per-run results and the report. |
| `transcripts/` | Sessions and measurements from a pre-1.0 calculator build. |
| `checks/` | Maintainer tools: the OpenCode compatibility check and the session cost script. |

[V2.md](V2.md) is the 2.0 contract and design record; [V1.md](V1.md) describes what the flow supports
and its limits.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the tests and
the docs site.

## License

[MIT](LICENSE)

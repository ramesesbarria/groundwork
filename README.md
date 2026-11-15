# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)
[![Docs](https://img.shields.io/badge/docs-read-4f46e5)](https://ramesesbarria.github.io/groundwork/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Your AI forgets. Your project doesn't.**

Groundwork is project memory for coding agents. Close the chat, switch tools, change models: the
next session picks up exactly where the last one stopped.

```bash
npx groundwork-ai init
```

## Every new session starts from zero

You open a new chat and explain your project. Again. The stack, the decisions, the thing you were
halfway through. The notes from last time are already out of date, and nothing tells you so.

## Now your project remembers

Groundwork keeps the memory in your repo: where the work stands, what comes next, where things
are, what you decided and why. Every session starts by reading it, and is told what changed since
the last save.

## Quickstart

1. In your project, run `npx groundwork-ai init` and pick your AI tool.
2. Open the tool and type `/gw`.
3. Work. Come back tomorrow, in any tool, on any model. It knows where you stopped.

Needs Node.js 22+ and git. [Quickstart](https://ramesesbarria.github.io/groundwork/quickstart).

## What the next session sees

```text
# Project memory: bookclub
Handoff: BEHIND (written 0 min ago on main @ 5c4bcc2 by claude-code): 2 commits landed after it was written, changing 3 files.
  - 6a1a0f1 feat: logout endpoint
  - 2fce619 feat: session endpoint
  Changed files: src/api/logout.ts, src/api/session.ts, src/login.ts

## Handoff (.groundwork/HANDOFF.md)
Now: Login form renders; validation is not wired to the API
Next: Wire validation in src/login.ts, then add the first test

## Decisions in force (records in .groundwork/decisions/; don't reopen without the human)
- 0001 Use cookie sessions, not JWTs
```

Where you stopped, what is next, what changed while you were away, and what is already settled.
From `npx groundwork-ai brief`.

## What you get

- **Pick up where you left off.** No more re-explaining your project to a blank chat.
- **Any tool, any model.** The memory lives in your repo, not in one app's chat history.
- **Notes that can't go stale quietly.** Each session sees the commits that landed since the last save.
- **Decisions that stay decided.** Record a choice and its reason once. Agents stop reopening it.
- **Mistakes you only make once.** Write down a lesson and every later session has it.
- **Room for several agents.** Each parallel agent keeps its own notes, so they don't collide.
- **Plain files you own.** Markdown in `.groundwork/`, committed with your code. No account, no server.

## Works with

- Claude Code
- OpenCode
- Codex
- Cursor
- Gemini CLI
- Anything else that reads `AGENTS.md`

Status: each integration is built from its tool's hook documentation and tested outside the tool,
not yet inside a live session. If a session starts without its brief, run `npx groundwork-ai brief`.

## Want more structure?

The optional guided workflow turns your idea into a spec and small tasks, then waits for your
`/gw-approve` or `/gw-reject` before each commit. Turn it on with `npx groundwork-ai flow on`. [The flow](https://ramesesbarria.github.io/groundwork/docs/flow).

## Learn more

- [Docs](https://ramesesbarria.github.io/groundwork/docs) and [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes)
- [Commands](https://ramesesbarria.github.io/groundwork/docs/reference/agent-commands): `/gw` in your tool, and [the CLI](https://ramesesbarria.github.io/groundwork/docs/reference/cli)
- [Your tool](https://ramesesbarria.github.io/groundwork/docs/adapters/claude-code): what each integration does
- Coming from 1.x? `npx groundwork-ai upgrade` keeps everything you made. [Upgrading](https://ramesesbarria.github.io/groundwork/docs/getting-started/upgrading)
- [V2.md](V2.md) is the full design record. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup and tests.

[MIT](LICENSE)

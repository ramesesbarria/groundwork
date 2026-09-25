# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)

**A tool-agnostic workflow for building software with AI agents: spec → plan → test-first build loop → human-approved ship.**

Groundwork gives your AI coding agent a real development process. It interviews you for a spec, breaks the work into small cards, builds each card with separate tester, implementer and reviewer roles, and stops for your approval before anything is committed. When the agent makes the same mistake twice, the mistake becomes a rule. When a rule keeps being broken, it becomes a guard that blocks the action.

**Groundwork is the project layer.** It owns the spec, the cards, your approvals, where things stand between sessions, and the lessons learned, so it always answers "where is my project, what's next, what did I approve?" How the agent handles a single task is left to your tool and any skill packs you use with it.

```mermaid
flowchart TD
  idea([Your idea]) --> spec[Spec<br/>a few specific questions]
  spec --> plan[Plan<br/>phases and small cards]
  plan --> card

  subgraph card [For each card]
    direction LR
    tester[Tester<br/>writes failing tests] --> impl[Implementer<br/>makes them pass]
    impl --> review[Reviewer<br/>checks the evidence]
    review -. sent back .-> impl
  end

  card --> approve{You approve?}
  approve -- yes --> commit([Committed, on to the next card])
  approve -. no, with a reason .-> card

  classDef you fill:#fef3c7,stroke:#d97706,color:#451a03
  classDef agent fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
  classDef done fill:#dcfce7,stroke:#16a34a,color:#052e16
  class idea,approve you
  class spec,plan,tester,impl,review agent
  class commit done
  style card fill:none,stroke:#94a3b8,stroke-dasharray:4 3
```

## Getting started with Groundwork

### 1. Install Node.js 22 or later

| System | Command |
|---|---|
| **Windows** | `winget install OpenJS.NodeJS.LTS`, or the installer from [nodejs.org](https://nodejs.org) |
| **macOS** | `brew install node`, or the installer from [nodejs.org](https://nodejs.org) |
| **Linux** | `nvm install --lts` with [nvm](https://github.com/nvm-sh/nvm), or your distribution's package manager |

Check it with `node --version`. It should print `v22` or higher.

### 2. Add Groundwork to your project

In a terminal (PowerShell, Command Prompt, Terminal or any shell), go to your project's folder and run:

```bash
npx groundwork-ai init
```

It asks which AI tool you use: Claude Code, OpenCode, or plain markdown for any other tool. It works in a new, empty folder or in a project that already has code.

### 3. Open your AI tool and type `/gw`

`/gw` sets the project up the first time. After that, it always tells you where things stand and what's next. With plain markdown, ask the agent: *"Read `.groundwork/commands/gw.md` and follow it."*

### 4. Your first 10 minutes

Here's what a first session looks like:

```text
You:   /gw I want a page where my book club votes on next month's book
Agent: A few specific questions first:
       1. Who can vote: anyone with the link, or signed-in members only?
       2. One vote each, or rank several books?
       3. Show results before voting closes?
You:   Anyone with the link. One vote. Hide results until it closes.
Agent: Spec saved, starting with the smallest useful version. Does it look right?
You:   Yes.
You:   /gw
Agent: Plan: 2 phases, 5 cards.
       1.1 Book list page · 1.2 Voting · 1.3 Close the vote · ...
       OK to write the cards?
You:   Go.
You:   /gw
Agent: Card 1.1 Book list page: tests written, code passing, review passed.
       What changed: the home page lists this month's books.
       How to check: run npm run dev and open http://localhost:3000
       Caveats: no styling yet.
       Approve or reject?
You:   /gw-approve
Agent: Committed [1.1] Book list page. Next up: card 1.2 Voting.
```

Nothing is committed until you approve, and every approval tells you how to check the work yourself.

## Glossary

- **Card**: one small piece of work, with a checklist of what "done" means.
- **Phase**: a group of cards that together leave something working, like a milestone.
- **Evidence**: the proof a card is done, such as test output, saved next to the card.
- **Handoff**: a note that says where things stand, so any session can pick up the work.
- **Lesson**: a mistake written down so it doesn't happen again.

## Why Groundwork

AI agents write code fast, but on a real project the same problems keep coming back: rules they forget, progress lost when a session ends, "done" with nothing behind it, and scope that quietly grows. Groundwork keeps the project in files instead of in the chat, puts you in charge of every approval, and **enforces** what matters instead of hoping the agent remembers.

- **Right-sized.** A typo goes through the quick path in one pass. A feature gets a spec, a plan and cards. The agent says which path it's taking, and you can override it.
- **Always resumable.** Close the laptop partway through a card; the next session picks up from the handoff.
- **Plain approvals.** Every approval stop says what changed, how to check it yourself, the caveats, and any judgment calls the agent made.
- **Stack-neutral.** For every stack decision, Groundwork writes 2–4 options with trade-offs, may add a labeled recommendation, and waits for you. Nothing is picked until you answer; "go with your recommendation" counts, and is recorded as that.
- **Works on existing code.** Setup never overwrites your instruction files, keeps your existing rules, maps the codebase, and records a test baseline so old failures don't block new work.
- **Small footprint.** The always-loaded part is about 400 tokens. Everything else loads only when a step needs it.

## How it works

Groundwork lives in your project as plain files, so your agent, you and your version control all see the same thing:

| File | What it holds |
|---|---|
| `AGENTS.md` | A short page your agent reads every session. It points to everything else. |
| `.groundwork/SPEC.md` | What you're building, in your words. |
| `.groundwork/cards/` | One file per piece of work, with its checklist and the proof it's done. |
| `.groundwork/HANDOFF.md` | Where things stand right now, so any session can carry on. |
| `.groundwork/decisions/` | Each stack choice, with the options you chose from. |
| `.groundwork/LESSONS.md` | Mistakes worth remembering, and the rules they became. |
| `.groundwork/JOURNAL.md` | A short recap of each finished phase. |
| `.groundwork/config.json` | Your settings: how often you approve, how much to explain, your test commands and how to run the app. |

Everything else in `.groundwork/` (roles, commands, guards, hooks) is the playbook your agent follows. You don't need to touch it.

Four rules keep the work honest:

- **Separate roles.** The tester can't write the implementation, the implementer can't edit tests, the reviewer can't fix code (it sends the card back), and the planner never picks your stack.
- **No evidence, no approval.** A card can't be approved until the proof is attached.
- **You set the pace.** Approve every card (the default), or once per phase.
- **Explained at your level.** Setup asks whether you're new to building software or experienced, and the agent explains more or less to match.

## Commands

Type these in your AI tool. If you remember only one, make it `/gw`.

| When you want to… | Type |
|---|---|
| Start, or carry on where you left off | `/gw` |
| Set up Groundwork in this project | `/gw-setup` |
| Turn an idea into a spec | `/gw-spec` |
| Turn the spec into a plan of cards | `/gw-plan` |
| Build the next card | `/gw-next` |
| Accept or send back finished work (only you can) | `/gw-approve` · `/gw-reject` |
| Make a small change, fix a bug, or try something out | `/gw-quick` |

Power commands, for when you need them:

| When you want to… | Type |
|---|---|
| Choose between options, like a database or a framework | `/gw-decide` |
| Agree how a screen looks and behaves before it's built | `/gw-ui-spec` |
| Save where things stand before you stop | `/gw-handoff` |
| Turn repeated mistakes into rules | `/gw-retro` |

And in your terminal, inside the project:

| When you want to… | Run |
|---|---|
| Add Groundwork to a project | `npx groundwork-ai init` |
| Update to the latest version (your spec, cards and lessons are kept) | `npx groundwork-ai upgrade` |
| See the phase, the cards and what's next | `npx groundwork-ai status` |
| Check that everything is set up correctly | `npx groundwork-ai doctor` |
| Collect repeated mistakes for `/gw-retro` | `npx groundwork-ai retro` |
| Add support for another AI tool | `npx groundwork-ai adapter add <tool>` |

## The lessons ledger

Groundwork learns from mistakes, so the same one doesn't happen twice:

**Note → Rule → Guard**

A mistake is first written down as a note. If it happens again, it becomes a rule the agent sees in every session. If the rule still gets broken, it becomes a guard that blocks the mistake outright. At the end of a phase, `/gw-retro` suggests what to add or promote, and nothing changes without your OK.

## Adapters

The core is plain markdown, so any agent that can read files can follow it. Adapters add native commands, subagents and hooks:

| Tool | What you get |
|---|---|
| **Claude Code** | Skills for every command (`/gw-approve` and `/gw-reject` only run when you type them), subagents with limited tools (the reviewer can't edit files), a guard hook, a session-start hook that says where things stand, and `CLAUDE.md` → `AGENTS.md` |
| **OpenCode** | Commands, subagents with permissions (reviewer `edit: deny`, planner `bash: deny`), and a guard plugin. Needs OpenCode 2.x (tested with 2.0.16) |
| **Anything else** | `AGENTS.md` plus the markdown in `.groundwork/` |

You can pick a model per role in `.groundwork/config.json` (for example a cheaper model for the tester and a stronger one for the reviewer); the adapters write it into each subagent.

Groundwork is the project layer, so it's designed to work alongside task-level skill packs such as [superpowers](https://github.com/obra/superpowers).

## License

[MIT](LICENSE)

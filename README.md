# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)

**A tool-agnostic workflow for building software with AI agents: spec → plan → test-first build loop → human-approved ship.**

Groundwork gives your AI coding agent a real development process. It interviews you for a spec, breaks the work into small cards, builds each card with separate tester, implementer and reviewer roles, and stops for your approval before anything is committed. When the agent makes the same mistake twice, the mistake becomes a rule. When a rule keeps being broken, it becomes a guard that blocks the action.

**Groundwork is the project layer.** It owns the spec, the cards, your approvals, where things stand between sessions, and the lessons learned, so it always answers "where is my project, what's next, what did I approve?" How the agent handles a single task is left to your tool and any skill packs you use with it.

```mermaid
flowchart LR
  idea([Idea]) --> spec[gw-spec<br/>specific questions]
  spec --> plan[gw-plan<br/>phases + cards]
  plan --> tester[Tester<br/>failing tests]
  tester --> impl[Implementer<br/>make them pass]
  impl --> review[Reviewer<br/>fresh eyes + evidence]
  review -- sent back --> impl
  review --> you{You approve}
  you -- rejected --> impl
  you --> commit([Commit])
  review -. repeated mistakes .-> ledger[(Lessons:<br/>note → rule → guard)]
  ledger -.-> tester
```

## Install

Needs Node 22 or later.

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

Then open your AI tool in the project and type `/gw`. It sets the project up the first time, and after that it always tells you where things stand and what's next. With plain markdown, ask the agent to read `.groundwork/commands/gw.md` and follow it.

## Your first 10 minutes

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
- **Always resumable.** Close the laptop partway through a card; the next session, in any tool or with any model, picks up from `HANDOFF.md`.
- **Plain approvals.** Every approval stop says what changed, how to check it yourself, the caveats, and any judgment calls the agent made.
- **Stack-neutral.** For every stack decision, Groundwork writes 2–4 options with trade-offs, may add a labeled recommendation, and waits for you. Nothing is picked until you answer; "go with your recommendation" counts, and is recorded as that.
- **Works on existing code.** Setup never overwrites your instruction files, keeps your existing rules, maps the codebase, and records a test baseline so old failures don't block new work.
- **Small footprint.** The always-loaded part is about 400 tokens. Everything else loads only when a step needs it.

## How it works

`init` puts everything in one folder:

```
AGENTS.md                 short, always loaded; points into .groundwork/
.groundwork/
  SPEC.md                 what we're building
  HANDOFF.md              where things stand; any session, tool or model can resume from it
  LESSONS.md              the lessons ledger
  JOURNAL.md              a short recap of each finished phase
  config.json             approval mode, experience, guards, commands, commit format
  cards/                  one file per unit of work, with acceptance criteria and evidence
  decisions/              stack choices, with the options you chose from
  evidence/               test output and screenshots, linked from cards
  roles/                  planner, tester, implementer, reviewer
  commands/               the gw commands, tool-neutral
  guards/                 scripts that block actions
  hooks/                  session-start orientation
```

- **Four roles, each with a "must not".** The tester can't write the implementation. The implementer can't edit tests. The reviewer can't fix code; it sends the card back. The planner never picks your stack.
- **No evidence, no approval.** A card can't be approved while its Evidence section is empty.
- **You choose how often to approve:** every card (`per-card`, the default) or once per phase (`per-phase`).
- **Explained at your level.** Setup asks whether you're new to building software or experienced, and the agent explains more or less to match.

## Commands

In your AI tool (as `/gw…` in Claude Code and OpenCode). If you remember one, make it `/gw`:

| Command | What it does |
|---|---|
| `/gw` | Says where things stand and runs the next step, including picking up a card you left halfway |
| `gw-setup` | Sets up a new or existing project |
| `gw-spec` | Interviews you for the spec, starting with the smallest useful version |
| `gw-plan` | Records stack decisions, then splits the spec into phases and cards |
| `gw-next` | Runs the next ready card: tester → implementer → reviewer |
| `gw-approve` / `gw-reject` | Your verdict on a card (or a whole phase). Only you run these |
| `gw-quick` | One-pass path for small changes, bug fixes and quick experiments |

Power commands, for when you need them:

| Command | What it does |
|---|---|
| `gw-decide` | Lays out options for one decision and records your choice |
| `gw-ui-spec` | Agrees states, transitions and screen sizes before any UI code |
| `gw-handoff` | Saves where things stand, so another session or tool can continue |
| `gw-retro` | Proposes moving lessons up the ladder |

In the terminal (`npx groundwork-ai <command>`):

| Command | What it does |
|---|---|
| `groundwork init` | Installs Groundwork (`--adapter claude-code\|opencode\|none`, `--dry-run`). Never replaces your CLAUDE.md or AGENTS.md (it adds one pointer line); asks before overwriting anything else; merges into existing settings. |
| `groundwork upgrade` | Updates a project's Groundwork files (commands, roles, workflow, guards, hooks, templates and adapter files) to the CLI's version, after asking once. Your spec, handoff, lessons, cards, decisions and evidence stay exactly as they are. `--dry-run` shows the changes first. |
| `groundwork adapter add <tool>` | Adds or refreshes an adapter |
| `groundwork status` | Phase, cards by status, the next ready card, what's blocked |
| `groundwork doctor` | Token budget, missing guards and hooks, out-of-date files, cards whose status contradicts their history. Exits 1 on problems, so it can run in CI. |
| `groundwork retro` | Collects reverts, quick fixes after a card, rejections, review send-backs and judgment calls that were later rejected, for `/gw-retro` |

## The lessons ledger

Every rule records the mistake that created it, and moves up a ladder when the mistake repeats:

**NOTE** (in `LESSONS.md`) → **RULE** (in `AGENTS.md` or a role file, always in context) → **GUARD** (a script that blocks the action)

`groundwork retro` collects the signals (reverts, rejections, fixes right after a card), and `/gw-retro` proposes which lessons to add or promote. Nothing changes without your OK.

Groundwork ships with a `no-ai-trailers` guard that blocks commit messages with AI attribution. Turn guards on in `.groundwork/config.json`: `"guards": ["no-ai-trailers"]`.

## Adapters

The core is plain markdown, so any agent that can read files can follow it. Adapters add native commands, subagents and hooks:

| Tool | What you get |
|---|---|
| **Claude Code** | Skills for every command (`/gw-approve` and `/gw-reject` only run when you type them), subagents with limited tools (the reviewer can't edit files), a guard hook, a session-start hook that says where things stand, and `CLAUDE.md` → `AGENTS.md` |
| **OpenCode** | Commands, subagents with permissions (reviewer `edit: deny`, planner `bash: deny`), and a guard plugin |
| **Anything else** | `AGENTS.md` plus the markdown in `.groundwork/` |

You can pick a model per role in `.groundwork/config.json` (for example a cheaper model for the tester and a stronger one for the reviewer); the adapters write it into each subagent.

Groundwork is the project layer, so it's designed to work alongside task-level skill packs such as [superpowers](https://github.com/obra/superpowers).

## License

[MIT](LICENSE)

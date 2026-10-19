# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)
[![Docs](https://img.shields.io/badge/docs-read-4f46e5)](https://ramesesbarria.github.io/groundwork/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Shared project context for developers and their coding agents.**

Your AI agent writes the code. Groundwork keeps what the project knows in your repo, as plain files:
the spec, the decisions and why they were made, a plan of small cards, the proof each card works,
and a handoff saying where things stand. The next session, a different tool or a teammate starts
from those files instead of a chat that's gone. Hooks and CI check the parts that matter, so a card
isn't committed without its proof and your approval.

![An OpenCode session: /gw sets the project up, interviews for the spec, and writes the plan of cards.](https://ramesesbarria.github.io/groundwork/demo-first-session.gif)

```bash
cd your-project
npx groundwork-ai init
```

Needs Node.js 22+ and a git repo. Then open Claude Code, OpenCode or any AI tool and type `/gw`.
**Next:** the [5-minute quickstart](https://ramesesbarria.github.io/groundwork/quickstart).

## Who it helps

- **Developers using coding agents on real projects.** Work that runs over days and sessions, where
  "what did we decide, and why?" matters.
- **Anyone coming back to a project.** Tomorrow, next month, in another tool: `/gw` reads the
  handoff and carries on.
- **Teams.** Each task branch keeps its own handoff and the decisions it depends on, and
  pull-request review is the approval.

## The problem

A coding agent's memory is the chat. When the chat ends or fills up, the plan, the reasons behind
choices and the state of the work go with it. "Done" is whatever the model says, and a teammate, or
you next week, has to reconstruct it all.

## A short example

```text
You:   /gw a page where my book club votes on next month's book
Agent: A few questions: who can vote, one vote or rank several, hide results until it closes?
You:   Anyone with the link. One vote. Hide results.
Agent: Spec saved. Plan: 2 phases, 5 cards. OK to write them?
You:   Go.  /gw
Agent: Card 1.1 Book list page: tests written, code passing, review passed.
       How to check: npm run dev, open localhost:3000. Caveats: no styling yet.
You:   /gw-approve
Agent: Committed [1.1] Book list page. Next up: 1.2 Voting.

(next day, new session)
You:   /gw
Agent: Card 1.2 Voting is being built: the tests are written, the code isn't yet. Carrying on.
```

## How it works

1. **Spec and plan.** The agent asks specific questions, writes the spec, records stack decisions
   with their trade-offs, and splits the work into small cards.
2. **Build one card.** A tester writes failing tests, an implementer makes them pass, and a
   reviewer with fresh context reruns everything. The proof is saved next to the card.
3. **You approve.** `/gw-approve` commits the card; `/gw-reject` sends it back with your reason. Or
   approve once per phase. Small fixes take a quick path without a card.
4. **Pick it up anywhere.** The handoff, cards and decisions are files, so any session, tool or
   teammate continues from them.

Three native commands: `/gw`, `/gw-approve`, `/gw-reject`. For anything else, ask in plain words.
More: [the build loop](https://ramesesbarria.github.io/groundwork/docs/concepts/the-build-loop).

## Working as a team

Set `integration` to `pr`, add the sample PR workflow and protect `main`. Each card gets a `gw/<id>`
branch with its own handoff. `groundwork-ai check --base origin/main` notices when `main` moved or a
decision the task depends on changed, and pull-request review is the approval. It's a working
prototype: [Teams and pull requests](https://ramesesbarria.github.io/groundwork/docs/guides/teams).

## What's checked, and what isn't

Hooks refuse a commit that names a card unless the card is done, its evidence exists, and you
approved the work as it is now; `groundwork-ai check` runs the same card rules in CI. Quick fixes
and team checkpoints are deliberate exceptions. Checks prove evidence exists, not that it's
authentic, and a determined agent can work around a local hook through a tool it doesn't see. CI and
review are the backstop. The details:
[evidence and approval](https://ramesesbarria.github.io/groundwork/docs/concepts/evidence-and-approval).

## Evidence so far

One recorded build of a small calculator app, on an earlier version, measured call by call:
[the walkthrough](https://ramesesbarria.github.io/groundwork/docs/guides/walkthrough) and
[the proof page](https://ramesesbarria.github.io/groundwork/proof). It shows where the tokens go. It
isn't a comparison of quality or cost against working without Groundwork; that evaluation is next.
`npx groundwork-ai doctor` estimates what Groundwork adds to every session in your project.

## Documentation

- [Installation](https://ramesesbarria.github.io/groundwork/docs/getting-started/installation) and [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes): setup, a first card, approval, coming back later.
- [Existing projects](https://ramesesbarria.github.io/groundwork/docs/guides/existing-projects): installing into a repo that already has code.
- [Agent commands](https://ramesesbarria.github.io/groundwork/docs/reference/agent-commands) and [the CLI](https://ramesesbarria.github.io/groundwork/docs/reference/cli).
- Adapters: [Claude Code](https://ramesesbarria.github.io/groundwork/docs/adapters/claude-code), [OpenCode](https://ramesesbarria.github.io/groundwork/docs/adapters/opencode), [other tools](https://ramesesbarria.github.io/groundwork/docs/adapters/other-tools).
- **Upgrading:** `npx groundwork-ai upgrade` keeps your spec, cards, evidence and edits ([how](https://ramesesbarria.github.io/groundwork/docs/getting-started/installation#updating)); `npx groundwork-ai uninstall` takes it out.
- [FAQ](https://ramesesbarria.github.io/groundwork/docs/faq).

## What's in this repo

| Folder | What it is |
|---|---|
| `core/` | The workflow in plain markdown: commands, roles, templates, guards and hooks. `init` copies it into your project. |
| `cli/` | The `groundwork-ai` npm package. TypeScript on Node.js 22+, tested with Vitest. |
| `docs/` | The documentation site: Next.js and Fumadocs, deployed to GitHub Pages. |
| `demo/` | The two-branch team demo and the sample PR workflow. |
| `transcripts/` | The raw sessions and measurements behind the calculator walkthrough (historical). |
| `checks/` | Maintainer tools: the OpenCode compatibility check and the session cost script. |

`V1.md` is the release plan and its evidence status.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers setup, the tests and
the docs site.

## License

[MIT](LICENSE)

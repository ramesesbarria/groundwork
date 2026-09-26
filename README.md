# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)
[![Docs](https://img.shields.io/badge/docs-read-4f46e5)](https://ramesesbarria.github.io/groundwork/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Spec, proof, approval. A workflow your AI agent can't skip.**

Your agent writes the code. Groundwork is the project layer: it owns the spec, the cards, the
evidence and the approvals, so any session can pick up where the last one stopped.

![An OpenCode session: /gw sets the project up, interviews for the spec, and writes the plan of cards.](https://ramesesbarria.github.io/groundwork/demo-first-session.gif)

```bash
cd your-project
npx groundwork-ai init
```

Needs Node.js 22+ and a git repo. Then open your AI tool and type `/gw`.
**New to Groundwork?** Read the [5-minute quickstart](https://ramesesbarria.github.io/groundwork/quickstart).

## The problem

AI agents are fast and confident. Real projects need more: the chat fills up and the plan goes
with it, "done" is whatever the model says, and the rules you agreed yesterday are gone by
tomorrow. A week in, nobody can say what shipped, what's next, or why a choice was made.

## Before and after

```text
Without Groundwork
You:   Add voting to my book club app.
Agent: Done! A clean voting page with results and a summary.
You:   ... (Is it tested? What was I doing yesterday? Which parts moved?)
```

```text
With Groundwork
You:   /gw I want a page where my book club votes on next month's book
Agent: A few specific questions: who can vote, one vote or rank several, hide results?
You:   Anyone with the link. One vote. Hide results until it closes.
Agent: Spec saved. Card 1.1: tests written, code passing, review passed.
       What changed: the home page lists this month's books.
       How to check: run npm run dev. Caveats: no styling yet.
You:   /gw-approve
Agent: Committed [1.1] Book list page. Next up: card 1.2 Voting.
```

The project survives the session, so the next session starts where this one stopped.

## How it works

Three steps, one card at a time. Your main session is the runner: it hands each card to three
roles and stops at your door.

1. **Spec and plan.** The agent asks specific questions, suggests the smallest useful version
   first, then writes phases and small cards. Stack choices are yours: options with trade-offs,
   and your pick is recorded.
2. **Build one card.** The tester writes failing tests, the implementer makes them pass, and a
   reviewer with fresh context re-runs everything and checks every criterion. The proof is saved
   next to the card, with steps you can follow to check it yourself.
3. **You approve.** Nothing is committed until you do, card by card or once per phase. When the
   same mistake happens twice it becomes a rule; if it still happens, a guard blocks it.

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

Read the deep version: [the build loop](https://ramesesbarria.github.io/groundwork/docs/concepts/the-build-loop) and [evidence and approval](https://ramesesbarria.github.io/groundwork/docs/concepts/evidence-and-approval).

## Staying light

Groundwork adds one small set of files to every session; `npx groundwork-ai doctor` shows the
numbers for your project. Each card starts fresh, so sessions stay small as the project grows, and
coming back later means reading a short handoff instead of the whole history. The longer a project
lives, the more this matters.
[What it costs, and when it pays off](https://ramesesbarria.github.io/groundwork/docs/concepts/cost).

## Proof

The measurements come from one recorded build. [The calculator walkthrough](https://ramesesbarria.github.io/groundwork/docs/guides/walkthrough) has the sessions, transcripts and metrics, and [the proof page](https://ramesesbarria.github.io/groundwork/proof) has the charts.

## Who it's for

- **Experienced developers.** A real review step before anything merges, evidence saved in the repo, and guards for rules you are done repeating.
- **Early career, no senior around.** Work one small card at a time, with a reviewer that catches what you would miss and proof you can point to.
- **Vibecoders.** Answer a few questions, approve in plain English, and ship; small changes take the quick path and features get structure.

## Honest comparison

| | Groundwork | A raw agent session |
|---|---|---|
| Project state | Files: spec, cards, handoff, decisions | The chat scrollback |
| "Done" | Evidence attached; approval refuses without it | Whatever the model summarizes |
| Review | A separate reviewer with fresh context, can't edit code | The context that wrote it |
| Learning | Repeated mistakes become rules, then guards | Starts fresh every session |
| Resume | Any session, tool or model continues from the handoff | Re-explain everything |

**When not to use it:** one-off scripts and throwaway experiments (ask your agent). Fully
autonomous overnight runs: Groundwork stops for you by design. Teams and pull-request flows: not
built yet. There are no benchmarks or evals; the claim is the mechanism, not a score.

## Quickstart

The [5-minute quickstart](https://ramesesbarria.github.io/groundwork/quickstart) goes from install to your first approval. These pages cover the rest:

![Running npx groundwork-ai init: choosing a tool, then the files it creates and the next step.](https://ramesesbarria.github.io/groundwork/demo-install.gif)

- [Your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes) walks through a full session.
- [Existing projects](https://ramesesbarria.github.io/groundwork/docs/guides/existing-projects) covers installing into a repo that already has code.
- [Command reference](https://ramesesbarria.github.io/groundwork/docs/reference/agent-commands) lists every `/gw-*` command; [the CLI reference](https://ramesesbarria.github.io/groundwork/docs/reference/cli) covers `groundwork-ai`.
- [The build loop](https://ramesesbarria.github.io/groundwork/docs/concepts/the-build-loop) and [evidence and approval](https://ramesesbarria.github.io/groundwork/docs/concepts/evidence-and-approval) explain the mechanics.
- Adapters for [Claude Code](https://ramesesbarria.github.io/groundwork/docs/adapters/claude-code), [OpenCode](https://ramesesbarria.github.io/groundwork/docs/adapters/opencode) and [other tools](https://ramesesbarria.github.io/groundwork/docs/adapters/other-tools).
- [What it costs](https://ramesesbarria.github.io/groundwork/docs/concepts/cost) has the full breakdown; [the FAQ](https://ramesesbarria.github.io/groundwork/docs/faq) answers the rest.
- **Upgrading.** `npx groundwork-ai upgrade` refreshes Groundwork's files and keeps your spec, cards and lessons. [How updating works](https://ramesesbarria.github.io/groundwork/docs/getting-started/installation#updating).

## FAQ

- **Does it work with an existing project?** Yes. Setup maps the codebase, records what is already in use, and saves a test baseline so old failures don't block new work. [Existing projects](https://ramesesbarria.github.io/groundwork/docs/guides/existing-projects).
- **Can I use any AI tool?** Any tool that reads files. Claude Code and OpenCode get first-class adapters; the workflow itself is plain markdown.
- **What does it cost in context?** Groundwork adds a small, fixed set of files to every session; everything else loads only when a step needs it. `npx groundwork-ai doctor` shows the numbers for your project.

More questions: [the FAQ](https://ramesesbarria.github.io/groundwork/docs/faq).

## Contributing

Issues and pull requests are welcome. The docs live in `docs/`. Run `npm test` before opening a PR;
CI runs Windows and Linux on Node 22 and 24.

## License

[MIT](LICENSE)

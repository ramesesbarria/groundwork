# Groundwork

[![CI](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesesbarria/groundwork/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/groundwork-ai)](https://www.npmjs.com/package/groundwork-ai)
[![Docs](https://img.shields.io/badge/docs-read-4f46e5)](https://ramesesbarria.github.io/groundwork/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Spec, proof, approval — a workflow your AI agent can't skip.**

Your agent writes the code. Groundwork is the project layer: it owns the spec, the cards, the
evidence and the approvals — and any session can pick up where the last one stopped.

![An OpenCode session: /gw sets the project up, interviews for the spec, and writes the plan of cards.](https://ramesesbarria.github.io/groundwork/demo-first-session.gif)

```bash
cd your-project
npx groundwork-ai init      # Claude Code, OpenCode, or plain markdown
```

Then open your AI tool and type `/gw`.

## The problem

AI agents are fast and confident. Real projects need more: the chat fills up and the plan goes with
it; "done" is whatever the model says; the rules you agreed yesterday are gone by tomorrow. A week
in, nobody can say what shipped, what's next, or why a choice was made.

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

The difference isn't answer quality. It's that the project survives the session.

## How it works

Three steps, one card at a time. Your main session — the runner — hands each card to three roles
and stops at your door:

1. **Spec and plan.** Specific questions, the smallest useful version first, then phases and small
   cards. Stack choices are yours: options with trade-offs, and your pick is recorded.
2. **Build one card.** The tester writes failing tests, the implementer makes them pass, and a
   reviewer with fresh context re-runs everything and checks every criterion. The proof is saved
   next to the card, with steps you can follow to check it yourself.
3. **You approve.** Nothing is committed until you do — every card, or once a phase. When the same
   mistake happens twice, it becomes a rule; if it still happens, a guard blocks it.

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

Read the deep version: [the build loop](https://ramesesbarria.github.io/groundwork/concepts/the-build-loop) ·
[evidence and approval](https://ramesesbarria.github.io/groundwork/concepts/evidence-and-approval).

## Quickstart

Needs Node.js 22+ and a git repo (for the commit loop), nothing else —
[installation](https://ramesesbarria.github.io/groundwork/getting-started/installation).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

![Running npx groundwork-ai init: choosing a tool, then the files it creates and the next step.](https://ramesesbarria.github.io/groundwork/demo-install.gif)

Open your AI tool in the project and type `/gw`. The first run asks a few setup questions; after
that it always says where things stand and runs the next step. `/gw-approve` and `/gw-reject` are
yours alone; the rest of the commands are in the
[command reference](https://ramesesbarria.github.io/groundwork/reference/agent-commands).

- Existing repo? [Existing projects](https://ramesesbarria.github.io/groundwork/guides/existing-projects) —
  nothing is overwritten, and old test failures don't block new work.
- New to this? [Your first 10 minutes](https://ramesesbarria.github.io/groundwork/getting-started/first-10-minutes)
  walks through a full session.
- Updating an older install: `npx groundwork-ai upgrade` keeps your spec, cards and lessons.
- Want to see a whole build? [The calculator walkthrough](https://ramesesbarria.github.io/groundwork/guides/walkthrough)
  has the recorded sessions and the numbers.

[**Full documentation →**](https://ramesesbarria.github.io/groundwork/)

## Who it's for

- **Experienced developers.** A real review step before anything merges: a reviewer that can't
  edit, evidence in the repo, guards for rules you're done repeating. Approve once per phase when
  you're in flow.
- **Early career, no senior around.** Work one small card at a time, with a reviewer that catches
  what you'd miss and proof you can point to. Every approval shows how to verify the work — the
  habit builds itself.
- **Vibecoders.** Answer a few questions, approve in plain English, ship. Small changes take the
  quick path with no ceremony; features get structure automatically.

## Honest comparison

| | Groundwork | A raw agent session |
|---|---|---|
| Project state | Files: spec, cards, handoff, decisions | The chat scrollback |
| "Done" | Evidence attached; approval refuses without it | Whatever the model summarizes |
| Review | A separate reviewer with fresh context, can't edit code | The context that wrote it |
| Learning | Repeated mistakes become rules, then guards | Starts fresh every session |
| Resume | Any session, tool or model continues from the handoff | Re-explain everything |

**When not to use it:** one-off scripts and throwaway experiments (just ask your agent); fully
autonomous overnight runs (Groundwork stops for you, by design); teams and pull-request flows (not
built yet). There are no benchmarks or evals — the claim is the mechanism, not a score.

## FAQ

**Does it work with an existing project?** Yes. Setup maps the codebase, records what's in use, and
saves a test baseline so old failures don't block new work.
[Existing projects →](https://ramesesbarria.github.io/groundwork/guides/existing-projects)

**Do I have to use the CLI?** Only to install. The workflow is markdown; `status`, `doctor`, `retro`
and `upgrade` are conveniences.

**Can I use any AI tool?** Any tool that reads files. Claude Code and OpenCode get native commands,
subagents and guards; others follow the markdown.

**What does it cost in context?** About 400 tokens always loaded; everything else loads when a step
needs it, and `npx groundwork-ai doctor` measures it.

[More questions →](https://ramesesbarria.github.io/groundwork/faq)

## Contributing

Issues and pull requests are welcome. The docs live in `docs/`; run `npm test` before opening a PR
(CI runs Windows and Linux on Node 22 and 24).

## License

[MIT](LICENSE)

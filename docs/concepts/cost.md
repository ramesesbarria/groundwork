# What it costs, and when it pays off

The [calculator walkthrough](/guides/walkthrough) took about 1.3M fresh tokens to build a
four-function calculator. That's a lot for a calculator, and on an app that small, Groundwork is
mostly overhead. This page explains where the tokens went, why the cost per card stays flat as a
project grows, and where it didn't stay flat.

## The short answer

- **Each card costs about the same, whatever its position in the project.** Every role starts in a
  fresh session with the same small context, so card 60 costs about what card 6 did.
- **One long chat gets more expensive with every step.** Each model call re-reads the whole
  conversation, so its total grows with the *square* of the work done, and a big enough project
  won't fit in a context window at all.
- **So there's a crossover.** Below it, the fixed cost of three roles, evidence and a review per card
  is most of the bill. Above it, the flat cost per card wins, and on a large app it's the only
  approach that finishes without losing the plan.

## Where the calculator's tokens went

Model: DeepSeek V4.1 Flash on max thinking, in OpenCode. The numbers come from OpenCode's own
per-call accounting. Every raw number is in
[measurements.md](https://github.com/ramesesbarria/groundwork/blob/main/transcripts/measurements.md).

| Work | Cost | Fresh tokens |
|---|---:|---:|
| **Building it** (6 cards, 2 phases) | **$0.586** | **1.33M** |
| Deploying to GitHub Pages | $0.020 | 31k |
| Exporting these transcripts | $0.061 | 94k |
| Total | $0.668 | 1.45M |

Building it, by who did the work:

| Who | Cost | Fresh tokens |
|---|---:|---:|
| Tester (6 sessions) | $0.170 | 385k |
| Reviewer (6 sessions) | $0.149 | 372k |
| Implementer (6 sessions) | $0.097 | 277k |
| Runner (the main chats) | $0.170 | 294k |

Two things stand out:

- **41% of all fresh tokens were reasoning.** Max thinking deliberates at length even over small
  choices.
- **35M tokens were re-read from cache**, against 1.45M fresh. Caching is why the bill is cents, but
  re-reading is where a long chat's cost hides.

## Why a long chat gets expensive

A model has no memory between calls. Each call sends everything so far: the tool's instructions,
the conversation, every file read, every command's output and, with thinking models, often the
reasoning too.

Say a session starts with **S** tokens (the tool's own instructions), and each unit of work (a card,
say) adds **h** tokens of history over **m** model calls. By the time it's on unit *j*, each call
re-reads about **S + j·h** tokens. Over **N** units:

```text
re-read ≈ m·N·S  +  m·h·N²/2
```

The second term is the problem. It grows with the square of N: twice the work re-reads four times
as much. It also has a hard ceiling. Once **S + N·h** passes the model's context window, the
tool compacts or truncates the chat, and whatever the plan was lives only in a summary.

## Why Groundwork stays flat

Groundwork runs each card as three fresh sessions (tester, implementer, reviewer). Each one reads
the same bounded slice: its role file, the card, HANDOFF, and only the code the card touches. The
state that has to survive lives in files, not in the chat. So each card costs about:

```text
re-read per card ≈ 3 · m · (S + b + h/2)      (b = the card's slice of the project)
total            ≈ N × that
```

That's linear in N, as long as **b** stays bounded, which is what each role's "Read only these"
list and the spec's Codebase map are for.

The calculator shows it. **All 18 role sessions started with between 8.8k and 9.7k tokens of
context**, from card 1.1 to card 2.2. What varied was the work in the card: the two UI cards cost
more ($0.13 and $0.08) because the tester built a browser check from scratch, not because the
project had grown.

| Card | 1.1 | 1.2 | 1.3 | 1.4 | 2.1 | 2.2 |
|---|---:|---:|---:|---:|---:|---:|
| Cost (three roles) | $0.059 | $0.045 | $0.040 | $0.060 | $0.128 | $0.084 |
| Fresh tokens | 140k | 121k | 108k | 152k | 288k | 224k |

## Where it didn't stay flat: the runner

The runner (the main chat that hands cards to the roles) is itself one long chat, and it grew
like one. Phase 1's runner reached **280k tokens of context per call** by the end. The main chats
account for 21.6M of the 35.2M tokens re-read. About half of that history was the runner's own reasoning;
the roles' reports back were only about a thousand tokens each.

The fix is the same idea again: **start a fresh session each phase.** HANDOFF carries everything
the next session needs, and `/gw` picks it up. The calculator's phase 2 did this by accident, and
its runner started at 9.2k instead of about 190k. Over its 61 calls, that's roughly 11M tokens that
weren't re-read. Groundwork now suggests a fresh session when a phase closes, and keeps the runner
light: short hand-offs, no rerunning checks between roles, one-line status edits.

## When it pays off

- **Small app, one sitting** (a calculator, a script): one plain chat is probably cheaper. The
  calculator run didn't measure that, so treat it as the model's prediction, not a result. What
  Groundwork still adds there is proof: tests written first, a reviewer who reruns everything, and
  approval before any commit.
- **An app that takes days, or more than one context window**: the flat cost per card starts to win,
  and resuming stops being expensive. With Groundwork, a fresh session in the finished calculator
  worked out where things stood in 9 calls ($0.009). Without Groundwork's files, the same question
  took 27 calls ($0.023), and the agent went looking in folders outside the project. That was one
  run each, but it's the shape to expect: without written state, every new session reconstructs it.
- **Large, long-lived apps**: this is what Groundwork is for. A single chat can't hold the project,
  and the spec, cards, evidence and lessons are what let any session, tool or model carry on.

## What every session pays up front

Before a session does anything, it has read its tool's own instructions plus Groundwork's files.
Measured in OpenCode with DeepSeek:

| | Tokens |
|---|---:|
| OpenCode's own instructions and tools (with this machine's global rules) | 8,563 |
| Added by Groundwork (`AGENTS.md` and the commands) | ≈680 |
| A `/gw` start in the finished calculator, after reading HANDOFF and the cards | ≈25k |

`npx groundwork-ai doctor` shows Groundwork's part for your project: what `/gw` and each role load
before touching any code, and any card long enough to be worth trimming, since every role rereads
it.

## Keeping your own runs cheap

- **Start a new session each phase**, or whenever the chat has run long. `/gw` resumes from HANDOFF.
- **Keep cards short.** History and Evidence lines of a sentence or two; details go in the evidence
  files.
- **Mind the thinking level.** Max thinking produced 41% of the calculator's fresh tokens. The
  [`models`](/reference/configuration#models-per-role) setting can give mechanical roles a cheaper
  model or setting.
- **Name what tests look for** in UI cards (an id, label or role), so the tester doesn't have to
  search for it.

## Measure your own run

OpenCode can export any session with its per-call token counts. From the project folder:

```bash
opencode session export <session-id> > main.json
node checks/session-costs.mjs main.json tester-1.1.json ...
```

[`checks/session-costs.mjs`](https://github.com/ramesesbarria/groundwork/blob/main/checks/session-costs.mjs)
prints each session's calls, first and peak context, tokens re-read, fresh tokens and cost, and splits
a main chat per human turn, so work that wasn't building can be set aside.

## Next

[Existing projects →](/guides/existing-projects)

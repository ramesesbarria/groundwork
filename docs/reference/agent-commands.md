# Agent commands

Commands are typed into your AI tool. **If you remember only one, make it `/gw`** — it works out
where the project is and runs the next step.

| When you want to… | Type |
|---|---|
| Start, or carry on where you left off | `/gw` |
| Set up Groundwork in this project | `/gw-setup` |
| Turn an idea into a spec | `/gw-spec` |
| Turn the spec into a plan of cards | `/gw-plan` |
| Build the next card | `/gw-next` |
| Accept finished work | `/gw-approve` |
| Send finished work back, with a reason | `/gw-reject` |
| Make a small change, fix a bug, or try something out | `/gw-quick` |
| Choose between options, like a database or a framework | `/gw-decide` |
| Agree how a screen looks and behaves before it's built | `/gw-ui-spec` |
| Save where things stand before you stop | `/gw-handoff` |
| Turn repeated mistakes into rules | `/gw-retro` |

In Claude Code and OpenCode these are native commands. In any other tool, ask your agent to *"read
`.groundwork/commands/<name>.md` and follow it"*. The commands are written so an agent can also
pick the right one from a plain request — you don't have to name them.

## The everyday commands

### `/gw`

The one command to remember. It reads only `HANDOFF.md` and the current card, says where things
stand in a sentence or two, and runs the next step — or asks when the next step is yours. It routes
to setup, spec, plan, the next card, or a phase review, and resumes a card that's mid-flight. It
never approves or rejects for you.

### `/gw-setup`

Turns the installed templates into *this* project's `AGENTS.md` and config: project name, one-line
description, whether you already chose a stack, how much explanation you want, and whether you
approve every piece of work or each milestone. Existing projects get the fuller
[onboarding](/guides/existing-projects). It ends by suggesting you commit the setup.

### `/gw-spec`

Turns a rough idea into `.groundwork/SPEC.md`. It asks for the **smallest useful version first**,
then batches of 3–5 specific questions, and writes answers into the spec as it goes. Defaults it
chose are marked *(default)*; gaps are asked about, never guessed. It finishes by asking you to
confirm the spec.

On an existing project it specs **the change you want**, not the whole app — goal, rules, edge
cases, and what must not break.

### `/gw-plan`

Turns the confirmed spec into phases and cards. Stack choices become [decision records](/guides/decisions)
first. You see the plan as a table and **nothing is written until you agree**. Then each card
becomes a file in `.groundwork/cards/` with checkable criteria and dependencies. Next step:
`/gw-next`.

### `/gw-next`

Runs the [build loop](/concepts/the-build-loop) on the next ready card: tester → implementer →
reviewer. In `per-card` mode it stops and shows you what changed, how to check it, the caveats and
any judgment calls; in `per-phase` mode it commits each card as it passes and stops when the phase
is done. If the reviewer sends a card back three times, it stops and asks you.

### `/gw-approve` · `/gw-reject <reason>`

**Only you run these.** Approve checks the evidence first and refuses if it's missing, then marks
the card done and commits it. Reject needs a reason in your words: it's recorded on the card, sends
it back to the implementer, and feeds `retro`. In Claude Code the model is blocked from invoking
either one.

### `/gw-quick`

The [light path](/concepts/right-sizing) for small, low-risk changes: one pass, no card. Bugs get
cause-first treatment; "can X do Y?" questions run on a throwaway branch and keep the answer, not
the code.

## The power commands

### `/gw-decide <topic>`

Lays out 2–4 options with trade-offs, waits for your choice, and records it — with the options you
chose from — in `.groundwork/decisions/`. Recommendations are labeled as recommendations.

### `/gw-ui-spec`

Before UI or animation work: agrees the states, transitions, constraints and screen sizes, offers
two approaches, and writes the agreed behavior onto the card as checkable criteria.
[UI and animation →](/guides/ui-and-animation)

### `/gw-handoff`

Writes the current state to `HANDOFF.md` now, so any session can continue. The loop does this on
its own at every role change; this command is for stopping at an awkward moment.

### `/gw-retro`

Reads the `groundwork retro` report and proposes moving repeated mistakes up the
[lessons ladder](/concepts/lessons-ledger) — note → rule → guard — plus archiving stale ones.
Nothing changes without your OK.

## Next

[CLI reference →](/reference/cli)

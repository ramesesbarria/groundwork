---
name: gw
description: Use when a session starts, or the human asks where things stand, what's next, or to carry on. Works out the project's state, says it in plain words, and runs the next step.
---
# gw

## Purpose
The one command to remember. Work out where the project is, tell the human, then do the next step, or ask when the next step is theirs.

## Steps
1. Read **only** `.groundwork/HANDOFF.md` and the current card it names, if any. Don't scan the rest of the repo yet.
2. Say where things stand in one or two plain sentences, e.g. "Card 1.3 *Login flow* is being built: the tests are written, the code isn't yet."
3. Take the **first** row that matches, and only that one:

| State | Action |
|---|---|
| Nothing set up: no `.groundwork/`, or AGENTS.md still has `{{...}}` placeholders | `gw-setup` (if `.groundwork/` is missing, tell the human to run `npx groundwork-ai init` first, and stop) |
| No spec yet (SPEC.md is still the empty template) | `gw-spec` |
| Spec written but not confirmed (HANDOFF doesn't say so) | Ask the human to read it and confirm, or say what to change |
| No cards yet | `gw-plan` |
| A card is `testing`, `implementing` or `review` | Resume it (below) |
| A card is `awaiting-approval` | Show the summary from `gw-next` step 7, then ask the human to approve or reject. Don't run either yourself |
| Otherwise | `gw-next` |

## Resuming a card
1. If the card's status and HANDOFF disagree, trust the card's status and tell the human in one line.
2. Check the last step really is finished: rerun the tests, or whatever it produced. If it isn't, redo just that step.
3. Continue with the role that matches the status, loading only the files that role lists: `testing` → `.groundwork/roles/tester.md`, `implementing` → `.groundwork/roles/implementer.md`, `review` → `.groundwork/roles/reviewer.md`.
4. Don't redo steps that HANDOFF or the card's History shows as finished. If one looks wrong, say so and ask before redoing it.
5. From there, follow `gw-next` as usual, updating HANDOFF at every role change.

## Writes
- Whatever the command or role it runs writes
- `.groundwork/HANDOFF.md`

## Must not
- Run `gw-approve` or `gw-reject`. Only the human does.
- Start a card over, or load the spec, other cards or the codebase before a step needs them.

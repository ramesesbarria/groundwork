---
name: gw-next
description: Use when there's a plan and the human wants to keep building, for example by saying next or carry on. Runs the next card through tester, implementer and reviewer, then stops for approval.
---
# gw-next

## Purpose
Take the next ready card through the build loop. You are the **runner** described in `.groundwork/workflow.md`: you hand the card to each role in turn, but you don't do their work yourself.

## Steps
1. Read `.groundwork/HANDOFF.md` and `.groundwork/config.json`. If HANDOFF shows a card still in progress, run `gw-resume` instead.
2. **Pick the card.** From `.groundwork/cards/`, take the **lowest-numbered** card whose status is `todo` or `rejected` and whose `depends_on` cards are all `done`. Compare IDs as numbers, part by part, so 1.2 comes before 1.10. If no card is ready, say which cards are blocked and by what, then stop.
3. **Start it.** A `todo` card: set status `testing` and add a History line. A `rejected` card: set status `implementing` and go straight to the implementer in step 5; the reason is under History.
4. **Tester.** Run `.groundwork/roles/tester.md` on the card: as a subagent if your tool has them, otherwise yourself, following "Without subagents" in the workflow.
5. **Implementer.** Run `.groundwork/roles/implementer.md`. If it hands back to the tester, return to step 4.
6. **Reviewer.** Run `.groundwork/roles/reviewer.md`. If it sends the card back, return to step 5. After 3 round trips, stop and ask the human.
7. **Stop or continue.** Every stop shows the human a plain-language **summary** in three parts:
   1. **What changed**, in plain words, not file names
   2. **How to check it yourself**: a URL to open, a command to run, or a thing to click (from the card's "How to check")
   3. **Caveats** from Evidence

   - `per-card` mode: the card is now `awaiting-approval`. **Stop**, show the summary, and ask the human to run `gw-approve` or `gw-reject`.
   - `per-phase` mode: the card is `done`. Commit it (message `[<card-id>] <card title>`), then continue with step 2 until the phase's cards are all done. Then stop, show one summary for the phase, and ask the human to review it.
8. Update HANDOFF at every role change and before you stop.

## Writes
- The card: status and History
- `.groundwork/HANDOFF.md`
- A commit per card, in `per-phase` mode only
- Everything the roles write

## Must not
- Do a role's work outside that role's file, e.g. fix a test while acting as runner.
- Start a card whose dependencies aren't `done`.
- Commit in `per-card` mode. That's `gw-approve`'s job.

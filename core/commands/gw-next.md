---
name: gw-next
description: Use when there's a plan and the human wants to keep building. Runs the next card through tester, implementer and reviewer.
---
# gw-next

## Purpose
Take the next ready card through the build loop: you are the **runner** in `.groundwork/workflow.md`.

## Steps
1. Read the handoff and config. On branch `gw/<id>` the handoff is `.groundwork/work/<id>/HANDOFF.md`; otherwise `.groundwork/HANDOFF.md`. Resume a card as `gw` says under "Resuming a card". `at-end`: follow `.groundwork/guides/at-end.md`.
2. **Pick the card.** From `.groundwork/cards/`, take the **lowest-numbered** card whose status is `todo` or `rejected` and whose `depends_on` cards are all `done`. Compare IDs as numbers, part by part (1.2 before 1.10). If none is ready, say what blocks them and stop.
3. **Start it.** A `todo` card: set status `testing`, add a History line. A `rejected` card: set status `implementing` and go straight to the implementer in step 5; the reason is under History.
4. **Tester.** Run `.groundwork/roles/tester.md` on the card: as a subagent if your tool has them, otherwise yourself (see "Without subagents" in the workflow).
5. **Implementer.** Run `.groundwork/roles/implementer.md`; if it hands back to the tester, return to step 4.
6. **Reviewer.** Run `.groundwork/roles/reviewer.md`. If it sends the card back, return to step 5. After 3 round trips, stop and ask the human.

   Hand each role the card's path, its role file and only facts you've checked. Never guesses ("probably no browser"), statuses to set, or what was agreed (it's on the card). Don't rerun checks between roles: the reviewer does.
7. **Stop or continue.** Every stop shows a plain **summary**:
   1. **What changed**, in plain words, not file names
   2. **How to check it yourself**: a URL, command or click (from the card's How to check; `run` first for an app)
   3. **Caveats** from Evidence, and any open **Human checks**
   4. **Calls**: every `call:` line in the card's History

   If `experience` is `new`, always include how to check it, in plain steps; if `experienced`, keep the summary short and give How to check only if asked.

   - `per-card` mode: first update SPEC.md, decisions and docs for the card (approval covers them). The card is now `awaiting-approval`. **Stop**, show the summary, and ask the human to run `gw-approve` or `gw-reject`.
   - `per-phase` mode: the card is `done`. Change the card first, then commit as a separate step: the gate reads the card before the command runs. Commit it (`[<card-id>] <card title>`, or `commitFormat`; `autoCommit` off: say what to commit). Then repeat from step 2 until the phase's cards are done, and stop, showing one summary for the human to review.
8. Update HANDOFF at every role change and before you stop. With subagents, only you write it, from their reports.

## Writes
- The card: status and History
- `.groundwork/HANDOFF.md`
- A commit per card, in `per-phase` mode only
- Everything the roles write

## Must not
- Do a role's work outside that role's file, e.g. fix a test while acting as runner.
- Start a card whose dependencies aren't `done`.
- Commit in `per-card` mode. That's `gw-approve`'s job.

---
name: gw-approve
description: Use when the human says to approve the card awaiting approval, or a whole phase in per-phase mode. Checks the evidence, marks it done and commits it.
---
# gw-approve

## Purpose
Record the human's approval of a card and commit it. Only the human runs this.

## Steps
If the human didn't ask for this in their own words, stop and ask them to approve or reject.

1. Find the card with status `awaiting-approval` (from HANDOFF, or the ID the human gives). If there is none, say so and stop.
2. **Check the evidence.** Refuse to approve if:
   - the card's Evidence section is empty, or
   - any file it links to in `.groundwork/evidence/<card-id>/` is missing, or
   - any acceptance criterion is unchecked with no explanation next to it.
   When you refuse, say exactly what's missing. Don't fill it in yourself.
3. Set the card status to `done` and add a History line: date, "approved by human".
4. Update `.groundwork/HANDOFF.md`: card done, and the next step.
5. Commit the card's changes (code, tests, card, evidence, HANDOFF) with the message `[<card-id>] <card title>` and a short body saying what changed. Stage only this card's files.
6. Show the human the commit, then run `gw-next` if they asked to keep going.

**Approving a phase (`per-phase` mode).** The cards are already committed. Check every card in the phase is `done` and passes the evidence check in step 2; list any that don't. If all pass, write "phase <n> approved" and the date in HANDOFF, with the next step. Push only if the human asks.

## Writes
- The card: status and History
- `.groundwork/HANDOFF.md`
- One commit

## Must not
- Run this on your own, or approve on the human's behalf without their explicit instruction.
- Add anything to the commit message the project's rules forbid (check LESSONS.md and AGENTS.md).
- Push, unless the human asks.

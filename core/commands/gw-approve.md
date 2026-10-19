---
name: gw-approve
description: Use when the human says to approve the waiting card, or a phase in per-phase mode. Checks the evidence and commits.
---
# gw-approve

## Purpose
Record the human's approval of a card and commit it.

Only the human runs this; the `/gw-approve <id>` prompt counts.

## Steps
If the human didn't ask for this in their own words, stop and ask them to approve or reject.

1. Find the `awaiting-approval` card (HANDOFF, or the ID given). If none, say so and stop.
2. **Check the evidence.** Run `npx groundwork-ai check <card-id>` (or check by hand without Node). Refuse to approve if:
   - the card's Evidence section is empty, or
   - any file it links to in `.groundwork/evidence/<card-id>/` is missing, or
   - any acceptance criterion is unchecked with no reason after it (`- [ ] <criterion> — <why>`).
   When you refuse, say what's missing; don't fill it in yourself.
3. **Show the summary** from `gw-next` step 7: what changed, how to check it yourself, caveats, and open human checks. Follow `experience`: `new` always gets How to check; `experienced` a short summary.
4. Set the card status to `done` and add a History line: date, "approved by human". Confirm or waive each open human check with the human: tick confirmed ones with the date, waived ones `— waived <date> (<why>)`, and add one line: `human checks confirmed: <n>; waived: <n> — <why>`.
5. Update `.groundwork/HANDOFF.md`: card done, next step. If this was the last card of its phase, add its recap (below) and say "phase <n> approved" in HANDOFF.
6. Commit the card's changes with the message `[<card-id>] <card title>` (or the config's `commitFormat`). Stage only this card. Keep the status change and this commit as separate steps: the gate reads the card before the command runs. With `autoCommit` off, say what to commit instead.
7. Show the commit; run `gw-next` if they asked to continue.

**Approving a phase (`per-phase` mode).** The cards are already committed. Check every card is `done` and passes step 2's check; list any that don't. Show one summary (step 3) with every `call:` line from the phase and all the phase's open human checks; ask the human to confirm or waive them together, ticking the cards the same way. If all pass, write "phase <n> approved" and the date in HANDOFF. Push only if asked.

**`at-end` mode:** `/gw-approve all` records the batch; follow "Approving" in `.groundwork/guides/at-end.md`.

**Fresh session per phase.** When a phase closes, tell the human the next phase is cheaper in a new session: HANDOFF carries everything; `gw` picks it up.

**Phase recap.** When a phase closes, append exactly one recap to `.groundwork/JOURNAL.md` (create if missing), as its comment format shows: what shipped, how to try it, decisions, calls, and lessons. Under about 150 words; link to cards, don't copy them.

## Writes
- The card: status and History
- `.groundwork/HANDOFF.md`
- `.groundwork/JOURNAL.md`, when a phase closes
- One commit

## Must not
- Run this on your own, or approve on the human's behalf without instruction.
- Add anything the rules forbid to the commit message (LESSONS.md, AGENTS.md).
- Push, unless the human asks.

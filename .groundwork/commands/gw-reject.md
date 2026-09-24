---
name: gw-reject
description: Reject the card awaiting approval with a reason. It goes back to the implementer.
---
# gw-reject

## Purpose
Record the human's rejection and send the card back into the loop. The reason is kept on the card, where the implementer reads it and `retro` counts it later.

## Steps
1. Find the card: status `awaiting-approval`, or a `done` card the human names during a phase review.
2. If the human gave no reason, ask for one in a single sentence. Don't reject without a reason.
3. Add a History line: date, "rejected:", and the reason in the human's words.
4. Set the status to `rejected`.
5. Update `.groundwork/HANDOFF.md`: the card is rejected, and the next step is `gw-next`, which sends it to the implementer.
6. If the reason looks like a mistake that could happen again, suggest adding it to `.groundwork/LESSONS.md` as a NOTE. Add it only if the human agrees.

## Writes
- The card: status and History
- `.groundwork/HANDOFF.md`
- `.groundwork/LESSONS.md`, only with the human's OK

## Must not
- Start fixing the card here. That's the implementer's job, through `gw-next`.
- Reword the human's reason.

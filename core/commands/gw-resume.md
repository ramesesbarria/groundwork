---
name: gw-resume
description: Continue unfinished work from .groundwork/HANDOFF.md and the current card, in any tool or with any model.
---
# gw-resume

## Purpose
Pick up exactly where the last session stopped, without redoing finished work and without reading the whole repo.

## Steps
1. Read **only** `.groundwork/HANDOFF.md` and the current card it names. Don't scan the rest of the repo yet.
2. If the card's status and HANDOFF disagree, trust the card's status. Tell the human about the difference in one line.
3. Check the last step really is finished: run the tests (or whatever the last step produced). If it isn't, redo just that step.
4. Continue with the role that matches the card's status, loading only the files that role lists:
   - `testing` → `.groundwork/roles/tester.md`
   - `implementing` → `.groundwork/roles/implementer.md`
   - `review` → `.groundwork/roles/reviewer.md`
   - `awaiting-approval` → nothing to do; ask the human to run `gw-approve` or `gw-reject`
   - no card in progress → run `gw-next`
5. Don't redo steps that HANDOFF or the card History shows as finished. If you think one was done wrong, say so and ask before redoing it.
6. From here on, follow `gw-next` as usual, updating HANDOFF at every role change.

## Writes
- Whatever the resumed role writes
- `.groundwork/HANDOFF.md`

## Must not
- Start over from the beginning of the card.
- Load the spec, other cards or the whole codebase before step 4 says which files the role needs.

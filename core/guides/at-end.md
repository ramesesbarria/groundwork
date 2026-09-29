# Building straight through (`at-end` mode)

The human chose to review once, at the end: usually a deadline. You build every card yourself, in order, without stopping. One review covers them all, then the human approves once. Nothing is rounded up: a card you built is `built`, not `done`, until the review and the human say so.

## For each card
1. **Pick** the lowest-numbered card with status `todo` or `rejected` whose `depends_on` cards are `built` or later. Set it `implementing` with a History line.
2. **Tests first, briefly.** Turn the card's acceptance criteria into tests and run them once to see them fail. Skip `gw-ui-spec` unless the human asks; note any look-and-feel call as a `call:` line.
3. **Build it** until the card's tests, the full suite, lint and build pass (or, with a baseline, nothing new fails).
4. **Save the proof** in `.groundwork/evidence/<card-id>/`: the command, its summary line and any failures, the way "What to save" in `.groundwork/workflow.md` says. Link it under Evidence. Leave the criteria unticked: the review ticks them.
5. **Mark it built**: status `built`, History `YYYY-MM-DD implementing → built: <summary line>`.
6. **Commit a checkpoint**, unless `autoCommit` is `false`: this card's files only, message `[<card-id>] <card title> (not reviewed yet)` in the config's `commitFormat`. Work is never left only on disk. With `autoCommit` off, list what to commit in HANDOFF instead.
7. **Keep HANDOFF current** (which card, what's built, what's next), then go on to the next card without stopping. Stop early only for the "Stop only for" list in the workflow.

## When every card is built: the end review
1. **One reviewer run** over all `built` cards: `.groundwork/roles/reviewer.md`, as a subagent if your tool has them. Hand it the list of card paths and the diff since the plan was committed. It reviews each card the way its role file says: reruns the checks, ticks each criterion it has seen proof of, writes How to check, and sets each card `awaiting-approval` or back to `implementing` with the problems.
2. **Fix what it sends back**, as in step 3 above, mark the card `built` again, and rerun the review for those cards only. After 3 round trips on a card, stop and ask the human.
3. **Stop for the human** with one summary for the whole build: what changed, how to try it, caveats, and every `call:` line. Ask them to run `gw-approve` (all cards at once) or `gw-reject` with the cards and reasons.

## Approving (`gw-approve`)
Every card waiting for approval gets `gw-approve` steps 2 and 4 at once; list any that fail the check, and approve the rest only if the human says so. Then one commit with the approved cards' files and HANDOFF, message `Approve cards <first>–<last>` (no card ID: each card already has its checkpoint commit), and one recap per phase in JOURNAL.

## Must not
- Mark a card `done`, or tick its criteria, before the review and the human's approval.
- Skip saving the test output: a `built` card without Evidence can't be committed.
- Switch the approval mode yourself. If the human wants to change it, give them the command (`npx groundwork-ai mode <mode>`).

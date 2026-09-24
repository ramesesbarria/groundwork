# Groundwork workflow

How a card goes from idea to commit. This works in any AI tool. Adapters only add shortcuts.

**The runner** is the main session: the one you type `gw-next` into. It picks cards, hands them to each role in turn, and commits after approval. The roles are described in `.groundwork/roles/`.

## The loop

1. **Pick.** The runner picks the lowest-numbered card with status `todo` or `rejected` whose `depends_on` cards are all `done`.
2. **Test.** The tester writes failing tests and saves the failing output as evidence.
3. **Implement.** The implementer makes the tests pass, and the full suite, lint and build too.
4. **Review.** The reviewer reruns everything, checks every criterion, and fills in Evidence, or sends the card back.
5. **Approve.** In `per-card` mode the runner stops and shows what changed, how to check it yourself, and caveats. The human approves or rejects.
6. **Commit.** After approval the runner commits and moves to the next card.

Small, low-risk changes skip this loop: use `gw-quick` (one pass, no card, checks must still pass).

## Card statuses

| From | To | Who | When |
|---|---|---|---|
| `todo` | `testing` | runner | Starts the card |
| `testing` | `implementing` | tester | Failing tests are written and saved |
| `implementing` | `review` | implementer | Tests, lint and build all pass |
| `implementing` | `testing` | implementer | A test looks wrong; reason written on the card |
| `review` | `implementing` | reviewer | Problems found; listed under History |
| `review` | `awaiting-approval` | reviewer | Passed, in `per-card` mode |
| `review` | `done` | reviewer | Passed, in `per-phase` mode (the runner commits) |
| `awaiting-approval` | `done` | human | Approves (the runner commits) |
| `awaiting-approval` | `rejected` | human | Rejects, with a reason |
| `done` | `rejected` | human | Rejects a card during a phase review |
| `rejected` | `implementing` | runner | Picks the card up again; the reason is on the card |

When you tell the human about a card, use plain labels, not these status names: `todo` → to do, `testing` → being tested, `implementing` → being built, `review` → in review, `awaiting-approval` → waiting for you, `done` → done, `rejected` → sent back.

No other changes are allowed. Every change gets one line under the card's History, in the formats shown in `.groundwork/templates/card.md`.

## Approval

Set `approvalMode` in `.groundwork/config.json`:

- **`per-card`** (default): the runner stops at `awaiting-approval`. The human approves or rejects each card.
- **`per-phase`**: cards that pass review are committed one by one without stopping. When the phase's last card is done, the runner stops and the human reviews the phase. They can reject any card, which goes back into the loop. Nothing is pushed until the phase is approved.

**No evidence, no approval.** A card can't be approved while its Evidence section is empty or links to a missing file. Evidence is saved in `.groundwork/evidence/<card-id>/` and linked from the card.

**What to save:** the command you ran, its summary line (e.g. "42 passed, 3 failed"), and the failures, about the last 30 lines at most. Not the full output: evidence is committed, so keep each file short enough to read.

**After approval** the runner:
1. sets the card to `done` and adds a History line,
2. updates HANDOFF.md,
3. commits the card's changes with the message `[<card-id>] <card title>`, plus a short body saying what changed,
4. moves to the next card, or stops if the human asked it to.

Commits are made by the runner only, never by a role, and never before approval (or before review passes, in `per-phase` mode).

## Checks
The project's test, lint and build commands are in `.groundwork/config.json`.

- **Normally, all pass.** A card isn't done while any of them fails.
- **With a baseline, no new failures.** An existing project may start with failures, recorded as a baseline in `.groundwork/evidence/baseline/` and named under "Known failing" in HANDOFF. Then a card passes if nothing fails that wasn't already failing. A card that fixes a baseline failure says so in its History, and the baseline is updated.

## Stop only for
While working through cards, and especially in `per-phase` mode, stop and ask the human only for:
- anything destructive, or that can't be undone (deleting data, rewriting history)
- security-sensitive changes (logins, secrets, permissions)
- a new dependency or a stack change (these need a decision record: `gw-decide`)
- a gap in the spec that changes what users see

Everything else: make the call, and add a line to the card's History:
`YYYY-MM-DD call: <what> — <why> — <cost if wrong>`
Every call is shown at approval, so nothing is decided out of sight.

## HANDOFF

`.groundwork/HANDOFF.md` is the current state, overwritten each time, not a log. Update it:
- at **every role change**,
- after every approval or rejection,
- **before you stop** for any reason, including when you're running out of context or usage.

A fresh session, in any tool or with any model, must be able to continue from HANDOFF.md plus the current card alone.

## Without subagents

If your tool can't start separate agents, one session plays every role in turn:

1. Before each role, read that role's file in `.groundwork/roles/` and **only** the files it lists under Load.
2. Finish the role completely, update the card status and HANDOFF, then switch.
3. As reviewer, reread the diff from the start as if someone else wrote it. Don't rely on memory from implementing it.

It's weaker than a truly fresh reviewer, which is why the reviewer reruns every check itself instead of trusting earlier output.

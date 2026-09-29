# Groundwork workflow

How a card goes from idea to commit. This works in any AI tool. Adapters only add shortcuts.

**The runner** is the main session: the one you type `gw-next` into. It picks cards and hands them to each role (`.groundwork/roles/`) in turn.

## The loop

1. **Pick.** The runner picks the lowest-numbered card with status `todo` or `rejected` whose `depends_on` cards are all `done`.
2. **Test.** The tester writes failing tests and saves the failing output as evidence.
3. **Implement.** The implementer makes the tests pass, and the full suite, lint and build too.
4. **Review.** The reviewer reruns everything, checks every criterion, and fills in Evidence, or sends the card back.
5. **Approve.** In `per-card` mode the runner stops and shows what changed, how to check it yourself, and caveats. The human approves or rejects.
6. **Commit.** After approval the runner commits and moves to the next card.

Small, low-risk changes skip this loop: use `gw-quick` (one pass, no card, checks must still pass).

## Card statuses

A card goes `todo` → `testing` → `implementing` → `review` → `awaiting-approval` → `done`; the runner starts it, and a card sent back is `rejected` until the runner picks it up again. Before you change a status, read `.groundwork/reference/statuses.md`: who may make each change, and the plain labels to use with the human. Every change gets one line under the card's History, in the formats shown in `.groundwork/templates/card.md`.

## Approval

`approvalMode` in `.groundwork/config.json` (after setup, only the human switches it to `per-phase`; if they ask you to, tell them the one line to change):

- **`per-card`** (default): the runner stops at `awaiting-approval`. The human approves or rejects each card.
- **`per-phase`**: cards that pass review are committed one by one without stopping. When the phase's last card is done, the runner stops and the human reviews the phase. They can reject any card, which goes back into the loop. Nothing is pushed until the phase is approved.

**No evidence, no approval.** A card can't be approved while its Evidence section is empty or links to a missing file. Evidence is saved in `.groundwork/evidence/<card-id>/` and linked from the card.

**What to save:** the command you ran, its summary line (e.g. "42 passed, 3 failed"), and the failures, about the last 30 lines at most. Not the full output: evidence is committed, so keep each file short enough to read. Write evidence files with your file-write tool or `node -e`, never with shell redirection (`>`, `Out-File`): Windows PowerShell 5.1 saves those as UTF-16, which git treats as binary.

**After approval** the runner sets the card to `done`, updates HANDOFF, and commits the card's changes as `[<card-id>] <card title>` (or the config's `commitFormat`) with a short body, then moves on. Only the runner commits, never a role, and never before approval (or before review passes, in `per-phase` mode). The commit gate refuses a card commit while the card isn't `done` or fails `groundwork check`.

## Experience
`experience` in `.groundwork/config.json` sets how much you explain. Read it each time (nothing else stores it), so it can change mid-project.

| | `new` | `experienced` |
|---|---|---|
| Explanations | One sentence per step | Terse |
| Approval stop | Always "How to check it yourself" | Short summary |
| Stack decisions | A labeled recommendation | Options only, unless asked or a check is lost |

## Checks
The project's test, lint and build commands are in `.groundwork/config.json`.

- **Normally, all pass.** A card isn't done while any of them fails.
- **With a baseline, no new failures.** An existing project may start with failures, saved in `.groundwork/evidence/baseline/` and named as "Known failing" in HANDOFF. A card then passes if nothing new fails. A card that fixes a baseline failure says so, and the baseline is updated.

## Stop only for
Especially in `per-phase` mode, stop and ask the human only for:
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

If your tool can't start separate agents, one session plays every role in turn. Before each role, read its file in `.groundwork/roles/` and **only** what it lists under Load; finish the role, update the card and HANDOFF, then switch. As reviewer, reread the diff as if someone else wrote it and rerun every check: it's weaker than a fresh reviewer.

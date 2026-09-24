---
name: gw-quick
description: Use when the human asks for a small, low-risk change, such as a typo, a copy tweak or a config value, or reports a bug. Makes it in one pass without a card, cause first for bugs, and the tests must still pass.
---
# gw-quick

## Purpose
The light path. Process cost should match the size of the change: no card file, no separate roles, no evidence folder. The checks still run and the project's rules still apply.

## When to use it
Use it for a **small** change with one concern and low risk: a typo, copy or style tweak, a config value, a dependency bump, or a bug (see "Fixing a bug", even when the cause isn't clear yet).

Make a card instead (`gw-plan`, then `gw-next`) when the change:
- adds a feature or changes how something behaves in a way users would notice,
- touches the data model, a public API, security or money,
- needs a decision,
- is UI animation or layout work (use `gw-ui-spec`),
- touches more than about 3 files.

## Steps
1. Read `.groundwork/HANDOFF.md` and the lesson titles in `.groundwork/LESSONS.md`.
2. Say in one line what you'll change and why it fits the light path.
3. If behavior changes, add or update a test first and see it fail.
4. Make the change. If it grows past the limits above, **stop**, say so, and suggest making a card instead.
5. Run the project's test, lint and build commands. All must pass before you commit.
6. Show a short summary of the diff.
7. Commit with the message `[quick] <what changed>`:
   - `per-card` mode: only after the human says OK.
   - `per-phase` mode: once the checks pass.
8. Add one line to Notes in `.groundwork/HANDOFF.md`, e.g. "Quick change: fixed typo on the home page (abc123)". Don't change the current card or next step.

## Fixing a bug
Cause first, then the fix. In step 3 above:
1. Reproduce the bug with a failing test, and see it fail for the reason the human described.
2. State the cause in one sentence, with the evidence that shows it (a log line, a value, the line of code).
3. Only then fix it, and see the test pass.

If there's still no cause after two honest attempts, **stop**: say what you tried and suggest a card, so it gets planned and reviewed properly.

## Trying something out
For a question like "Can this library do X?" or "Is this even possible?". The answer is what you keep, not the code.
1. State the question in one line.
2. Try it on a throwaway branch (`try/<topic>`) or in a scratch folder outside the project. Never on the main branch.
3. Report the answer, the evidence behind it, and a recommendation.
4. Don't merge the code. If the human wants to keep it, that's a new card. Delete the branch once they have the answer.

Steps 5–8 above don't apply: nothing is committed to the main branch.

## Writes
- The change itself, and any test for it
- One commit
- One line in `.groundwork/HANDOFF.md`

## Must not
- Skip, weaken or delete a failing test to get a change through.
- Use this path to avoid making a card for real feature work.
- Change the stack or add a dependency without a decision record.

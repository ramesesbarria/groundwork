---
name: gw-quick
description: Make a small, low-risk change in one pass, without a card or separate roles. Tests must still pass.
---
# gw-quick

## Purpose
The light path. Process cost should match the size of the change: no card file, no separate roles, no evidence folder. The checks still run and the project's rules still apply.

## When to use it
Use it for a **small** change with one concern and low risk: a typo, copy or style tweak, a config value, a dependency bump, or a bug with an obvious cause and fix.

Make a card instead (`gw-plan`, then `gw-next`) when the change:
- adds a feature or changes how something behaves in a way users would notice,
- touches the data model, a public API, security or money,
- needs a decision, or its cause isn't clear,
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

## Writes
- The change itself, and any test for it
- One commit
- One line in `.groundwork/HANDOFF.md`

## Must not
- Skip, weaken or delete a failing test to get a change through.
- Use this path to avoid making a card for real feature work.
- Change the stack or add a dependency without a decision record.

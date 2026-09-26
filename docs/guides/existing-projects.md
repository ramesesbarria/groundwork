# Existing projects

Groundwork works in a repo that already has code, history and conventions. Setup never rewrites
your project — it maps it, records what's already true, and sets a baseline so old failures don't
block new work.

::: tip Nothing is overwritten
`init` never replaces an existing `CLAUDE.md` or `AGENTS.md`. It appends Groundwork's pointer lines
and leaves your content alone.
:::

## What setup does

1. Reads the manifest, folder layout, tests, CI config and `git log` — not every source file.
2. Drafts `AGENTS.md`: stack, commands and conventions it found, each marked **found** (seen in a
   file) or **guessed**.
3. Drafts a "current state" `.groundwork/SPEC.md`: what the app does today, with gaps under Open
   questions.
4. Writes a **Codebase map** into the spec (under ~20 lines): main folders, entry points, where
   tests live, anything unusual. Also marked found or guessed. Roles read this before any source
   file.
5. Runs test, lint and build once and saves the result as a **baseline** (see below).
6. Records each stack choice already in use as an `accepted` decision record, with the reason
   "already in use". It never proposes changing your stack.
7. Imports rules from your existing instruction files — see
   [imported rules](/concepts/lessons-ledger#imported-rules).
8. Shows you everything marked **guessed** and asks you to confirm or correct it.

If `git log` shows a commit style of its own (`feat(auth): …`), Groundwork proposes a matching
`commitFormat` for the config, marked found. Your commit history stays yours.

## Specs the size of a change

On an existing project, the spec keeps "what the app does today" short and adds a **Changes**
section — one sub-section per change you want:

```md
### Hide results until the vote closes (open)
- Goal: nobody sees counts before the close time
- Rules: counts appear only after close
- Edge cases: a tie; nobody voted
- Must not break: the existing one-vote-per-person rule
```

The planner works **one change at a time**: plan only the open change, then mark it `planned` when
cards exist. After setup, the first question is always *"what do you want to change or add first?"* —
never a request to spec the whole app.

## The test baseline

Setup saves the current state of your checks in `.groundwork/evidence/baseline/`, and `HANDOFF.md`
says **Known failing: …** if anything does.

From then on:

- cards are judged by **no new failures**, not "everything passes";
- a card that fixes a baseline failure says so, and the baseline is updated;
- if the project has no tests at all, setup asks you to decide: add a test setup as the first card,
  or rely on manual checks until then.

## Choosing where to start

After setup:

- Something small — a typo, a fix, a config value? Use `/gw-quick`.
- Anything else? Answer the "what do you want to change first?" question and `/gw` will spec it,
  plan it, and start the first card.

## Next

[UI and animation →](/guides/ui-and-animation)

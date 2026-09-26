# UI and animation

**UI work goes in circles when behavior is only described in words** and fixed by trial and error.
Groundwork settles the behavior in writing first, then builds against checkable criteria.

Run `/gw-ui-spec` on a card before `/gw-next`, or whenever the work involves visible behavior.

## What gets agreed

The agent describes back to you, in plain English:

- **States** — default, hover or focus, active, loading, empty, error.
- **Transitions** — what changes between states, how long it takes, and **which elements move**
  (the real element, a copy, or an overlay?).
- **Constraints** — long text, missing images, no scrollbars appearing, no fixed heights that clip
  content, keyboard and screen-reader use.
- **Screen sizes** — at least a phone (≈375px), a tablet (≈768px) and a desktop (≈1440px).

Then it offers **two approaches** with their trade-offs (for example CSS transform vs layout
animation), says which it suggests and why, and **waits for your OK**. No code is written before
you agree to the behavior.

## Agreed behavior becomes criteria

The agreement is written onto the card as acceptance criteria — one checkable statement each, in
the form of something observable:

> At 375px, the active card slides to the horizontal center; no scrollbar appears.

Each criterion gets a way to verify it:

- **Screenshots** at each screen size, saved to `.groundwork/evidence/<card-id>/`, if the tool can
  take them;
- otherwise a **manual check** you can follow.

The tester then writes browser checks for criteria that only show in the running app, and puts the
command under the card's **How to check** — so the implementer and the reviewer rerun exactly the
same check you were given.

## During the loop

The normal [build loop](/concepts/the-build-loop) runs after that, with two UI-specific rules:

- The implementer starts the app and tries the change, not just the tests.
- The reviewer treats "reading the code" as not proof: it re-runs the browser checks or drives the
  app itself. If a criterion truly can't be verified live, it's marked *not verified live* and
  becomes the first caveat you see.

If the work redesigns something that already works, the agent suggests committing the current
working state first, so you can always get back to it.

## Next

[Stack decisions →](/guides/decisions)

---
name: gw-ui-spec
description: Use when a card involves UI or animation work, before anything is built. Agrees in writing how it will look and behave, as checkable criteria on the card.
---
# gw-ui-spec

## Purpose
UI and animation work goes round in circles when the behavior is only described in words and fixed by trial and error. Agree the behavior first, write it as acceptance criteria, then build. Run it on a card before `gw-next`, or whenever a card involves visible behavior.

## Steps
1. Read the card and any design notes, screenshots or reference sites the human gives you.
2. Describe back, in plain English:
   - **States:** default, hover or focus, active, loading, empty, error.
   - **Transitions:** what changes between states, how long it takes, and **which elements move** (the real element, or a copy or overlay?).
   - **Constraints:** long text, missing images, no scrollbars appearing, no fixed heights that clip content, keyboard and screen-reader use.
   - **Screen sizes:** at least a phone (≈375px), a tablet (≈768px) and a desktop (≈1440px) width.
3. Offer **two approaches** with their trade-offs (e.g. CSS transform vs. layout animation), and say which one you'd suggest and why.
4. **Wait for** the human's OK or corrections.
5. Write the agreed behavior into the card in `.groundwork/cards/` as **acceptance criteria**, one checkable statement each, e.g. "At 375px, the active card slides to the horizontal center; no scrollbar appears." Name the elements a test will look for (an id, label or role, e.g. `#display`), so the tester doesn't have to guess.
6. Say how each criterion is verified: **screenshots** at each screen size if your tool can take them (saved to `.groundwork/evidence/<card-id>/`), otherwise a **manual check** the human does.
7. If this redesigns something that already works, suggest a commit of the current working state first, so it can be restored.

## Writes
- The card: acceptance criteria and manual checks
- `.groundwork/HANDOFF.md`

## Must not
- Write any code before the human agrees to the behavior.
- Swap the agreed approach for another (e.g. an overlay instead of moving the real element) without asking.

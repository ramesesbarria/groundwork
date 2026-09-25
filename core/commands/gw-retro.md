---
name: gw-retro
description: Use when a phase ends, or the human asks why the same mistakes keep happening. Proposes moving lessons up the ladder (note, rule, guard), and nothing changes without the human's OK.
---
# gw-retro

## Purpose
Turn repeated mistakes into lessons that stick. A lesson moves up the ladder each time its mistake comes back: **NOTE** (recorded in LESSONS) → **RULE** (in AGENTS.md or a role file, always in context) → **GUARD** (a script that blocks the action). Run it at the end of a phase, or when something keeps going wrong.

## Steps
1. Run `groundwork retro` (or `npx groundwork-ai retro`). It writes `.groundwork/retro.md`: reverts, fix commits soon after a card, rejections, reviewer send-backs, and counts per lesson cited. Without the CLI, read the History sections of the cards instead.
2. Read `.groundwork/retro.md` and `.groundwork/LESSONS.md`.
3. Group signals that describe the same mistake, even if worded differently. Ignore one-off signals.
4. Propose one change per repeated mistake:
   - **New NOTE**: it repeats but isn't in LESSONS yet. Write its origin (cards, commits).
   - **NOTE → RULE**: a NOTE whose mistake happened again. Say where the rule goes (AGENTS.md, or one role file if only that role needs it).
   - **RULE → GUARD**: a RULE that was still broken, and a script could detect it. A new guard is code, so propose it as a card for `gw-plan` rather than writing it here.
   - **Archive**: a lesson nothing has touched in a long time (see `groundwork doctor`).
5. Show the proposals as a short list, each with its evidence, and **wait for** the human to accept or decline each one.
6. Apply only the accepted ones. Update each lesson's Level and History line, e.g. "note (09-02) → rule (09-24, repeated in cards 1.3 and 1.5)".
7. Update `.groundwork/HANDOFF.md`, noting "retro done" and the date, so `gw` doesn't suggest it again for the same phase. Then tell the human the next step in one line: the next phase's first card, or, if every phase is done, "say what to change or add next".

## Writes
- `.groundwork/LESSONS.md`
- `AGENTS.md` or a file in `.groundwork/roles/`, for accepted rules
- A new card, for an accepted guard
- `.groundwork/HANDOFF.md`

## Must not
- Change any lesson, rule or guard without the human's OK.
- Promote a lesson on one signal. It moves up only when the mistake repeats.
- Blame a person. Lessons describe what went wrong, not who.

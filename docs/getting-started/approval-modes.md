# Approval modes

Groundwork has one hard rule: **nothing is committed without your approval.** How often you're
asked is your choice.

Set it in `.groundwork/config.json`:

| Mode | What happens |
|---|---|
| **`per-card`** (default) | The runner stops after every card. You approve or reject each one before its commit. |
| **`per-phase`** | Cards that pass review commit on their own. When the phase's last card is done, the runner stops and you review the phase as a whole. |

During setup the agent asks in plain words — *"every piece of work, or each milestone?"* If you're
unsure, `new` users default to per-card, `experienced` to per-phase. You can change it any time;
it's read fresh at each stop.

## What every stop shows

Whichever mode you use, the agent stops with the same three things, in plain words:

1. **What changed** — what the work does, not file names.
2. **How to check it yourself** — a URL to open, a command to run, or a thing to click. For UI
   work, the reviewer writes this on the card before you ever see it.
3. **The caveats** — anything unverified, partial, or added beyond the card.

In `per-phase` mode the phase review also lists **every judgment call** the agent made along the
way — each is a line on a card's History in the form
`YYYY-MM-DD call: <what> — <why> — <cost if wrong>`.

## No evidence, no approval

Approval refuses to run while the card's evidence is missing or empty — a test output file, a
screenshot, the reviewer's verdict, all linked from the card. When a UI criterion truly can't be
verified live, the reviewer must flag it *not verified live* and list it as the first caveat, so
you know exactly what you're taking on trust.

## Rejecting

`/gw-reject` needs a reason, in your own words. It's recorded on the card and sends the work back
to the implementer. Rejections feed `groundwork retro`, so a mistake you had to catch twice has a
path to becoming a rule — or a guard. Only you can approve or reject; in Claude Code the
`/gw-approve` and `/gw-reject` skills are blocked from being invoked by the model at all.

## What happens after approval

1. The card is marked `done` with a History line.
2. `HANDOFF.md` is updated with where things stand and the next step.
3. The card's changes are committed as `[<card-id>] <card title>` (or your project's
   `commitFormat`), staging only that card's files.
4. When a phase closes, a short recap is appended to `.groundwork/JOURNAL.md`: what shipped, how
   to try it, decisions, calls, lessons.

Pushing is never automatic — the agent pushes only when you ask.

## Next

[Evidence and approval →](/concepts/evidence-and-approval)

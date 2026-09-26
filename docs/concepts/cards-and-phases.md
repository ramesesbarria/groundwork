# Cards and phases

**A card is one small piece of work with a checklist for "done". A phase is a group of cards that
together leave something working.**

The spec describes what you're building. The plan turns it into phases and cards. The build loop
takes one card at a time.

## What a card looks like

A card is a markdown file in `.groundwork/cards/`:

```md
---
id: 1.2
title: Voting
phase: 1
status: awaiting-approval
depends_on: [1.1]
---
## Goal
A visitor can vote once for next month's book.

## Acceptance criteria
- [ ] A visitor with the link can cast one vote
- [ ] A second vote isn't possible
- [ ] Results stay hidden until the vote is closed

## How to check
- Run `npm run dev` and open http://localhost:3000/vote

## Evidence
- Tests: `npm test voting` → 12 passed ([output](../evidence/1.2/test-output.txt))
- Reviewer: all criteria met; checked against L-003, L-006

## History
- 2026-09-24 rejected: "results leak before the vote closes" → back to implementer
```

| Section | Filled by | Purpose |
|---|---|---|
| Goal | planner | What's true when the card is done, in a sentence or two |
| Acceptance criteria | planner (plus `gw-ui-spec` for UI) | Checkable statements; the tester turns each into a test |
| How to check | reviewer | Plain steps for **you** to see it working, without reading a diff |
| Evidence | tester, implementer, reviewer | Links to proof in `.groundwork/evidence/<card-id>/` |
| History | everyone | One line per event, including rejections and judgment calls |

## Statuses

The card's status says exactly where it is. Internally the workflow uses one set of names; you
always see the plain labels.

| Status | You see | Meaning |
|---|---|---|
| `todo` | to do | Not started |
| `testing` | being tested | The tester is writing failing tests |
| `implementing` | being built | The implementer is making them pass |
| `review` | in review | The reviewer is checking the evidence |
| `awaiting-approval` | waiting for you | Your turn |
| `done` | done | Approved and committed |
| `rejected` | sent back | You sent it back; it re-enters the loop |

Only the transitions in the [workflow](/concepts/the-build-loop#statuses) are allowed, and each one
leaves a History line.

## Dependencies and picking order

Cards list what they need first:

```yaml
depends_on: [1.1]
```

The runner always picks the **lowest-numbered card** whose status is `todo` or `rejected` and whose
dependencies are all `done`. `1.2` comes before `1.10`. A card whose dependencies aren't ready is
blocked, and `/gw` will say by what — it never starts work on top of unfinished work.

## How the planner shapes a plan

- **Smallest useful version first.** Anything else is a later phase, one line each.
- **Each phase leaves something working**, or unlocks the next phase.
- **Each card fits one session** through tester → implementer → reviewer.
- **Every criterion is checkable**, by a test where possible. "Works well" isn't a criterion.
  Logic that can run without the UI is planned into its own files so it gets real tests.
- **Decisions come first.** A stack choice gets a decision record and your answer before cards
  depend on it.

On an existing project, the planner works one **change** at a time: only the open change in the
spec, never the whole app. [Existing projects →](/guides/existing-projects)

## Commits point back to cards

Each approved card is committed as `[1.2] Voting` — or whatever `commitFormat` you set. So
`git log` is the project's progress trail, and `groundwork retro` can find work that was fixed
soon after it shipped.

## Next

[The build loop →](/concepts/the-build-loop)

# Card statuses

Read this before you change a card's status. `groundwork check` and the commit gate refuse a change that isn't in this table.

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

No other changes are allowed. Every change gets one line under the card's History: `YYYY-MM-DD <from> → <to>: <why>`, as in `.groundwork/templates/card.md`.

## Plain labels

When you tell the human about a card, use plain labels, not these status names: `todo` → to do, `testing` → being tested, `implementing` → being built, `review` → in review, `awaiting-approval` → waiting for you, `done` → done, `rejected` → sent back.

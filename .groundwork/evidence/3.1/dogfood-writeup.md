# Dogfood run: "DogFood" (2026-09-24)

Groundwork v0.1 was installed from the packed npm package into an empty folder, and the human drove it in a real Claude Code session. The app was "DogFood", a reminder app for households that share feeding their dogs.

## What happened

| Step | Result |
|---|---|
| `groundwork init --adapter claude-code` | 37 files created. Git warned about line endings on every one (Windows, no `.gitattributes`). |
| `/gw-setup` | Three questions. Filled all placeholders, **didn't pick a stack**, set `per-phase`. Spotted that AGENTS.md rule 5 reads wrong in `per-phase` mode, and said so instead of editing the template. |
| `/gw-spec` | Two batches of 5 specific questions, each with a suggested answer. The human answered "your call" to both. The model used its suggestions, marked every one *(default)*, and listed the extra choices it made. **The spec grew into a multi-user phone app with push notifications.** |
| `/gw-plan` | Three stack decision records with options, trade-offs and switching costs. **Refused "your call" for stack choices.** After the human chose (and asked to keep phase 1 local and small), it wrote a fourth decision and 8 cards with sound dependencies. |
| `/gw-next` on card 1.1 | The tester wrote two tests, confirmed they failed for the right reason, saved the output, and left a precise "contract for implementer" in HANDOFF. |

The skills appeared in Claude Code's `/gw` autocomplete. The run stopped during card 1.1's implementation, when the human decided to finish Groundwork first and test it next on a real app.

## What worked
- Stack neutrality held under pressure: "your call" was accepted for product details and refused for stack choices.
- Defaults were visible, never presented as the human's decisions.
- HANDOFF, when written, was precise enough to hand to another model.

## What didn't (fixed in card 3.2)
1. **No scope check** (the big one). "Tiny sample app" became a multi-week build. Promoted L-003 from note to rule.
2. HANDOFF went stale when `gw-plan` stopped to wait for the human.
3. `gw-plan` didn't notice the spec was never confirmed.
4. The tester duplicated every criterion as a manual check.
5. The AGENTS.md template read wrong in `per-phase` mode.
6. No `.gitattributes` from `init`, and no prompt to commit after setup.

## What the human said
> "isn't this so much work for a simple dev kit"

Fair. The full loop costs the same for a typo as for a feature. That led to `gw-quick`, a light path for small changes (card 4.1).

## Not tested yet
- A card approved end to end in a real session.
- Resume in a fresh session, in a different tool.
- Whether Claude Code actually runs the role subagents.

These move to the human's real app (card 6.1).

---
name: gw-decide
description: Lay out 2–4 options for a decision (stack, library, service), wait for the human's choice, and record it.
---
# gw-decide

## Purpose
Record a decision the human makes, with the options they chose from. Groundwork never makes these choices itself. You act as the planner (`.groundwork/roles/planner.md`).

## Steps
1. Read `.groundwork/decisions/` (titles first) and the spec sections the decision affects. If an `accepted` record already covers this topic, say so and ask whether to revisit it.
2. Write `.groundwork/decisions/NNNN-<topic>.md` from `.groundwork/templates/decision.md`, with status `proposed`:
   - **Context:** what needs deciding, why now, and the constraints that matter.
   - **Options:** 2–4 options. For each: what it is, pros, cons, and what switching away later would cost.
3. Summarise the options in a few lines. If one clearly fits a stated constraint, you can say "if X matters most, B fits" but not "choose B".
4. Update HANDOFF, then **wait** for the human's choice. "Your call" isn't enough for a decision: ask them to pick.
5. Record the choice in their words under Decision, set status `accepted`, and fill in Consequences.
6. If this replaces an earlier decision, set that one's status to `superseded` and link to the new one.
7. If the stack changed, update the commands in `.groundwork/config.json` and `AGENTS.md`.

## Writes
- `.groundwork/decisions/NNNN-<topic>.md` (and the superseded one, if any)
- `.groundwork/config.json` and `AGENTS.md`, if commands change
- `.groundwork/HANDOFF.md`

## Must not
- Choose for the human, or record a default as their decision.
- Leave out an option because you don't like it, if it fits the constraints.

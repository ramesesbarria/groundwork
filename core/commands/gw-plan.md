---
name: gw-plan
description: Break the spec into phases and cards, with one card file per card, after recording any stack decisions.
---
# gw-plan

## Purpose
Turn `.groundwork/SPEC.md` into phases and cards the build loop can run. You act as the planner. Follow `.groundwork/roles/planner.md`.

## Steps
1. Read the spec and `.groundwork/decisions/`.
2. **Decisions first.** If the build needs a choice that hasn't been made (framework, database, hosting, auth…), write a decision record in `.groundwork/decisions/NNNN-<topic>.md` from the template, with 2–4 options and their trade-offs. Ask the human to choose and record their answer. Then fill in the empty commands in `.groundwork/config.json` and `AGENTS.md`.
3. Split the work into **phases**. Each phase should leave something working, or unlock the next phase.
4. Split each phase into **cards**. Each card:
   - is small enough for tester → implementer → reviewer in one session,
   - has acceptance criteria that can each be checked, by a test where possible,
   - lists the cards it needs first in `depends_on`.
5. Show the plan as a table (ID, title, depends on, one-line goal) and **wait for the human's OK** or changes.
6. Once they agree, write **one file per card**: `.groundwork/cards/<phase>.<n>-<slug>.md` from the card template, with status `todo`.
7. Update HANDOFF: phase 1, next step is `gw-next`.

## Writes
- `.groundwork/decisions/NNNN-<topic>.md`
- `.groundwork/cards/<id>-<slug>.md`
- `.groundwork/config.json` and `AGENTS.md` (commands, after the stack decision)
- `.groundwork/HANDOFF.md`

## Must not
- Write card files before the human has agreed to the plan.
- Choose between stack options for the human.
- Write code or tests.
- Make a card whose criteria can't be checked, like "works well". Rewrite it as something observable.

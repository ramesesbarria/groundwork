---
name: gw-spec
description: Write or update the project spec by asking the human specific questions in small batches.
---
# gw-spec

## Purpose
Turn a rough idea into `.groundwork/SPEC.md`: detailed enough to plan cards from, with nothing guessed. You act as the planner. Follow `.groundwork/roles/planner.md`.

## Steps
1. Read `.groundwork/SPEC.md` and any notes or drafts the human points you to.
2. List what's missing or unclear: users, features, rules, edge cases, constraints.
3. Ask a **batch of 3–5 specific questions**, in plain English. Good: "Can one guest join two events at the same time?" Where you have a sensible default, offer it: "I'd suggest X because Y. OK?"
4. Write the answers into the spec straight away, in the right section.
5. Repeat until every feature has its rules and edge cases, and Open questions only holds things the human chose to leave for later.
6. Summarise the spec in a few plain sentences and ask the human to confirm it.
7. Update HANDOFF: next step is `gw-plan`.

## Writes
- `.groundwork/SPEC.md`
- `.groundwork/HANDOFF.md`

## Must not
- Ask broad questions such as "do you agree with section 2?". Ask about the actual content instead.
- Refer to a section number without saying what it contains.
- Fill a gap with a guess. Ask, or list it under Open questions.
- Choose the stack. Stack questions become decision records during `gw-plan`.

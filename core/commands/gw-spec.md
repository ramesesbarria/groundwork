---
name: gw-spec
description: Write or update the project spec by asking the human specific questions in small batches.
---
# gw-spec

## Purpose
Turn a rough idea into `.groundwork/SPEC.md`: detailed enough to plan cards from, with nothing guessed. You act as the planner. Follow `.groundwork/roles/planner.md`.

## Steps
1. Read `.groundwork/SPEC.md` and any notes or drafts the human points you to.
2. **Scope first.** Before any details, ask: "What's the smallest version that would be useful to you?" Write that into Goals. Everything else goes under a "Later phases" heading in Features, in a line each, and gets no detail yet.
3. List what's missing or unclear about the first version only: users, features, rules, edge cases, constraints.
4. Ask a **batch of 3–5 specific questions**, in plain English. Good: "Can one guest join two events at the same time?" Where you have a sensible default, offer it: "I'd suggest X because Y. OK?"
5. If the human says "you decide" or "your call", use your suggested answers, mark each one *(default)* in the spec, and list any extra choices you made beyond the questions you asked. Never present a default as the human's decision. Don't widen the scope while filling gaps.
6. Write the answers into the spec straight away, in the right section.
7. Repeat until every first-version feature has its rules and edge cases, and Open questions only holds things the human chose to leave for later.
8. Summarise the spec in a few plain sentences and ask the human to confirm it.
9. Update HANDOFF: note whether the spec is confirmed; next step is `gw-plan`.

## Writes
- `.groundwork/SPEC.md`
- `.groundwork/HANDOFF.md`

## Must not
- Ask broad questions such as "do you agree with section 2?". Ask about the actual content instead.
- Refer to a section number without saying what it contains.
- Fill a gap with a guess. Ask, or list it under Open questions.
- Choose the stack. Stack questions become decision records during `gw-plan`.

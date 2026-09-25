---
name: gw-spec
description: Use when the human describes a new app or feature idea and there's no confirmed spec for it yet. Writes or updates the spec by asking specific questions in small batches.
---
# gw-spec

## Purpose
Turn a rough idea into `.groundwork/SPEC.md`: detailed enough to plan cards from, with nothing guessed. You act as the planner. Follow `.groundwork/roles/planner.md`.

## Steps
1. Read `.groundwork/SPEC.md` and any notes or drafts the human points you to.
2. **Scope first.** Before any details, ask: "What's the smallest version that would be useful to you?" Write that into Goals. Everything else goes under a "Later phases" heading in Features, in a line each, and gets no detail yet.
3. List what's missing or unclear about the first version only: users, features, rules, edge cases, constraints.
4. Ask a **batch of 3–5 specific questions**, in plain English. Good: "Can one guest join two events at the same time?" Where you have a sensible default, offer it: "I'd suggest X because Y. OK?" If the app copies a product people know, suggest how that product behaves, even where a thinner option exists. If your tool can ask questions with clickable choices, use it.
5. If the human says "you decide" or "your call", use your suggested answers, mark each one *(default)* in the spec, and list any extra choices you made beyond the questions you asked. Never present a default as the human's decision. Don't widen the scope while filling gaps.
6. Write the answers into the spec straight away, in the right section.
7. Repeat until every first-version feature has its rules and edge cases, and Open questions only holds things the human chose to leave for later.
8. Summarise the spec in a few plain sentences and ask the human to confirm it.
9. Update HANDOFF: note whether the spec is confirmed; next step is `gw-plan`.

## Existing project
When SPEC.md already describes what the app does today, spec the change, not the whole app:
1. Ask: "What do you want to change or add first?"
2. Apply the smallest-useful-version rule to that change, then ask batches of questions as in steps 3–7.
3. Write it as one sub-section under Changes (goal, rules, edge cases, and what must not break), marked `open`.
4. Confirm it as in step 8. Next step: `gw-plan` for this change.

## Writes
- `.groundwork/SPEC.md`
- `.groundwork/HANDOFF.md`

## Must not
- Ask broad questions such as "do you agree with section 2?". Ask about the actual content instead.
- Refer to a section number without saying what it contains.
- Fill a gap with a guess. Ask, or list it under Open questions.
- Choose the stack. Stack questions become decision records during `gw-plan`.

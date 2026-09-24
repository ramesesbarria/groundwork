# {{project_name}}

This project uses [Groundwork](https://github.com/ramesesbarria/groundwork). The plan, cards and lessons live in `.groundwork/`. This file stays short on purpose, so load the other files only when a step needs them.

## Project
{{project_summary}}

## Commands
- Install: `{{install_command}}`
- Test: `{{test_command}}`
- Lint: `{{lint_command}}`
- Build: `{{build_command}}`

## How we work
1. **Start by reading `.groundwork/HANDOFF.md`.** It says where things stand and what's next.
2. **Work one card at a time** from `.groundwork/cards/`. Load only the current card.
3. **Follow `.groundwork/workflow.md`** and the file for your role in `.groundwork/roles/` (planner, tester, implementer, reviewer).
4. **No evidence, no done.** Proof goes in `.groundwork/evidence/<card-id>/` and is linked from the card.
5. **Commit only when the workflow allows.** In `per-card` mode, after the human approves the card; in `per-phase` mode, after review passes (see `approvalMode` in `.groundwork/config.json`). Commit format: `[<card-id>] <card title>`.
6. **Update `.groundwork/HANDOFF.md`** at every role change and before you stop.
7. **Don't change the stack silently.** Stack choices are recorded in `.groundwork/decisions/`; propose a new decision instead.
8. **Ask specific questions in plain English** when you need input.
9. **Request without a command? Say the path in one line first:** small and low-risk, or a bug, goes through `.groundwork/commands/gw-quick.md`; anything bigger gets a card. The human can override either way.

## Rules
<!-- Promoted from .groundwork/LESSONS.md. Each rule keeps its lesson ID so its origin can be traced.
     Keep this list short: `groundwork doctor` measures this file against the token budget. -->

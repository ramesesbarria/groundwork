# {{project_name}}

This project uses [Groundwork](https://github.com/ramesesbarria/groundwork). The plan, cards and lessons live in `.groundwork/`. Load them only when a step needs them.

## Project
{{project_summary}}

## Commands
- Install: `{{install_command}}`
- Test: `{{test_command}}`
- Lint: `{{lint_command}}`
- Build: `{{build_command}}`
- Run: `{{run_command}}`

## How we work
1. **Start by reading `.groundwork/HANDOFF.md`**, then follow `.groundwork/commands/gw.md`. Every command is a file in `.groundwork/commands/`.
2. **Work one card at a time** from `.groundwork/cards/`. Load only the current card.
3. **Follow `.groundwork/workflow.md`** and the file for your role in `.groundwork/roles/`.
4. **No evidence, no done.** Proof goes in `.groundwork/evidence/<card-id>/`, linked from the card.
5. **Commit only when the workflow allows.** In `per-card` mode, after the human approves; in `per-phase` mode, after review passes. Format: `commitFormat` in the config.
6. **Update `.groundwork/HANDOFF.md`** at every role change and before you stop; end each stop with the next step.
7. **Don't change the stack silently.** Propose a new decision in `.groundwork/decisions/`.
8. **Ask specific questions in plain English** when you need input. Explain as much as `experience` in the config says.
9. **Request without a command? Say the path in one line first:** a "can X do Y?" question is a try; small, low-risk or a bug is quick (both in `.groundwork/commands/gw-quick.md`); anything bigger gets a card. The human can override.

## Rules
<!-- Promoted from .groundwork/LESSONS.md. Each rule keeps its lesson ID so its origin can be traced.
     Keep this list short: `groundwork doctor` measures this file against the token budget. -->

---
name: gw-setup
description: Use when Groundwork was just installed and AGENTS.md or .groundwork/config.json isn't filled in yet. Sets up a new or existing project with a short interview.
---
# gw-setup

## Purpose
Turn the installed templates into this project's own AGENTS.md and config, without choosing anything for the human. If the folder already has application code, follow `.groundwork/guides/existing-project.md` instead of steps 2–3.

## Steps
1. Check that `.groundwork/` exists. If it doesn't, tell the human to run `npx groundwork-ai init` and stop.
2. Ask these questions together, in plain English:
   - What's the project called, and what does it do, in one sentence?
   - Have you already chosen a stack (language, framework, database)? If yes, which?
   - Do you want to check every piece of work before it's saved, or each milestone?

   Save the answer as `approvalMode`: every piece of work → `per-card` (the default, if unsure); each milestone → `per-phase`.
3. If a stack is chosen, ask for the install, test, lint and build commands, suggesting the usual ones. Otherwise leave them empty until planning.
4. Fill in the `{{...}}` placeholders in `AGENTS.md` and `.groundwork/SPEC.md`, and write `.groundwork/config.json`.
5. Show the human the finished AGENTS.md and ask if anything is wrong.
6. Update HANDOFF: next step is `gw-spec` (new project). For an existing project, ask "What do you want to change or add first?", then `gw-spec` for that change, or `gw-quick` if it's small.
7. Suggest committing the setup now (e.g. `Set up Groundwork`), so the first card's commit only holds that card's work.

## Writes
- `AGENTS.md`
- `.groundwork/config.json`
- `.groundwork/SPEC.md`
- `.groundwork/decisions/` and `.groundwork/LESSONS.md` (existing projects)
- `.groundwork/HANDOFF.md`

## Must not
- Pick or recommend a stack unasked. For an existing project, record the stack as it is and don't propose changes to it.
- Ask more than the questions above. Everything else belongs in `gw-spec`.
- Overwrite a file that has already been filled in without asking.
- Drop an imported rule, or demote it to a NOTE, without showing the human first.

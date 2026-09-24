---
name: gw-setup
description: Use when Groundwork was just installed and AGENTS.md or .groundwork/config.json isn't filled in yet. Sets up a new or existing project with a short interview.
---
# gw-setup

## Purpose
Turn the installed templates into this project's own AGENTS.md and config, without choosing anything for the human. If the folder already has application code, follow "Existing project" instead of steps 2–3.

## Steps
1. Check that `.groundwork/` exists. If it doesn't, tell the human to run `npx groundwork-ai init` and stop.
2. Ask these questions together, in plain English:
   - What's the project called, and what does it do, in one sentence?
   - Have you already chosen a stack (language, framework, database)? If yes, which?
   - Approve every card yourself (`per-card`, recommended), or once per phase (`per-phase`)?
3. If a stack is chosen, ask for the install, test, lint and build commands, suggesting the usual ones. If not, leave them empty; they're filled in after the stack decision during planning.
4. Fill in the `{{...}}` placeholders in `AGENTS.md` and `.groundwork/SPEC.md`, and write `.groundwork/config.json`.
5. Show the human the finished AGENTS.md and ask if anything is wrong.
6. Update HANDOFF: next step is `gw-spec` (new project) or `gw-plan` (existing project).
7. Suggest committing the setup now (e.g. `Set up Groundwork`), so the first card's commit only holds that card's work.

## Existing project
1. Read the manifest (e.g. `package.json`), the folder layout, the tests, the CI config and `git log -n 30`. Don't read every source file.
2. Draft the AGENTS.md commands and conventions, marking each one *found* (seen in a file) or *guessed*.
3. Draft a "current state" `.groundwork/SPEC.md`: what the app does today, from the code, with gaps under Open questions.
4. For each stack choice already made (language, framework, database, hosting), write an `accepted` record in `.groundwork/decisions/`, with the reason "already in use".
5. If a CLAUDE.md or an older AGENTS.md exists, offer to import its rules into `.groundwork/LESSONS.md` as NOTEs with origin "imported". If AGENTS.md isn't Groundwork's (no "How we work" section), rebuild it from `.groundwork/templates/AGENTS.md` after the import, with the human's OK.
6. Ask the approval-mode question, then show everything marked *guessed* and ask the human to confirm or correct it.
7. Continue from step 4 above.

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

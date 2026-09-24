---
name: gw-setup
description: Set up Groundwork for a new project. A short interview fills in AGENTS.md and .groundwork/config.json.
---
# gw-setup

## Purpose
Turn the installed templates into this project's own AGENTS.md and config, in a few minutes, without choosing anything for the human.

v0.1 supports **new projects only**. If the folder already has application code, stop and say: "Setup for an existing project arrives in Groundwork v0.2. For now I can set things up as if it were new, but I won't read your existing code." Continue only if the human agrees.

## Steps
1. Check that `.groundwork/` exists. If it doesn't, tell the human to run `npx groundwork-ai init` and stop.
2. Ask these questions together, in plain English:
   - What's the project called, and what does it do, in one sentence?
   - Have you already chosen a stack (language, framework, database)? If yes, which?
   - Approve every card yourself (`per-card`, recommended), or once per phase (`per-phase`)?
3. If a stack is chosen, ask for the install, test, lint and build commands, and suggest the usual ones for that stack. If no stack is chosen yet, leave the commands empty; they get filled in after the stack decision during planning.
4. Fill in the `{{...}}` placeholders in `AGENTS.md` and `.groundwork/SPEC.md` (name, summary, date, commands), and write `.groundwork/config.json`.
5. Show the human the finished AGENTS.md and ask if anything is wrong.
6. Update HANDOFF: next step is `gw-spec`.
7. Suggest committing the setup now (e.g. `Set up Groundwork`), so the first card's commit only holds that card's work.

## Writes
- `AGENTS.md`
- `.groundwork/config.json`
- `.groundwork/SPEC.md` (title and date only)
- `.groundwork/HANDOFF.md`

## Must not
- Pick or recommend a stack unasked. If the human asks for advice, lay out options and trade-offs; the choice and its decision record come during planning.
- Ask more than the questions above. Everything else belongs in `gw-spec`.
- Overwrite a file that has already been filled in without asking.

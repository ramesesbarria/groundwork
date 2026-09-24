# Setting up an existing project

Part of `gw-setup`, for a folder that already has application code. It replaces steps 2–3 of `.groundwork/commands/gw-setup.md`.

## Existing project
1. Read the manifest (e.g. `package.json`), the folder layout, the tests, the CI config and `git log -n 30`. Don't read every source file.
2. Draft the AGENTS.md commands and conventions, marking each one *found* (seen in a file) or *guessed*.
3. Draft a "current state" `.groundwork/SPEC.md`: what the app does today, from the code, with gaps under Open questions.
   Add a **Codebase map** section to `.groundwork/SPEC.md`: the main folders, entry points, where tests live, and anything unusual. Mark each item *found* or *guessed*, and keep it under about 20 lines. The roles read it before any source file.
4. **Baseline.** Run the project's test, lint and build once and save the results in `.groundwork/evidence/baseline/` (command, summary line, failures). If anything fails, set HANDOFF's Failing checks to "Known failing: <summary>, see .groundwork/evidence/baseline/". From then on, cards are judged by "no new failures" (see Checks in `.groundwork/workflow.md`). If there are no tests at all, follow `gw-decide` with two options: add a test setup as the first card, or rely on manual checks until then.
5. For each stack choice already made (language, framework, database, hosting), write an `accepted` record in `.groundwork/decisions/`, with the reason "already in use".
6. Rules in an existing CLAUDE.md or AGENTS.md (`init` kept both) keep their strength:
   1. Import each rule into `.groundwork/LESSONS.md` with origin "imported".
   2. Ask which ones must stay always-on.
   3. Those become RULEs in AGENTS.md's Rules section, with their lesson ID; the rest stay NOTEs.
   4. Show what goes where before writing anything.

   An AGENTS.md without "How we work" is rebuilt from `.groundwork/templates/AGENTS.md`, keeping those RULEs. CLAUDE.md stays as it is unless the human asks.
7. Ask the approval question from `gw-setup` step 2, then show everything marked *guessed* and ask the human to confirm or correct it.
8. Continue from `gw-setup` step 4.

## Must not
- Propose changes to the stack. Record it as it is.
- Drop an imported rule, or demote it to a NOTE, without showing the human first.

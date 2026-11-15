# {{project_name}}

This project keeps its memory in `.groundwork/` with [Groundwork](https://github.com/ramesesbarria/groundwork): where things stand, where things are, what was decided, and what was learned. Any session, tool or model resumes from it.

## Project
{{project_summary}}

## Commands
- Install: `{{install_command}}`
- Test: `{{test_command}}`
- Lint: `{{lint_command}}`
- Build: `{{build_command}}`
- Run: `{{run_command}}`

## Project memory
1. **Start every session with `npx groundwork-ai brief`**, unless your tool already showed it. It prints the handoff (`.groundwork/HANDOFF.md`), how far it can be trusted, the decisions in force, the rules and the map.
2. **Where the handoff and the code disagree, the code is right.** The brief lists what changed since the handoff was written.
3. **Save when a step finishes and before you stop:** `npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"`. It records the commit, branch and time; you write only what git can't know.
4. **Record decisions:** `npx groundwork-ai decide "<title>"`. Don't reopen one in force without the human.
5. **Record a lesson** when a mistake could repeat: `npx groundwork-ai lesson "<name>" --origin "<what went wrong>"`.
6. **Keep `.groundwork/MAP.md` true** when you move or add things.
7. **One writer per handoff.** Parallel workers each get their own: see `.groundwork/memory.md`, which explains all of this.
8. **Secrets** (passwords, keys, private details) go only in `.groundwork/private/`, which git ignores.

## Rules
<!-- Promoted from .groundwork/LESSONS.md. Each rule keeps its lesson ID so its origin can be traced.
     Keep this list short: `groundwork doctor` measures this file against the token budget. -->

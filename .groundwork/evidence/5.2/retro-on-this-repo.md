# Retro signals

## Fixes soon after a card (1)
- e5e5f25 "[3.2] Dogfood fixes" after card 2.2, touching cli/src/init.ts, core/commands/gw-plan.md

## Sent back by review (5)
- card 1.2: `roles/reviewer.md` says a pass always goes to `awaiting-approval`, which contradicts `per-phase` mode (pass → `done`)
- card 1.3: gw-plan writes commands to config.json and AGENTS.md, and gw-spec reads notes the human points to, but roles/planner.md allows neither
- card 1.4: per-phase mode has no way to approve a phase; gw-approve only handles single cards
- card 2.1: descriptions go into YAML frontmatter unquoted; one containing ": " would break the file
- card 2.2: a second run with nothing to change still says "Groundwork installed"; it should say it's already up to date

Next: run /gw-retro to turn repeated signals into lessons, rules or guards.

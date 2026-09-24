---
id: 0004
title: The one entry command is /gw
status: accepted
date: 2026-09-24
---
## Context
Card 8.1 adds one command a newcomer has to remember, which works out where the project is and what to do next. It needs a name.

## Options
- **(a) `/gw`.** Pros: shortest, easiest to remember, reads as "Groundwork". Cons: says nothing about what it does.
- **(b) `/gw-go`.** Pros: reads as an action. Cons: longer, and "go" suggests it always starts work.
- **(c) `/gw-status`.** Pros: matches `groundwork status` in the CLI. Cons: suggests it only reports and never acts.

Switching later costs a rename across commands, adapters, tests and snapshots (see L-017).

## Decision
(a) `/gw`. The human chose the recommended option in the v0.3 → v0.5 plan.

## Consequences
- Card 8.1 creates `core/commands/gw.md`, and the command lists in the tests grow by one.
- README and setup text point newcomers to `/gw` first.

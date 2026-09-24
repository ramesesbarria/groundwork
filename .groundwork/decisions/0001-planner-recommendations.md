---
id: 0001
title: Planner may give a labeled recommendation for stack choices
status: accepted
date: 2026-09-24
---
## Context
`gw-decide` only lays out options and refuses "your call". That keeps every choice with the human, but newcomers get stuck on choices they can't judge yet (Postgres or SQLite?). Card 9.2 needs this settled.

## Options
- **(a) Keep strict.** Options only, and "your call" is refused. Pros: no chance of the agent's taste leaking in. Cons: blocks people who don't know enough to choose. Switching later: easy, since it's only command text.
- **(b) Labeled recommendation.** The planner may say which option it recommends, clearly labeled as its recommendation and why. "Go with your recommendation" counts as an explicit choice and is recorded as such. Pros: unblocks newcomers, and still nothing is picked silently. Cons: the human may accept without thinking. Switching later: easy.

## Decision
(b) Labeled recommendation. The human chose the recommended option in the v0.3 → v0.5 plan.

## Consequences
- Card 9.2 can go ahead: `gw-decide` and the planner role change to allow a labeled recommendation.
- The record must say when the human took the recommendation rather than choosing an option themselves.
- Still never choose without the human's explicit answer.

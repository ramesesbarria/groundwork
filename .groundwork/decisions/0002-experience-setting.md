---
id: 0002
title: Add an experience setting, after Phases 7–9
status: accepted
date: 2026-09-24
---
## Context
Groundwork serves both experienced developers and vibecoders. One voice for everyone either over-explains to one group or under-explains to the other. Card 10.1 needs this settled.

## Options
- **(a) No setting.** One voice for everyone. Pros: simpler, one set of text to maintain. Cons: the tone fits neither audience well. Switching later: easy.
- **(b) An experience setting (`new` / `experienced`).** One setup question that changes tone, how much gets explained, and the default approval mode. Pros: each audience gets the right level. Cons: more to test, and a risk of two diverging products. Switching later: moderate, since config and commands would depend on it.

## Decision
(b) Yes, but only after Phases 7–9 exist, so it's a switch over features that already work. The human chose the recommended option in the v0.3 → v0.5 plan.

## Consequences
- Card 10.1 stays in Phase 10 and depends on 7.3 and 9.2.
- Phases 7–9 should write plain text that works for newcomers by default, so the setting only has to trim, not rewrite.

---
name: gw-decide
description: Use when the work needs a choice the human hasn't made yet, such as a framework, database, library or service. Lays out 2–4 options, waits for the human's choice, and records it.
---
# gw-decide

## Purpose
Record a decision the human makes, with the options they chose from. Groundwork never makes these choices itself. You act as the planner (`.groundwork/roles/planner.md`).

## Steps
1. Read `.groundwork/decisions/` (titles first) and the spec sections the decision affects. If an `accepted` record already covers this topic, say so and ask whether to revisit it.
2. Write `.groundwork/decisions/NNNN-<topic>.md` from `.groundwork/templates/decision.md`, with status `proposed`:
   - **Context:** what needs deciding, why now, and the constraints that matter.
   - **Options:** 2–4 options. For each: what it is, pros, cons, and what switching away later would cost.
3. Summarise the options in a few lines. You may add one line starting **Recommendation:** naming the option you'd pick and why (e.g. "**Recommendation:** B, because one small app doesn't need a database server"). It's always labeled, never mixed into the options. With `experience: new` in the config, include it; with `experienced`, leave it out unless the human asks for one. One exception, at any experience: if an option switches off part of the workflow (no automated tests for the tester to write, no way to run the app), say what it switches off in that option's cons, and include the Recommendation.
4. Update HANDOFF, then **wait** for the human's choice. If they say "your call" or "you decide", ask once: "Shall I go with my recommendation, B?" Only a clear yes counts.
5. Record the choice in their words under Decision. If they took the recommendation, write "accepted the recommendation" and quote their reply. Set status `accepted`, and fill in Consequences.
6. If this replaces an earlier decision, set that one's status to `superseded` and link to the new one.
7. If the stack changed, update the commands in `.groundwork/config.json` and `AGENTS.md`.

## Writes
- `.groundwork/decisions/NNNN-<topic>.md` (and the superseded one, if any)
- `.groundwork/config.json` and `AGENTS.md`, if commands change
- `.groundwork/HANDOFF.md`

## Must not
- Choose for the human, or record a default or your recommendation as their decision without their answer. Nothing is picked silently.
- Leave out an option because you don't like it, if it fits the constraints.

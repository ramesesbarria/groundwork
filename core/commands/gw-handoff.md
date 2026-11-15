---
name: gw-handoff
description: Use when stopping for any reason, such as the session ending or context running low. Saves the state to HANDOFF.md.
---
# gw-handoff

## Purpose
Save where things stand, so work survives a closed session, a usage limit, or a switch to another tool or model. Run it before you stop for any reason. The runner and every role also do this on their own at each role change.

## Steps
1. Read the current card's status and History, and run the project's test command if a card is in progress.
2. Save with `npx groundwork-ai checkpoint --now "…" --next "…" --failing "…" --notes "…"`. It picks the file (`.groundwork/work/<id>/HANDOFF.md` on branch `gw/<id>`, otherwise `.groundwork/HANDOFF.md`), stamps the commit, branch and time, and **overwrites** each section you pass (it's the current state, not a log):
   - **Now** (`--now`): the last thing that was *finished*, specifically: "tests for criteria 1–3 written and failing", not "worked on tests"
   - **Next** (`--next`): the very next action, specific enough to start without reading anything else
   - **Blockers** (`--blockers`): what is waiting on the human or on something outside this session, or "none"
   - **Failing checks** (`--failing`): each failing test, lint or build command, or "none"
   - **Notes** (`--notes`): anything the next session would otherwise have to rediscover, like a decision in progress or a trap to avoid

   Then edit the bullets under `## Flow` in that file:
   - **Phase:** the phase number and name, and the approval mode if it isn't the default
   - **Current card:** ID and title, or "none"
   - **Status:** the card's status, which also says which role is working on it

   **Workers in flight** is kept by `npx groundwork-ai worker` (`.groundwork/memory.md`).
3. Keep it short, under 300 words. Link to files instead of copying them.

## Writes
- `.groundwork/work/<id>/HANDOFF.md` on branch `gw/<id>`, otherwise `.groundwork/HANDOFF.md`

## Must not
- Claim a step is finished if it wasn't. Say "partly done" and what's left.
- Put a history of the whole project in it. History belongs on cards and in git.

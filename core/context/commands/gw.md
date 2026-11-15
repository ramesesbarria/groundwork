---
name: gw
description: Use when a session starts, or the human asks where things stand, to carry on, or to save. Resumes from project memory.
---
# gw

## Purpose
The one command to remember. Say where the project stands from its memory, then carry on from the next step, and save before stopping.

## Steps
1. Run `npx groundwork-ai brief`, unless this session already shows it. Don't scan the repo yet.
2. Say where things stand in one or two plain sentences: what is in progress, and the next step. If the brief's verdict isn't **fresh**, say so and what changed since.
3. Take the **first** row that matches:

| State | Action |
|---|---|
| `.groundwork/` is missing | Tell the human to run `npx groundwork-ai init`, and stop |
| `AGENTS.md` still has `{{...}}` placeholders | Ask what the project is called and does, find its commands in the repo, fill them in, and show the result |
| The map isn't filled in | Read the manifest, the folder layout and the tests (not every source file) and fill in `.groundwork/MAP.md`: under about 40 lines, each item marked *found* or *guessed* |
| The handoff is empty | Ask what the human wants to work on, then start |
| The handoff is behind, diverged, stale or unstamped | Check its Next step against the code and the listed commits; correct it; save |
| The human asked to save or to stop | Save (step 4) and stop |
| Otherwise | Do the handoff's Next step |

4. Save when a step finishes and before you stop: `npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"`, with `--blockers` and `--failing` when there are any. End by telling the human the next step.

How memory works, including decisions, lessons and parallel workers: `.groundwork/memory.md`.

## Writes
- `.groundwork/HANDOFF.md` (through `checkpoint`), or `.groundwork/work/<id>/HANDOFF.md` for a worker
- `.groundwork/MAP.md` and `AGENTS.md`, the first time

## Must not
- Type the handoff's stamp (time, commit, branch) yourself: `checkpoint` writes it.
- Act on a handoff that isn't fresh without checking it against the code.
- Load the whole codebase before a step needs it.

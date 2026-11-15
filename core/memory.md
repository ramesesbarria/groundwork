# Project memory

How this project remembers where it is, so any session, tool or model resumes where the last one stopped. It works in any AI tool; adapters only automate it.

## The files

| File | What it holds | Who writes it |
|---|---|---|
| `.groundwork/HANDOFF.md` | The current state: what is in progress, the next step, blockers, failing checks, workers in flight | You write the text; `checkpoint` stamps the facts |
| `.groundwork/MAP.md` | Where things are: folders, entry points, tests, traps | You, when things move |
| `.groundwork/decisions/` | One record per decision, with the options and the reason | `decide` creates the record; you fill it in |
| `.groundwork/DECISIONS.md` | The index of those records | Generated (`index`); never edit it |
| `.groundwork/LESSONS.md` | What went wrong once and must not happen again | `lesson` adds the entry; you fill it in |
| `.groundwork/JOURNAL.md` | One entry per checkpoint: the commits and files since the last one | `checkpoint`, from git |
| `.groundwork/work/` | One handoff per parallel worker, and the ledger of them | Each worker its own; `worker` the ledger |
| `.groundwork/archive/` | What `compact` moved out of the loaded set | `compact` |

Commands are run as `npx groundwork-ai <command>`.

## Resume

Run `brief` before anything else (an adapter's session-start hook has usually printed it already). It gives the handoff, the decisions in force, the rules and the map inside a token budget, and one verdict on the handoff:

- **fresh**: written at the current commit. Continue from its Next.
- **behind**: commits landed after it was written. They are listed with the files they changed. Where the handoff and the code disagree, the code is right.
- **diverged**: its commit isn't in this branch's history (a rebase, a reset, another branch). Check its Next against `git log` before acting on it.
- **stale**: older than `staleAfterDays` in `.groundwork/config.json`. Confirm it is still the plan.
- **unstamped**: never checkpointed. Treat it as unverified.

Read other files only when the step needs them: a decision record before touching what it decided, `LESSONS.md` before reviewing or repeating a kind of work.

## Save

Save when a step finishes, before you stop for any reason, and when context or usage is running low:

```
npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"
```

Add `--blockers`, `--failing`, `--notes` when there is something to say; a section you leave out keeps its text. You can also edit `.groundwork/HANDOFF.md` and run `checkpoint` with no arguments. The command writes the facts (time, commit, branch, uncommitted files, tool, model, session) and appends the journal entry; never type those yourself.

Write the handoff as the current state, not a log: overwrite, don't append. **Next** must be specific enough to start without reading anything else. Don't claim a step is finished if it isn't: say what is left. Link to files instead of copying them.

## Decisions and lessons

- A choice the human made, or that later work depends on: `npx groundwork-ai decide "<title>"`, then fill in the record. Never record your own preference as the human's decision. To replace a decision, write a new record and set the old one's status to `superseded`.
- A mistake that could happen again: `npx groundwork-ai lesson "<short name>" --origin "<what went wrong, where>"`. A lesson starts as a NOTE. When the same mistake happens again, promote it to a RULE: copy it under Rules in `AGENTS.md` with its ID, so it is always in context.

## Parallel workers

One writer per handoff.

- The root handoff belongs to the session in the main checkout. Nothing else writes it.
- Every other worker (a linked git worktree, a task branch, a named subagent) has `.groundwork/work/<id>/HANDOFF.md`. In a linked worktree `checkpoint` and `brief` use it automatically; elsewhere pass `--worker <id>`.
- The main session records each worker it starts: `npx groundwork-ai worker start <id> --goal "<goal>"`. That adds it to **Workers in flight** in the root handoff and to `.groundwork/work/LEDGER.md`. When the work is verified and merged: `npx groundwork-ai worker done <id> --outcome "<what happened>"`.
- Before merging a worker's branch, read its handoff and rerun its checks yourself.
- If `checkpoint` warns that another session stamped the same handoff minutes ago, two sessions are sharing one: give one of them a worker id.

## Keeping it small

Each memory file has a token budget in `.groundwork/config.json` (`budgets`), checked by `npx groundwork-ai doctor`. When one is over, run `npx groundwork-ai compact`: old journal entries, superseded decisions and sections that grew inside the handoff move to `.groundwork/archive/`. Nothing is deleted. Private details (passwords, keys) go only in `.groundwork/private/`, which git ignores.

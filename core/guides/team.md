# Team prototype: shared context across branches

Use this only when the task has `.groundwork/work/<id>/context.json`. Solo projects without it keep the normal workflow.

## When starting or resuming a task

1. Run `npx groundwork-ai check --base origin/main`.
2. Read the output in two parts:
   - `freshness`: the branch is behind the target. Integrate it under the repository's normal policy before review.
   - `context <ref>`: a declared dependency changed. Read the changed file, reconcile the code and card, and rerun the relevant tests.
3. Do not run `reassess` just to clear the warning. It records snapshots after inspection; it does not prove understanding.
4. After inspecting and resolving the change, run `npx groundwork-ai reassess <id> --target origin/main`. This records the local content and the upstream version you acknowledged.
5. Rerun the tests and `check`. A later upstream change requires reassessment again.

## Recording dependencies

At planning time, record what the card relies on:

```bash
npx groundwork-ai reassess <id> --target origin/main --dep decision:0001
npx groundwork-ai reassess <id> --target origin/main --dep spec:SPEC.md
```

Never calculate hashes by hand. `reassess` stores them in `.groundwork/work/<id>/context.json`.

If a dependency is intentionally deleted, record it with `--drop <ref>`. Without that, `reassess` refuses when the file is missing locally; missing state is not silently recorded as success.

Renames are not followed automatically. The stored path is the identity. A plain `reassess` reports the old path as missing; `reassess <id> --target <ref> --dep <ref>` re-resolves the reference to its current path. Use `--drop` as well if the old record should not be carried forward.

## Handoff

On branch `gw/<id>`, `gw-handoff` writes `.groundwork/work/<id>/HANDOFF.md`. The root `HANDOFF.md` remains the solo path. Session start and `groundwork status` read the per-task file when it exists.

## Boundaries

- `check` is read-only.
- The reviewed PR merge is integration evidence; there is no `accept` command.
- Decisions keep their `proposed` / `accepted` / `superseded` status. A merged proposal can remain proposed.
- Context checks detect declared dependency changes. They do not judge whether the change matters, whether the code is correct, or whether the tests are sufficient.
- Evidence checks cover missing files, empty files, and declared context mismatches. They do not prove that evidence is authentic; test execution is a separate step.

## Approval in a team project

The human sets `integration` to `pr` in `.groundwork/config.json`, during setup or in their own editor afterwards; once setup is done the guard refuses that switch from the agent. Local task-branch commits are checkpoints; the local commit gate does not require a human approval line.

Finish a task by pushing its branch (`git push -u origin gw/<id>`) and opening a pull request, then stop. Never merge into `main` or push `main` yourself, and don't start another task's card: review and merge happen in the pull request. The guard refuses a push that updates `main`.

The repository enforces integration:

- Require a pull request before merging.
- Require at least one approving review.
- Require the `groundwork-head` and `groundwork-merge` checks.
- Require the branch to be up to date.
- Dismiss stale approvals when new commits are pushed.

Groundwork checks the task record, context freshness, evidence presence and card rules on the PR head. It does not verify that a human clicked Approve; the repository's review rules do. An agent-written `approved by human` line is not PR approval. A rejected review blocks the merge until the author updates the PR and a reviewer approves again; a new commit reruns the head checks and, under the rule above, dismisses the old approval.

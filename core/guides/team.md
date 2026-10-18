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

## Handoff

On branch `gw/<id>`, `gw-handoff` writes `.groundwork/work/<id>/HANDOFF.md`. The root `HANDOFF.md` remains the solo path. Session start and `groundwork status` read the per-task file when it exists.

## Boundaries

- `check` is read-only.
- The reviewed PR merge is integration evidence; there is no `accept` command.
- Decisions keep their `proposed` / `accepted` / `superseded` status. A merged proposal can remain proposed.
- Context checks detect declared dependency changes. They do not judge whether the change matters, whether the code is correct, or whether the tests are sufficient.
- Evidence checks cover missing files, empty files, and declared context mismatches. They do not prove that evidence is authentic; test execution is a separate step.

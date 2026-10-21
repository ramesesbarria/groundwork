# Evaluations

Paired comparisons of the same coding agent with and without Groundwork. The design, fairness rules
and scoring are in [PLAN.md](PLAN.md); the results are in [RESULTS.md](RESULTS.md).

| Path | What it is |
|---|---|
| `fixture/` | The starting project: a small Node.js ledger library and CLI, with docs and decisions |
| `tasks/S01…S10` | Solo scenarios: `task.json` (sessions, prompts, scripted replies), `setup/` (starting-state overlay), `hidden/` (scoring tests the agent never sees), `reference/` (a solution that passes them) |
| `tasks/T01…T03` | Team scenarios, run with a bare `origin` and one clone per developer |
| `tasks/_common/` | The regression suite and the CLI helper used by the hidden tests |
| `tasks/_team/` | The team plan, decision D5 and the teammate's upstream changes |
| `harness/` | `validate`, `dry-run`, `probe-isolation`, `run`, `score` and `report` run and score the evaluation. `affected` finds runs the scripted human handled wrongly. `export-runs` writes `runs.csv` from the raw records, and `aggregate` recomputes the reported numbers from it. |
| `runs.csv` | One row per run in the published results: batch, package, scores, interventions, tokens, cost and time |

## Reproduce

You need Node.js 22+, Git, and OpenCode 2.0.32 with a DeepSeek API key (the runs use
`deepseek/deepseek-flash`). Runs make real model calls; the v1 batch cost about the amount in
RESULTS.md.

```bash
git checkout <the revision under evaluation>
npm ci && npm run build
mkdir -p .groundwork/evidence/evals/package
(cd cli && npm pack --pack-destination ../.groundwork/evidence/evals/package)

node evals/harness/validate.mjs               # each task has work to do; each reference passes
node evals/harness/dry-run.mjs --tgz <tgz>    # both arms' starting workspaces are sound
node evals/harness/probe-isolation.mjs        # one model call: the agent stays in its workspace
node evals/harness/run.mjs --tgz <tgz> --tag <name> --tasks S01,...,T03 --runs 3 --parallel 4
node evals/harness/report.mjs <name>
```

`evals/` must be committed before a run. A run stops if anything under `evals/` changes, because
that would mean an agent escaped its workspace. Workspaces live in your temp folder. Raw records
(session exports, turn logs, scores) go to `.groundwork/evidence/evals/<name>/`, which this
repository keeps out of Git.

## Check the published numbers

```bash
node evals/harness/aggregate.mjs
```

This recomputes the success counts, medians and totals in RESULTS.md from `runs.csv`, with no
model calls. It checks the reported arithmetic and which runs were counted. It doesn't reproduce
the experiments; that needs the steps above.

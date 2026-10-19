# v1 comparative evaluation: results

- **Dates:** 2026-10-19 to 2026-10-20.
- **Agent:** OpenCode 2.0.32 with `deepseek/deepseek-flash`, default settings. Windows 11, Node 24.19.0,
  Git 2.55.
- **Product under test:** the packed build of `e5c994c` (sha256 `e680a35c…`). The team suite was also
  rerun on `a6a0f2e`, which fixes a defect this evaluation found.
- **Design:** [PLAN.md](PLAN.md), including every change made after scoring started.
- **Raw records:** `.groundwork/evidence/evals/` (local, not in Git).
- **API spend for all runs, pilots included:** $10.14.

The "human" in every run is scripted. It answers questions and sends `/gw-approve` by a fixed,
symmetric policy. None of this counts as the human-driven approval checks in V1.md.

## Headline

| | Baseline | Groundwork |
|---|---|---|
| **Multi-session continuity** (S01 S02 S05 S07 S10) | 7/15 | **13/15** |
| **Single-session work** (S03 S04 S06 S09) | 12/12 | 12/12 |
| **Rejected approach** (S08) | 3/3 | 3/3 |
| **All solo tasks** | 22/30 | **28/30** |
| **Team scenarios** (T01–T03), `e5c994c` | 9/9 | 8/9 |
| **Team scenarios** on the fixed build `a6a0f2e` | (unchanged: 9/9) | 9/9 |
| Median API cost per solo run | $0.021 | $0.091 (≈4×) |
| Median time per solo run | 138 s | 389 s (≈3×) |
| Median API cost per team run | $0.029 | $0.092 (≈3×) |
| Scripted human replies, all 30 solo runs | 3 | 60 (36 approvals, 24 answers) |

Success means every hidden acceptance, context and regression test passes; for team scenarios, the
branch must also be pushed and up to date with `main`. Fisher's exact test: continuity 13/15 vs 7/15,
p = 0.05; all solo 28/30 vs 22/30, p = 0.08. With three runs per task, single tasks aren't
significant on their own (S10 3/3 vs 0/3: p = 0.10).

## What Groundwork changed

**Where it helped: work that spans sessions.**

| Task | Baseline | Groundwork | What happened |
|---|---|---|---|
| S01 resume an unfinished feature | 1/3 | 3/3 | Two baseline runs forgot the CLI `export` command, which was given only in session 1. One had even listed it as "not done yet" at the end of that session. |
| S02 decision made in conversation | 0/3 | 2/3 | No baseline run applied the leftover-cents rule in the later session. One Groundwork run also missed it. |
| S10 "what's next?" | 0/3 | 3/3 | The baseline never found the planned second half, or got its format wrong. Groundwork's spec and handoff carried it. |
| S05 decision changes mid-stream | 3/3 | 2/3 | A loss: see the approval friction below. |
| S07 resume after an unrelated task | 3/3 | 3/3 | A tie. One baseline run looped through ≈2,500 tool calls ($2.43) and still finished. |

**Where it added overhead without helping: self-contained work.** On S03 (verify a claimed
feature), S04 (small change), S06 (bug fix) and S09 (fully specified feature), both arms went 12/12.
Groundwork used 11 scripted replies there (the baseline used none) and usually cost more: S09
$0.075 vs $0.009. S03 and S04 were the exceptions, slightly cheaper with Groundwork. S08 tied at
3/3, and Groundwork cost about 11× as much.

**Team scenarios.** Both arms noticed the upstream decision change (T01), kept the unrelated
change (T02) and integrated a concurrent branch (T03). The baseline did this with plain Git and
reading the docs, so the tasks didn't separate the arms. Groundwork cost about 3× as much.

## Defects and friction found

1. **Fixed, release-relevant: in PR integration, an agent pushed `main` itself** (T01 Groundwork
   run 2 on `e5c994c`). It merged the task branch into `main`, pushed 8 commits, and went on to the
   next task's card, skipping pull-request review. Fixed in `a6a0f2e`: a guard refuses pushes that
   update `main` when `integration` is `pr`, and the team guide tells the agent to push its branch
   and stop. On the fixed build the team suite went 9/9. The guard fired in 2 of 9 runs, so agents
   still try this and the guard is what stops them.
2. **Open, needs a decision: approval binding causes re-approval loops.** Solo approval is bound
   to `SPEC.md` and every decision. Agents update the spec while finishing a card, which makes their
   own approval stale. In S05 run 2 this cost the task: every later session stopped to ask for
   `/gw-approve` again. Other runs worked around it by committing first. This is the "solo knowledge
   binding" question from the audit; it now has a measured cost.
3. **Open, usability: confirmation stops on precise requests.** For changes Groundwork treats as
   spec changes ("from now on amounts get thousands separators"), the agent writes the spec and asks
   the human to confirm defaults before planning, even when the request is complete. That is most of
   the 24 question replies. It cost a human turn every time and caused 6 runs to stall under the
   first harness.
4. **Minor:** an agent wrote a card's id quoted (`id: "1.1"`). `/gw-approve "1.1"` is then ignored by
   the hook, while `/gw-approve 1.1` works. Accepting quoted ids would be a small hardening.

## How the numbers were corrected (kept separate)

The scored batch (`v1-full`, 78 runs) found three problems in the evaluation harness, not the
product. All runs are kept, and the affected ones were rerun on the same frozen build:

- the scripted human missed imperative requests ("Confirm those…", "Please confirm…");
- it sent `/gw-approve "1.1"` with quotes when a card's id was quoted.

A rescan of every run under the final rules (`harness/affected.mjs`) found 10 affected Groundwork
runs and no baseline runs; all 10 were rerun (`v1-rerun2`, `v1-rerun3`).

| | Baseline | Groundwork as first scored | Groundwork corrected |
|---|---|---|---|
| Solo successes | 22/30 | 24/30 | 28/30 |

The uncorrected number is the one to quote if you distrust the corrections: Groundwork 24/30 vs
22/30 overall, with the continuity advantage already visible (S01 3/3 vs 1/3, S02 2/3 vs 0/3).

## Tokens and cost, separately

| Suite, arm | Runs | Input | Output | Reasoning | Cache read | Cache write | API cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| Solo, baseline | 30 | 8.1M | 0.84M | 1.59M | 165.5M | 0 | $3.19 |
| Solo, Groundwork | 30 | 12.0M | 1.09M | 1.20M | 114.8M | 0 | $3.52 |
| Team, baseline | 9 | 0.50M | 0.11M | 0.20M | 8.8M | 0 | $0.29 |
| Team, Groundwork (`e5c994c`) | 9 | 3.88M | 0.25M | 0.21M | 29.4M | 0 | $0.94 |

The baseline's solo total includes one runaway S07 run ($2.43). Without it the baseline cost $0.76
for 29 runs, so compare medians, not totals. Costs are API dollars as OpenCode records them for
DeepSeek; nothing here used a subscription. Observed usage includes OpenCode's own prompt and all
subagent sessions.

## What this supports

- **Supported:** with this agent and model, Groundwork made multi-session work markedly more
  reliable. Requirements and decisions given in one session reached later ones (13/15 vs 7/15 on
  continuity tasks).
- **Supported:** on self-contained single-session tasks it doesn't improve results. It costs a few
  times more per task and asks the human more often.
- **Not separated:** the team scenarios. A careful plain workflow also handled them, so these tasks
  don't show a team benefit, only Groundwork's cost and the PR-mode defect.
- **Not shown:** that Groundwork saves cost over a long project. Every task here is 1–3 sessions on a
  small codebase. A long-horizon evaluation (one project over many sessions, with decisions
  accumulating and different people picking it up) is the test for that.

## Limitations

- **One agent and model** (OpenCode, DeepSeek Flash). A stronger model, or Claude Code, may differ.
- **Three runs per task,** a small fixture project and short scenarios.
- **Scripted humans:** they approve and answer by rule and never push back. Real users would also
  bear Groundwork's extra interruptions.
- **No progress-notes convention in the baseline;** a baseline with one might close part of the
  continuity gap.
- **Tuned harness:** the scripted-human rules were corrected three times during the work, always in
  both arms and always recorded (PLAN.md). Uncorrected numbers are reported above.
- **Historical experiments:** the calculator and todo-app experiments are earlier versions and aren't
  part of these results.

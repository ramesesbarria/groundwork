# Comparative evaluation plan (v1)

**Question:** does Groundwork improve ongoing work for solo developers and teams, and what does that
cost in tokens, time and user effort?

This plan is fixed before any scored run. Changes after scoring starts are listed at the bottom,
with the reason and which results they affect.

## Arms

| | Baseline | Groundwork |
|---|---|---|
| Agent | OpenCode 2.0.32, `opencode run --standalone --auto` | same |
| Model | `deepseek/deepseek-flash`, default settings | same |
| Starting code | `evals/fixture` + the task's setup overlay, same commits | same |
| Project knowledge | `docs/requirements.md`, `docs/decisions.md` (D1–D4) | same files, plus the same content as SPEC.md and decision records 0001–0004 |
| Agent instructions | A competent ordinary `AGENTS.md`: commands, where requirements and decisions live, "record new decisions in docs/decisions.md", add tests, run them, commit finished work | Groundwork from the packed build under test, set up as `gw-setup` leaves it (per-card approval, `experience: experienced`), committed as setup |
| Requests | The task's text | `/gw ` + the same text |

The baseline deliberately has no progress or handoff-notes convention, because that is what
Groundwork adds. A baseline that keeps hand-written progress notes is a reasonable later comparison
(see Limitations).

**Product revision:** the packed build of `e5c994c`
(`groundwork-ai-0.9.0.tgz`, sha256 `e680a35c8de9714bb9277968b44b23ad31aa7b4661e9c53c42636921a68be69d`).
Scored runs use only this build. If a run exposes a defect that needs a fix, its results are kept,
and the affected comparisons are rerun on the fixed revision and reported separately.

## Sessions and the scripted human

Each scenario step is a **fresh session**: a new day, or a different person. Inside a step, the
scripted human follows one policy in both arms. Every reply is counted as an intervention.

- **Groundwork arm:** when a card is `awaiting-approval`, the reply is `/gw-approve <id>`. These are
  scripted approvals; they don't satisfy the human-driven approval checks in V1.md.
- **Both arms:** when the agent's last paragraph asks the human something (a question, or "should
  I / shall I / would you like me to / OK to proceed"), the reply is the step's scripted line.
  It is "Yes, go ahead with what you recommend.", or for a partial day, "…but only today's part".
- At most 4 follow-ups per step. Turns time out after 30 minutes.

## Solo suite: 10 tasks × 2 arms × 3 runs

| Task | What it tests | Sessions |
|---|---|---|
| S01 | Resume an unfinished feature whose requirements were given only in session 1 | 2 |
| S02 | A decision stated in conversation (leftover cents) applies in a later session | 2 |
| S03 | Verify a feature claimed done against the requirements (planted defects) | 1 |
| S04 | A small change: correctness and overhead | 1 |
| S05 | A decision changes in session 2; the session-3 feature must follow it | 3 |
| S06 | Bug fix with a cause (float parsing loses a cent) | 1 |
| S07 | Resume a feature after an unrelated task in between | 3 |
| S08 | Don't reintroduce a rejected approach (module-level state) | 2 |
| S09 | A fully specified feature: no questions needed | 1 |
| S10 | "What's next?" finds the planned second half | 2 |

## Team suite: 3 scenarios × 2 arms × 3 runs

Both arms share the same Git setup: a bare `origin`, one clone per developer, task branches, and
push. In both arms the check for a branch is `node --test`, plus being up to date with `main`. The
Groundwork arm also runs `groundwork-ai check --base origin/main`, which is part of the product.
Tasks are planned on `main`: as a card with its declared dependency recorded (Groundwork, with
`integration: "pr"`), or as `docs/tasks/<id>.md` naming the decision it relies on (baseline).

| Scenario | Flow |
|---|---|
| T01 | Dev A starts 1.1 → the teammate changes decision D5 (which 1.1 relies on), implements it, and makes an unrelated change → Dev C continues 1.1 from a fresh clone |
| T02 | Same, but only the unrelated change lands |
| T03 | Dev A (1.1) and Dev B (1.2) work concurrently → 1.2 is merged → Dev A brings 1.1 up to date and finishes it |

No human PR review is simulated. The scorer stands in for the reviewer, using the hidden tests.

## Scoring

**Task success** requires all of the following. Passing Groundwork's own checks is never enough.

- every hidden acceptance test passes (`tasks/<id>/hidden/accept.test.mjs`);
- every hidden context test passes (`context.test.mjs`): decisions and requirements from earlier
  sessions or upstream were used;
- the shared regression suite passes (`tasks/_common/regression.test.mjs`);
- for team scenarios, also: the branch was pushed and is up to date with `main`.

Solo runs are scored on the working tree (primary) and on the committed HEAD (secondary).
`node evals/harness/validate.mjs` checks before any run that each task starts with work to do and
that its reference solution passes every hidden test.

**Recorded per run:**
- **Quality:** hidden results per group, the project's own tests, commits, uncommitted files.
- **Effort:** steps, turns, scripted approvals and question replies (interventions), elapsed time
  per turn and in total.
- **Usage**, from OpenCode's session records including subagent sessions: input, output, reasoning,
  cache read and cache write tokens, all separately; the API cost OpenCode reports in USD (DeepSeek
  pricing); assistant messages; tool calls, split into investigation (read/glob/grep/list), shell
  and edits.
- **Overhead:**
  - setup, measured separately (one live `/gw` setup, in the pilot);
  - Groundwork context (doctor's estimate plus observed prompt size);
  - verification and recovery turns.

Costs are API dollars as recorded by OpenCode for DeepSeek. No subscription usage is involved;
anything not recorded is reported as not recorded, not as zero.

## Run order

1. **Pilot:** S01, S04 and T01 × 2 arms × 1 run. It checks scoring, session resets and usage
   capture, and estimates time and cost.
2. **Full:** the solo suite (60 runs), then the team suite (18 runs), within the existing DeepSeek API
   access. If limits stop the batch, report what completed and exactly what remains.

## Limitations, stated in advance

- One model and one tool (OpenCode with DeepSeek Flash). Claude Code is not evaluated here.
- Scripted humans, three runs per cell: enough to see large or consistent differences, not small ones.
- A small fixture project. Effects that only show in large or long-lived codebases aren't measured.
- The baseline has no hand-written progress-notes convention.
- Earlier calculator and todo-app experiments are historical input only, on earlier versions.

## Changes after scoring started

- **2026-10-19, first pilot discarded.** OpenCode takes its project folder from the `PWD`
  environment variable, which the harness didn't set, so the pilot agents worked in this repository.
  They read the hidden tests and reference solutions, and edited `evals/fixture`. No results from that
  pilot are used; its records are kept in `.groundwork/evidence/evals/pilot-invalid-pwd/`.
  - **Fix:** every OpenCode process gets `PWD=<workspace>`. Runs refuse to start unless `evals/` is
    committed, and abort if anything under `evals/` changes during a run.
  - **Check:** `probe-isolation.mjs` (one model call) confirmed the agent sees only its workspace.
- **2026-10-19, second pilot (`pilot2`), before any scored run:**
  - The scripted human now also answers a go-ahead request without a question mark ("Say OK and
    I'll commit", "let me know if…"), in both arms. The Groundwork quick path had ended with "Say OK
    and I'll commit" and was left uncommitted, where a real user would have said OK.
  - Team clones now use `core.autocrlf=false` from the start: Windows' global setting broke the first
    branch checkout before any agent ran.
  - `pilot2`'s solo results stand as pilot data. S04 and T01 are rerun as `pilot3`.
- **2026-10-19, after the scored batch (`v1-full`, 78 runs):**
  - The scripted human missed imperative requests ("Confirm those … and I'll plan one card", "Next
    step is yours: confirm …", "need a yes/no"), so three Groundwork runs ended waiting for an answer
    that never came: S05 runs 1 and 2, S08 run 1. No baseline run was affected.
  - The detector now also reads these (over the last two paragraphs), in both arms. A rescan of every
    run with the new rule flags only those three.
  - They are rerun on the same frozen build. RESULTS.md reports both the original and the corrected
    results. The stop for confirmation itself counts as an interruption in both versions.
  - The first rerun (`v1-rerun`) was aborted by the leak guard when I added a file under `evals/`
    mid-run. The guard worked; no result from that rerun is used.
  - **A second harness defect found in the same review:** when a card wrote its id quoted
    (`id: "1.1"`), the scripted approval was sent as `/gw-approve "1.1"`, which the hook ignores. A
    person types `/gw-approve 1.1`. Quotes are now stripped.
  - `"Please confirm …"` wordings are also read as requests.
  - `harness/affected.mjs` rescans every run with the final rules: 9 Groundwork runs are affected
    (3 of which had succeeded anyway), and no baseline run. All 9 are rerun as `v1-rerun2`.
- **2026-10-20, one rerun replaced again.** The rerun of S10 run 3 in `v1-rerun2` ended on a
  sentence starting "Confirm …", which the rules still missed. The detector now reads a sentence
  that starts with "Confirm" (`1bd3061`), in both arms. A rescan of `v1-rerun2` flags only that run,
  and it was rerun as `v1-rerun3`. `evals/runs.csv` marks which run counts for each slot.

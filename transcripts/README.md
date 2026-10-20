# Transcripts: a pre-1.0 calculator build

These are the raw sessions behind the [calculator walkthrough](https://ramesesbarria.github.io/groundwork/docs/guides/walkthrough).
A small calculator app was built with a pre-1.0 Groundwork in OpenCode 2.0.18 with DeepSeek Flash
in September 2026, across two main chats and 18 role sessions. The sessions are as they ran; only
the export format was applied.

Groundwork has changed since then: approval binding, the three native commands and the team path
came later. This is one build with no run without Groundwork to compare against. It shows how the
workflow ran and where the tokens went. It doesn't show that Groundwork is better or cheaper. The
v1 comparison is [evals/RESULTS.md](../evals/RESULTS.md).

## Phase 1: cards 1.1 to 1.4

| | |
|---|---|
| Main chat | [main/transcript.md](phase-1/main/transcript.md) |
| Role sessions | [tester](phase-1/subagents/1.1-tester/transcript.md), [implementer](phase-1/subagents/1.1-implementer/transcript.md), [reviewer](phase-1/subagents/1.1-reviewer/transcript.md); cards 1.2, 1.3 and 1.4 have the same three folders under `subagents/` |
| Cost and tokens | [tokenandcost.md](phase-1/tokenandcost.md) |

## Phase 2: cards 2.1 and 2.2

| | |
|---|---|
| Main chat | [main/transcript.md](phase-2/main/transcript.md) |
| Role sessions | [tester](phase-2/subagents/2.1-tester/transcript.md), [implementer](phase-2/subagents/2.1-implementer/transcript.md), [reviewer](phase-2/subagents/2.1-reviewer/transcript.md); card 2.2 has the same three folders under `subagents/` |
| Cost and tokens | [tokenandcost.md](phase-2/tokenandcost.md) |

## Measurements

[measurements.md](measurements.md) has the raw numbers: cost and tokens per session, card and role,
what a session loads before doing anything, and resuming with and without Groundwork.
[checks/session-costs.mjs](../checks/session-costs.mjs) computes them from OpenCode session exports.

## Provenance

- Exported 2026-09-26 through OpenCode's session export API. The numbers are snapshots from export
  time.
- One author email address was redacted from a `git log` excerpt in the phase 2 reviewer transcript.
- Absolute Windows paths appear as they were in the sessions.
- The card commits and evidence files in the calculator's repository match what the role sessions
  did.

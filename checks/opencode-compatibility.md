# OpenCode compatibility check

Run this when OpenCode ships a new major or minor version, or when the OpenCode adapter changes.
The adapter depends on OpenCode's tool names, argument names and plugin format, and those have
changed without notice within 2.x. A session inside OpenCode can report what it actually sees. A
model's memory of OpenCode can't be trusted.

**Last run:** OpenCode 2.0.32, 2026-10-19, Windows 11, Node.js 24.19.0. Session start was last
checked on 2.0.18 (2026-09-26).

What that run established:

- The adapter generates `Plugin.define({ id, setup })` from `@opencode/plugin`, and 2.0.32 loads it.
- Project plugins load with `opencode run --standalone` and in the interactive app. The shared
  background service that a plain `opencode run` uses did not pick up the project's plugin, so
  scripted checks need `--standalone`.

## Setup

Use a throwaway folder, so nothing real gets committed. To check an unreleased build, install its
packed tarball instead (see CONTRIBUTING.md).

```bash
mkdir gw-oc-check; cd gw-oc-check; git init
npx groundwork-ai@latest init --adapter opencode
git add -A; git commit -m "[setup] Set up Groundwork"
opencode
```

Commit the setup first. Otherwise the uncommitted `.groundwork/` files make the commit gate refuse
the `[no-card]` commits in steps 3 and 4 for a different reason.

## Prompt to paste

```text
You are testing whether Groundwork (a workflow kit installed in this folder) works with this
exact version of OpenCode. Report only what you observe in this session. Do not rely on what you
remember about OpenCode; if you can't observe something, say "not observed". Do NOT modify any
file under .opencode/ or .groundwork/guards/, and do not try to fix anything. Just test and report.

1. Tool inventory. List every tool you have, with its exact name and the exact names of its
   arguments. In particular: the tool that runs shell commands, the one that writes a file, the
   one that edits a file, and any patch or apply_patch tool. Say whether you call tools directly
   or through a wrapper tool (e.g. one named "execute").

2. Guard config. Read .groundwork/config.json and report the "guards" value. Expected:
   ["no-ai-trailers"]. If it's empty or missing, set it to that (this is the only file you may
   change) and say you did.

3. Guard blocks a bad commit. Create a file test.txt, git add it, then run exactly:
   git commit -m "[no-card] test" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
   Expected: the call is blocked before it runs. Report verbatim what you received (error text,
   whether it came back as a normal tool error you can read, or something else), and confirm with
   `git log --oneline` that no commit was made.

4. Commit gate. Run: git commit -m "test"
   Expected: refused by [commit-gate] ("This commit names no card").
   Then run: git commit -m "[no-card] compatibility check"
   Expected: it succeeds. Report both outputs.

5. Subagents. List the subagents available to you. Expected: gw-tester, gw-implementer and
   gw-reviewer; there is no gw-planner (planning runs in the main session). Then:
   a. Ask gw-reviewer to create a file review-test.txt. Expected: denied.
   b. Ask gw-tester to run `echo hi`. Expected: allowed.
   Report exactly what each subagent reported back.

6. Instructions. Did you receive AGENTS.md as instructions at the start of this session? Quote
   its first line if so.

7. Session start. Do your instructions contain lines starting with "Groundwork:" that say where
   the project stands? Quote them exactly. Expected: yes, e.g. "Groundwork: no card in progress."

8. Anything else you noticed: warnings, errors, tool names or arguments that differ from what
   Groundwork's files assume (see .groundwork/guards/run.mjs, the "opencode" section).

9. Human-approval marker. Read .groundwork/.approvals/last-human.json and report its "head" and "at"
   values, and whether .groundwork/.approvals/records-human exists. Then ask the gw-tester subagent
   to run `echo hi` once, and read last-human.json again: its "at" must be unchanged, because a
   subagent prompt must not count as the human's.

Finish with a table: Check | Expected | Observed | Pass/Fail.
```

## Human-approval marker

The commit gate's human check depends on the plugin's `prompt` session hook. Re-check it whenever
OpenCode changes its plugin API. Last checked on 2.0.32 (2026-10-19), with scripted prompts; a
human-typed approval in OpenCode has not been observed.

1. Send a plain message. `.groundwork/.approvals/last-human.json` and `records-human` should both
   appear.
2. Ask for a subagent (e.g. "use the task tool to launch gw-tester and have it run echo hi"). The
   hook also fires for the subagent's prompt, which arrives in a child session; the plugin skips any
   session with a `parentID`. Confirm `last-human.json`'s `at` did not change after the subagent
   ran. If a future version drops `parentID` or delivers subagent prompts differently, the marker
   must be reworked before it can be trusted.
3. `/gw-approve <id>` arrives as the raw command text in a top-level session, before command
   expansion. One `/gw-approve 1.1` turn should record the approval, set the card done, and commit
   it. A later human message clears the approval by design, so approval and the commit it
   authorizes belong in the same turn.
4. End to end: with a `done` card and its evidence committed, ask the agent to make two commits
   naming the card in one run. The first should pass; the second must be refused with
   `[commit-gate] No message from the human since the last commit`.
5. Stale approval: after `/gw-approve`, change `SPEC.md`, a decision, a declared context file, the
   card, or the code before committing in that same turn. The gate must refuse it.

The event shape observed on 2.0.26: `{ sessionID, messageID, prompt: { text, files, agents,
skills }, metadata, delivery }`. A temporary probe plugin that appends each event to a log is the
easiest way to watch fires.

## Check these yourself

The model can't see OpenCode's interface:

- Type `/` and confirm `/gw`, `/gw-approve` and `/gw-reject` appear, and no other `gw-*` command.
- Run `/plugins` and confirm `groundwork-guards` loaded with no failure.
- Note the version in the bottom-right corner, and update "Last run" above.

If something fails, the fix almost always belongs in `cli/src/adapters/opencode.ts` or the
`opencode` section of `core/guards/run.mjs`: the adapter translates, the core doesn't change.

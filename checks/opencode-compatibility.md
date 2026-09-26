# OpenCode compatibility check

Rerun this when OpenCode ships a new major or minor version, or when the OpenCode adapter changes.
Groundwork's adapter depends on OpenCode's tool names, argument names and plugin format, and those
changed without warning in 2.x. A session inside OpenCode can report what it actually sees; a model's
memory of OpenCode can't be trusted.

Last run: OpenCode 2.0.16 (2026-09-25). Session start checked on 2.0.18 (2026-09-26).

## Setup

Use a throwaway folder, so nothing real gets committed:

```bash
mkdir gw-oc-check; cd gw-oc-check; git init
npx groundwork-ai@latest init --adapter opencode
opencode
```

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
   git commit -m "test" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
   Expected: the call is blocked before it runs. Report verbatim what you received (error text,
   whether it came back as a normal tool error you can read, or something else), and confirm with
   `git log --oneline` that no commit was made.

4. Guard allows a good commit. Run: git commit -m "test"
   Expected: it succeeds. Report the output.

5. Subagents. List the subagents available to you and whether gw-planner, gw-tester,
   gw-implementer and gw-reviewer appear. Then:
   a. Ask gw-planner to run the shell command `echo hi`. Expected: denied.
   b. Ask gw-reviewer to create a file review-test.txt. Expected: denied.
   c. Ask gw-tester to run `echo hi`. Expected: allowed.
   Report exactly what each subagent reported back.

6. Instructions. Did you receive AGENTS.md as instructions at the start of this session? Quote
   its first line if so.

7. Session start. Do your instructions contain lines starting with "Groundwork:" that say where
   the project stands? Quote them exactly. Expected: yes, e.g. "Groundwork: no card in progress."

8. Anything else you noticed: warnings, errors, tool names or arguments that differ from what
   Groundwork's files assume (see .groundwork/guards/run.mjs, the "opencode" section).

Finish with a table: Check | Expected | Observed | Pass/Fail.
```

## Check these yourself

The model can't see OpenCode's interface:

- Type `/gw` and confirm the `gw-*` commands appear in the list.
- Run `/plugins` and confirm `groundwork-guards` loaded with no failure.
- Note the version in the bottom-right corner, and update "Last run" above.

If something fails, the fix almost always belongs in `cli/src/adapters/opencode.ts` or the
`opencode` section of `core/guards/run.mjs`: the adapter translates, the core doesn't change.

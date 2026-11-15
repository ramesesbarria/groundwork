# groundwork-ai

**Your AI forgets. Your project doesn't.**

Groundwork is project memory for coding agents. Close the chat, switch tools, change models: the
next session picks up where you stopped, and checks the notes against your repo before it trusts
them.

```bash
cd your-project
npx groundwork-ai init
```

Pick your tool (Claude Code, OpenCode, Codex, Cursor, Gemini CLI, or plain markdown for anything
that reads `AGENTS.md`), open it, and type `/gw`. From then on each session starts with a brief:
where you stopped, what is next, and what changed since the last save.

Two commands work in any tool:

```bash
npx groundwork-ai brief                               # resume
npx groundwork-ai checkpoint --now "…" --next "…"     # save
```

Want more structure? `npx groundwork-ai flow on` adds an optional guided workflow: a spec, small
tasks, and your `/gw-approve` or `/gw-reject` before each commit.

Needs Node.js 22+ and git. Run `npx groundwork-ai` for every command.

Next: [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes) ·
[docs](https://ramesesbarria.github.io/groundwork/) ·
[freshness](https://ramesesbarria.github.io/groundwork/docs/concepts/freshness)

MIT licensed.

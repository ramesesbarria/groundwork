# Claude Code

Groundwork's Claude Code adapter turns the core into native skills, subagents and hooks. Everything
it generates points back into `.groundwork/`, so the core stays the single source of truth.

## What `init` adds

| Path | What it is |
|---|---|
| `.claude/skills/gw-*/SKILL.md` | One skill per command, with a description that says *when* to use it |
| `.claude/agents/gw-*.md` | One subagent per role, with limited tools |
| `.claude/settings.json` | Two hooks: session-start orientation and the guard runner |
| `CLAUDE.md` | A short pointer whose first line loads `AGENTS.md`, then lists the commands and subagents |

## Skills that trigger themselves

Each command's description is written as a trigger — *"Use when the human describes a new app or
feature idea and there's no confirmed spec yet…"* — so Claude Code can pick the right one from a
plain request like *"I have an app idea"*. You don't have to learn command names.

`/gw-approve` and `/gw-reject` are **human-only**: they carry `disable-model-invocation`, so the
model cannot run them itself. Approving is always your act.

## Subagents with different limits

Each role becomes a subagent with only the tools it needs, so the separation of duties isn't just
words:

| Subagent | Tools | Why |
|---|---|---|
| `gw-planner` | Read, Grep, Glob, Write, Edit | Writes specs and cards; never runs commands |
| `gw-tester` | + Bash | Writes and runs failing tests |
| `gw-implementer` | + Bash | Makes them pass |
| `gw-reviewer` | Read, Grep, Glob, Bash — **no editing** | Judges and sends back; can't fix |

If you set [`models`](/reference/configuration#models-per-role) per role, they're written into each
subagent — cheap models for mechanical roles, the strongest for review.

## Hooks

`init` **merges** into an existing `.claude/settings.json` instead of overwriting it, so your own
permissions and hooks survive.

- **SessionStart** (`startup|clear|compact`) runs `.groundwork/hooks/session-start.mjs`, which
  prints a few lines from `HANDOFF.md` — where things stand and the next step. It injects project
  state, not methodology, and prints nothing if `.groundwork/` isn't there.
- **PreToolUse** (`Bash|Write|Edit|MultiEdit`) runs `.groundwork/guards/run.mjs`, which applies the
  guards listed in your config before every shell command and file write. Exit code 2 blocks the
  action and shows the reason.

New installs start with `no-ai-trailers` on. With `"guards": []`, the hook exits immediately — it's
always on, but nothing is blocked.

## Checking the wiring

```bash
npx groundwork-ai doctor
```

Flags a missing hook, a `CLAUDE.md` that doesn't load `AGENTS.md`, and generated files that have
drifted from what Groundwork would generate, with the command to fix each.

## Next

[OpenCode →](/adapters/opencode)

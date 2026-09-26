# OpenCode

Groundwork's OpenCode adapter adds commands, subagents with permissions, and a guard plugin.
**It needs OpenCode 2.x** (tested with 2.0.16 — the plugin format changed in 2.x, and 1.x-style
plugins fail to load).

## What `init` adds

| Path | What it is |
|---|---|
| `.opencode/commands/gw-*.md` | One command per command file; each reads its core file and follows it |
| `.opencode/agents/gw-*.md` | One subagent per role, with permissions |
| `.opencode/plugins/groundwork-guards.js` | Runs your guards before each tool call |

OpenCode reads `AGENTS.md` itself, so no extra rules file is generated.

## Subagents with permissions

| Subagent | Permission | Why |
|---|---|---|
| `gw-planner` | `bash: deny` | Writes specs and cards; never runs commands |
| `gw-tester` | — | Writes and runs failing tests |
| `gw-implementer` | — | Makes them pass |
| `gw-reviewer` | `edit: deny` | Judges and sends back; can't fix |

If you set [`models`](/reference/configuration#models-per-role) with an `opencode` key, the model
is written into each subagent.

## Guards

The plugin hooks `execute.before` for every tool call. When a guard listed in
`.groundwork/config.json` blocks an action, the plugin throws, and OpenCode stops the call. With no
guards configured (the default), nothing is blocked.

```json
{ "guards": ["no-ai-trailers"] }
```

Add a guard's name to the list and put its `.mjs` file in `.groundwork/guards/` — the same guard
files work in every adapter, because they're plain Node.

## Human-only commands

`/gw-approve` and `/gw-reject` are ordinary commands whose text says only the human runs them, and
the runner is instructed never to run them. Claude Code additionally enforces this at the tool
level; OpenCode has no equivalent switch yet, so the guarantee here is the written rule.

## Next

[Other tools →](/adapters/other-tools)

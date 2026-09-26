# Project files

Everything Groundwork knows lives in plain files in your repo, so you, your agent and your version
control all see the same thing.

## Layout

```text
AGENTS.md                     # what every session starts with (short, always loaded)
.groundwork/
  config.json                 # your settings: approval mode, commands, guards, models
  workflow.md                 # the loop, step by step
  commands/                   # the gw-* commands, one file each
  roles/                      # planner, tester, implementer, reviewer
  guides/                     # longer steps a command links to
  templates/                  # starting points for cards, specs, decisions…
  guards/                     # guard scripts + the runner adapters hook up
  hooks/                      # session-start orientation (Claude Code, OpenCode)
  SPEC.md                     # what you're building, in your words
  cards/                      # one file per piece of work
  decisions/                  # each stack choice, with the options you chose from
  evidence/                   # the proof: test output, screenshots, baseline
  HANDOFF.md                  # where things stand right now
  LESSONS.md                  # mistakes worth remembering, and the rules they became
  JOURNAL.md                  # a short recap of each finished phase
```

## What each file holds

| File | Holds | Written by |
|---|---|---|
| `AGENTS.md` | The short page the agent reads every session: the project, its commands, how we work, promoted rules | `gw-setup`, `gw-retro`, you |
| `SPEC.md` | Problem, users, goals, features, constraints, and (existing projects) one section per change | `gw-spec`, planner |
| `cards/` | One card per unit of work, with criteria, evidence links and History | `gw-plan`, the loop, you |
| `decisions/` | Numbered records: context, 2–4 options with trade-offs, your choice, consequences | `gw-decide`, planner |
| `evidence/` | Proof per card, plus `baseline/` on existing projects. Kept short on purpose — it's committed | tester, reviewer, setup |
| `HANDOFF.md` | The current state, overwritten each time, under ~300 words | runner and roles |
| `LESSONS.md` | Note → rule → guard, each with the mistake that created it | `gw-retro`, role files |
| `JOURNAL.md` | One recap per finished phase: what shipped, how to try it, decisions, calls, lessons | `gw-approve` |
| `config.json` | The settings described in [Configuration](/reference/configuration) | `gw-setup`, `gw-decide`, you |

There's also `retro.md` after you run `npx groundwork-ai retro` — the raw report `/gw-retro` reads.
It's regenerated each time.

## Groundwork's files vs your files

| | Files | Behavior |
|---|---|---|
| **Your state** | `SPEC.md`, `cards/`, `decisions/`, `evidence/`, `HANDOFF.md`, `LESSONS.md`, `JOURNAL.md`, config values, your `AGENTS.md` | Never touched by `upgrade`; committed with the work |
| **Groundwork's own** | `commands/`, `roles/`, `workflow.md`, `guards/`, `hooks/`, `templates/`, `guides/` | Refreshed by `groundwork upgrade`, which asks before overwriting |

Everything under `.groundwork/` is meant to be committed. That's what makes the project resumable
from a fresh clone, and it gives you the audit trail: cards link evidence, commits link cards, and
lessons link the mistakes they came from.

## Adapter files

Depending on the tool you chose, `init` also adds:

- **Claude Code**: `.claude/skills/gw-*/`, `.claude/agents/gw-*.md`, `.claude/settings.json`, and a
  one-line `CLAUDE.md` that loads `AGENTS.md` and lists the commands. See [Claude Code](/adapters/claude-code).
- **OpenCode**: `.opencode/commands/`, `.opencode/agents/`, `.opencode/plugins/`. See
  [OpenCode](/adapters/opencode).
- **Plain markdown**: nothing else — `AGENTS.md` plus the files above. See
  [Other tools](/adapters/other-tools).

Generated files point back into `.groundwork/` rather than copying it, so there's one source of
truth. `groundwork doctor` tells you when they've drifted.

::: tip Evidence images are binary
`.gitattributes` marks `*.png`, `*.jpg`, `*.webp` and `*.gif` as binary, so git never rewrites
screenshots under `.groundwork/evidence/` — on any OS. Installs from before this rule get the lines
added by `groundwork upgrade`.
:::

## Next

[Adapters: Claude Code →](/adapters/claude-code)

# CLI reference

The command-line tool does the deterministic work: copying Groundwork's files into a project,
parsing cards, counting tokens, reading git. It needs **Node.js 22 or later**. Run it with `npx`
(no install needed) or a local install.

```text
npx groundwork-ai <command>
```

| Command | What it does |
|---|---|
| [`init`](#init) | Install Groundwork into this project |
| [`upgrade`](#upgrade) | Update this project's Groundwork files |
| [`adapter add`](#adapter-add) | Add or refresh an AI tool adapter |
| [`status`](#status) | Show the phase, cards by status, what's ready and what's blocked |
| [`doctor`](#doctor) | Check harness health and the context budget |
| [`retro`](#retro) | Collect signals of repeated mistakes for `/gw-retro` |

`npx groundwork-ai --version` prints the version; `npx groundwork-ai help` prints usage.

## init

```bash
cd your-project
npx groundwork-ai init
```

Asks which AI tool to set up (Claude Code, OpenCode, or plain markdown), then copies the core into
`.groundwork/`, writes `AGENTS.md`, and generates the adapter's files. Existing `CLAUDE.md` and
`AGENTS.md` are appended to, never replaced.

| Flag | Effect |
|---|---|
| `--adapter claude-code\|opencode\|none` | Skip the question |
| `--dry-run` | Show what would change, write nothing |

`init` refuses to run inside Groundwork's own source repo, so a stray command can't mix an install
into the source tree.

## upgrade

```bash
npx groundwork-ai upgrade          # add --dry-run to preview
```

Replaces Groundwork's own files — commands, roles, workflow, guards, hooks, templates — with this
version's, asking before overwriting anything. **Your state is never touched:** spec, handoff,
lessons, cards, decisions, evidence, your `AGENTS.md` and `CLAUDE.md`, and your config values all
stay exactly as they are. If a newer version adds a config key, it's added empty.

## adapter add

```bash
npx groundwork-ai adapter add opencode
```

Adds or refreshes one tool's files (commands, subagents, hooks). Useful when you switch tools or
want two adapters in the same project. It asks before overwriting.

## status

```bash
npx groundwork-ai status
```

Reads only your files and prints where the project stands — the same story `/gw` tells, for a
terminal:

```text
Phase:         1 — Voting
Current card:  1.2 Voting
Next step:     make `npm test voting` pass

Cards:         3 to do · 1 being built · 2 done
In progress:   1.2 Voting (being built)
Next ready:    none
Blocked:
  1.3 Close the vote  ← waiting on 1.2
  1.4 Results page    ← waiting on 1.3
```

## doctor

```bash
npx groundwork-ai doctor
```

Checks the install and the context budget, and **exits 1 when it finds a problem** (so it can run
in CI). It reports:

- **Always loaded** — the real token estimate for `AGENTS.md` and `CLAUDE.md` against `tokenBudget`,
  with advice when it's over.
- **Missing wires** — a guard listed in config without a file, a hook missing from settings, an
  adapter file that drifted from what Groundwork would generate, `CLAUDE.md` that doesn't load
  `AGENTS.md`.
- **Version** — when the project's files are older than the CLI, with the upgrade command.
- **Lessons hygiene** — lessons never cited anywhere (candidates to archive) and rules in
  `AGENTS.md` with no lesson ID.
- **Typos** — a `models` entry naming a role that doesn't exist.

## retro

```bash
npx groundwork-ai retro
```

Reads git history and Groundwork's own files, and writes `.groundwork/retro.md`: reverts, fixes
committed soon after a card, rejections, reviewer send-backs, judgment calls that were later
rejected, and a count per lesson cited. It only reports — `/gw-retro` turns the signals into
proposed changes, with your approval.

## Next

[Configuration →](/reference/configuration)

# Other tools

The core is plain markdown, so any agent that can read files can follow Groundwork. Install with
the `none` adapter:

```bash
npx groundwork-ai init --adapter none
```

You get `AGENTS.md` plus the full `.groundwork/` folder — nothing tool-specific. Most modern agents
read `AGENTS.md` on their own; if yours doesn't, point it there.

## Working without native commands

Ask your agent:

> Read `.groundwork/commands/gw.md` and follow it.

Every command works the same way — for example *"read `.groundwork/commands/gw-next.md` and follow
it"* builds the next card. The commands are written to be followed by any capable model, and their
descriptions say when each one applies, so the agent can also choose the right one from a plain
request.

## What changes without an adapter

| | With an adapter | Plain markdown |
|---|---|---|
| Commands | Native `/gw-*` | Read the command file and follow it |
| Roles | Separate subagents, fresh context | One session plays each role in turn |
| Guards | Wired into tool hooks | Instructions only — nothing blocks automatically |
| Session start | Hook prints where things stand | The agent reads `HANDOFF.md` as rule 1 |

The [workflow](/concepts/the-build-loop#without-subagents) covers the single-session mode: the agent
reads each role file before playing that role, finishes it completely before switching, and as
reviewer re-reads the diff from scratch and re-runs every check itself.

Honest trade-off: without hooks, a `RULE` is still an instruction, and a `GUARD` can't block by
itself. That's the one thing an adapter adds that markdown alone can't.

## The CLI still helps

Even with no adapter, Node users can use the terminal side:

```bash
npx groundwork-ai status    # where things stand, from files
npx groundwork-ai doctor    # install health and token budget
npx groundwork-ai retro     # signals for /gw-retro
npx groundwork-ai upgrade   # refresh Groundwork's core files
```

Nothing in the workflow depends on the CLI — it's the deterministic helper, not the engine.

## Next

[FAQ →](/faq)

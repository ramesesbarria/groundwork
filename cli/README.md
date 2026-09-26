# groundwork-ai

**Spec, proof, approval — a workflow your AI agent can't skip.**

Groundwork gives your AI coding agent a real development process: a spec, small cards, separate
tester, implementer and reviewer roles, and your approval before anything is committed. Full
documentation: [ramesesbarria.github.io/groundwork](https://ramesesbarria.github.io/groundwork/).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

Then open your AI tool in the project and type `/gw`.

Your first 10 minutes: tell `/gw` your idea and answer a few questions, agree the plan, then `/gw`
again builds the first card. It stops to tell you what changed and how to check it, and nothing is
committed until you `/gw-approve`.

<!-- Demo GIF: same 25–35s recording as the README; use its absolute URL here once recorded. -->

Terminal commands: `init`, `upgrade`, `adapter add <tool>`, `status`, `doctor`, `retro`. Run
`npx groundwork-ai` for help.

MIT licensed.

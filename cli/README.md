# groundwork-ai

**Shared project context for developers and their coding agents.**

Groundwork keeps what your project knows in your repo, as plain files: the spec, decisions, a plan
of small cards, the proof each card works, and a handoff. Any session, AI tool or teammate picks up
from there. Hooks and CI check that a card isn't committed without its proof and your approval.
Full documentation: [ramesesbarria.github.io/groundwork](https://ramesesbarria.github.io/groundwork/).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

![Running npx groundwork-ai init: choosing a tool, then the files it creates and the next step.](https://ramesesbarria.github.io/groundwork/demo-install.gif)

Then open your AI tool in the project and type `/gw`. It sets the project up, then turns your idea
into a spec and small cards, and builds them one at a time. At each stop you `/gw-approve` (the card
is committed) or `/gw-reject` with a reason. Come back any time and `/gw` carries on from the
handoff. Teams can use task branches with pull-request review as the approval.

Needs Node.js 22+ and git. With Claude Code, use 2.1.295 or later (on Windows, with Git for
Windows); OpenCode 2.x and any tool that reads `AGENTS.md` work too.

Next: [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes).
What it costs and what it was tested on: [results](https://ramesesbarria.github.io/groundwork/docs/results).

Terminal commands: `init`, `upgrade`, `adapter add <tool>`, `status`, `doctor`, `check`, `reassess`,
`migrate legacy`, `mode`, `retro`, `uninstall`. Run `npx groundwork-ai` for help.

MIT licensed.

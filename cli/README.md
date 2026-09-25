# groundwork-ai

**A tool-agnostic workflow for building software with AI agents: spec → plan → test-first build loop → human-approved ship.**

Groundwork gives your AI coding agent a real development process: a spec, small cards, separate tester, implementer and reviewer roles, and your approval before anything is committed. Full documentation on [GitHub](https://github.com/ramesesbarria/groundwork).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

Then open your AI tool in the project and type `/gw`.

Your first 10 minutes: tell `/gw` your idea and answer a few questions, agree the plan, then `/gw` again builds the first card.
It stops to tell you what changed and how to check it, and nothing is committed until you `/gw-approve`.

Terminal commands: `init`, `upgrade`, `adapter add <tool>`, `status`, `doctor`, `retro`. Run `npx groundwork-ai` for help.

MIT licensed.

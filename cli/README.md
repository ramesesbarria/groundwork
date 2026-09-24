# groundwork-ai

**A tool-agnostic workflow for building software with AI agents: spec → plan → test-first build loop → human-approved ship.**

> Early preview. See the full README, the design and the public build trail on [GitHub](https://github.com/ramesesbarria/groundwork).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

Then open your AI tool in the project and run `/gw-setup`.

Your first 10 minutes: describe your idea to `/gw-spec` and answer a few questions, agree the plan from `/gw-plan`, then `/gw-next` builds the first card.
It stops to tell you what changed and how to check it, and nothing is committed until you `/gw-approve`.

Terminal commands: `init`, `adapter add <tool>`, `status`, `doctor`, `retro`. Run `npx groundwork-ai` for help.

MIT licensed.

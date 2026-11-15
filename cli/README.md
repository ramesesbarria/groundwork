# groundwork-ai

**Project memory for coding agents: any session, tool or model resumes where the last one stopped.**

Groundwork keeps what your project knows in your repo, as plain files: a handoff stamped against
git, a map of the codebase, decisions with an index, lessons, and a journal. Each session starts
with a brief that says where things stand and how far the handoff can be trusted; hooks checkpoint
it when a session stops, is compacted or ends. An optional flow adds a spec, small cards with
proof, and your approval before each commit.
Full documentation: [ramesesbarria.github.io/groundwork](https://ramesesbarria.github.io/groundwork/).

```bash
cd your-project
npx groundwork-ai init        # asks: Claude Code, OpenCode, or plain markdown
```

![Running npx groundwork-ai init: choosing a tool, then the files it creates and the next step.](https://ramesesbarria.github.io/groundwork/demo-install.gif)

Then open your AI tool in the project. It starts from the brief; `/gw` resumes and saves. Any tool
can run `npx groundwork-ai brief` to resume and `npx groundwork-ai checkpoint --now "…" --next "…"`
to save.

Want the build flow too? `npx groundwork-ai init --flow` (or `npx groundwork-ai flow on` later):
`/gw` then turns your idea into a spec and small cards and builds them one at a time, and at each
stop you `/gw-approve` (the card is committed) or `/gw-reject` with a reason. Teams can use task
branches with pull-request review as the approval.

Needs Node.js 22+ and git. With Claude Code, use 2.1.295 or later (on Windows, with Git for
Windows); OpenCode 2.x and any tool that reads `AGENTS.md` work too.

Next: [your first 10 minutes](https://ramesesbarria.github.io/groundwork/docs/getting-started/first-10-minutes).
What it costs and what it was tested on: [results](https://ramesesbarria.github.io/groundwork/docs/results).

Terminal commands: `init`, `brief`, `checkpoint`, `status`, `decide`, `lesson`, `index`, `worker`,
`compact`, `doctor`, `upgrade`, `adapter add <tool>`, `flow`, `uninstall`; with the flow on, also
`check`, `reassess`, `migrate legacy`, `mode` and `retro`. Run `npx groundwork-ai` for help.

MIT licensed.

# Contributing

Issues and pull requests are welcome. For a bug, the issue form asks for what helps most: your OS,
Node.js version, AI tool, and the output of `npx groundwork-ai doctor`.

## Setup

You need Node.js 22 or later and git.

```bash
git clone https://github.com/ramesesbarria/groundwork.git
cd groundwork
npm ci          # the CLI's dependencies
npm test        # builds the CLI, then runs the tests
```

## Try the CLI from source

`npm test` (or `npm run build`) compiles the CLI to `cli/dist/`. Run it in a throwaway folder next
to this repo; `init` refuses to run inside Groundwork's own source.

```bash
mkdir ../gw-try
cd ../gw-try
git init
node ../groundwork/cli/dist/bin.js init
```

## The docs site

The docs site has its own dependencies, separate from the root install:

```bash
npm ci --prefix docs
npm run docs:dev      # then open http://localhost:3000/groundwork
```

Pages are MDX files in `docs/content/docs/`. Some CLI tests read them to keep the docs in step with
the product, so run `npm test` after editing docs too.

## Where changes go

- `core/` is the workflow in plain markdown and must work with any AI tool. Anything specific to
  Claude Code or OpenCode belongs in `cli/src/adapters/`; a test enforces this.
- If you change the OpenCode adapter, run the check in
  [checks/opencode-compatibility.md](checks/opencode-compatibility.md).

## Before you open a pull request

- `npm test` passes. CI runs it on Windows and Linux, with Node.js 22 and 24.
- User-facing changes come with a docs update.

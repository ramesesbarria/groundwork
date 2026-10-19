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
npm run test:coverage -w groundwork-ai   # the same, with a coverage report
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

To test the package as users get it (shipped files, `npx`, CI), pack it and install the tarball in
the project instead of a published version. `npx groundwork-ai` in a project without it installed
fetches the published release, not your build.

```bash
npm pack -w groundwork-ai                       # in this repo: groundwork-ai-<version>.tgz
cd ../gw-try
npm install --save-dev ../groundwork/groundwork-ai-<version>.tgz
npx --no-install groundwork-ai doctor
```

The two-branch team flow has a scripted demo that runs against your build:

```bash
npm run build
GW_CLI="node $PWD/cli/dist/bin.js" GW_ROOT="$PWD" bash demo/team-workflow.sh
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

## Commit and release style

Commit subjects follow Conventional Commits:

- `type(scope): summary` — for example `fix(cli): never overwrite a project's instruction files`.
- Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`, `build`, `revert`.
- Scopes: `cli`, `core`, `opencode`, `claude-code`, `docs`, `ci`; omit the scope when a change spans several areas.
- Keep the subject under 72 characters, imperative, and describe what actually changed.
- Work that comes from a card ends with the card ID in parentheses: `feat(cli): add the status command (9.4)`.
  `groundwork retro` reads these IDs to link fixes back to cards.
- Bodies are optional. Use one only for a non-obvious constraint, compatibility note or measurement — never to narrate the session.
- Groundwork does not credit AI tools in commits (rule L-001): no AI-attribution trailers.

Release notes use this shape, omitting empty sections:

```markdown
# vX.Y.Z

### Added
### Changed
### Fixed
### Upgrade Notes
```

Describe what changed for the user and its practical effect. No development narrative, no internal task references, no test stories.

### Releasing

1. Bump the version in `cli/package.json` (and `package-lock.json`); `npm test` must pass.
2. Commit `chore: release X.Y.Z`.
3. Tag `vX.Y.Z` and push the branch and tag.
4. Create the GitHub release with the drafted notes (`gh release create vX.Y.Z --notes-file …`).
5. `npm publish -w groundwork-ai`.

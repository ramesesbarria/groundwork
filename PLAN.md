# Groundwork improvement plan (v0.3 → v0.5)

Written 2026-09-24, after comparing Groundwork with [superpowers](https://github.com/obra/superpowers).

**Goal for this round:** make Groundwork easy to understand, smart, and intuitive for both experienced developers and vibecoders. It isn't about proof yet: no benchmarks, metrics or evals of the framework itself.

**"Intuitive" means:**
- working within minutes
- the next step is always obvious
- plain-language docs
- sensible defaults
- power features that stay out of the way until needed

**Tool-agnostic first:** every feature has to work from the plain-markdown core in `.groundwork/`, installed with `npx groundwork-ai init`, with no adapter. Adapters (Claude Code, OpenCode) may add shortcuts such as hooks, subagents and skill settings, but the core must never depend on them. Each card that touches an adapter includes a criterion for the `none` adapter.

**Groundwork's identity (keep it):** Groundwork is the *project layer*. Superpowers answers "how should the agent work on this task?" Groundwork answers "where is my project, what's next, what did I approve, and what have we learned?" Every card below should make that answer easier to get. None of them should turn Groundwork into a smaller superpowers.

---

## Better than superpowers: what that means

"Better" doesn't mean more skills, more harnesses or more rules. Superpowers wins those, and chasing them would bury Groundwork's identity. Better means: **for someone building a real project with an AI agent, Groundwork is the easier, clearer and safer experience from the first minute to the last commit.** Close the gaps where superpowers is clearly ahead, then pull ahead on the things only a project layer can do.

### Scorecard

| Area | superpowers today | Groundwork goal | Cards |
|---|---|---|---|
| **Getting started** | One install; skills fire on their own | One npx command, then `/gw` says what to do; every session opens knowing where you are | 7.1, 7.2, 7.5, 8.1, 8.2 |
| **Knowing where you are** | Progress lives in a per-plan log that's deleted when the plan ends | Always-visible project state: status, HANDOFF, a recap per phase | 8.1, 8.2, 9.3, 9.7 |
| **Control** | Runs for hours; its judgment calls are listed at the end | You approve every card (or phase), with "how to check it"; the agent's judgment calls are logged and shown at approval | 7.3, 9.6 |
| **Right-sized process** | Spike / bounded / architectural | Try / quick / card, said out loud, and you can override it | 7.2, 9.1, 9.5 |
| **Debugging** | A dedicated root-cause skill | Bug path: failing test and a stated cause before any fix | 9.1 |
| **Learning from mistakes** | Nothing per project | Note → rule → guard, with a retro suggested at the end of every phase | 9.7 |
| **Language** | Jargon and all-caps rules | Plain English, and an experience setting | 7.4, 10.1 |
| **Existing projects** | No dedicated path | Setup never overwrites your files, keeps your rules, records a test baseline, maps the codebase, and asks what you want to change | 7.10, 7.11, 9.8–9.11, 10.5 |
| **Cost and context** | Picks a model per role; large skills | About 400 tokens always loaded, plus optional model hints per role | 10.4 |
| **Tool reach** | 16 harnesses with native plugins | Any tool that reads markdown, plus Claude Code and OpenCode adapters | 10.2 |

### Where we don't compete (on purpose)
- **Number of harnesses.** Tool-agnostic markdown covers the rest.
- **An eval lab.** Deferred.
- **Marketplace listings.** npx only (D3).
- **Hours-long runs with no human by default.** `per-phase` mode is the ceiling, and it still stops at the end of every phase.
- **Git worktree management.** The approval gate protects the main branch instead.

### Done means (the finish line)
Groundwork is "better" when each of these is true. Don't claim it in the README or in marketing before then.
- [ ] A newcomer with only the README gets to a first approved commit in one sitting, without opening other docs
- [ ] Close the laptop partway through a card; the next session says where you are before you ask
- [ ] Nothing is ever committed without your approval of the card or the phase
- [ ] Every approval tells you how to check the work yourself
- [ ] For every stack choice and every judgment call the agent made, you can see what was decided and why
- [ ] You can switch tools partway through a card and carry on
- [ ] A mistake that repeats has a visible path to being blocked
- [ ] An existing project can be brought under Groundwork without rewriting anything

---

## Start here tomorrow

1. Make the three open decisions in [Decisions first](#decisions-first) (D3 is already settled). Ten minutes. Each one has a recommendation.
2. Turn Phase 7 into card files, or run `/gw-plan` with this file as the notes. The IDs below continue from card 6.1.
3. Do **7.1 → 7.2 → 7.3** first. They're small, and together they fix the biggest gap: nothing happens until you know what to type.
4. Then Phase 8 (`/gw` and the session-start hook). After that, Groundwork is ready for the real-app run (card 6.1).
5. The finish line is the **Done means** checklist in [Better than superpowers](#better-than-superpowers-what-that-means). Each phase should tick at least one box.

---

## Decisions first

These change behavior, not just wording, so they're yours to make before the cards that depend on them. Record each one as a decision record in `.groundwork/decisions/` (`/gw-decide`).

| # | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| D1 | Can the planner give a **labeled recommendation** for stack choices? | (a) keep strict: options only, "your call" refused · (b) labeled recommendation, and "go with your recommendation" counts as an explicit choice, recorded as such | **(b)**. Nothing is ever picked silently, and vibecoders stop getting stuck on Postgres vs SQLite. | 9.2 |
| D2 | Add an **experience setting** (`new` / `experienced`)? | (a) no, one voice for everyone · (b) yes, one setup question that changes tone, how much gets explained, and default approval mode | **(b)**, but only after Phases 7–9 exist, so it's a switch over features that already work | 10.1 |
| D3 | How is Groundwork **installed**? | **Decided (2026-09-24): `npx groundwork-ai init` only.** The core is copied into each project, so any tool that reads files can follow it. No plugin distribution. | — | — |
| D4 | Name of the one entry command | `/gw` · `/gw-go` · `/gw-status` | **`/gw`**. It's the shortest and easiest to remember. | 8.1 |

---

## How to work this plan

- **Use Groundwork's own loop.** Cards, evidence, `[<id>] <title>` commits. The public trail is part of the product.
- **Lessons that apply here:**
  - **L-017:** when you change a core file, check every file that refers to it. `gw-resume` is referenced in `README.md`, `.groundwork/SPEC.md`, `core/commands/gw-next.md`, `core/commands/gw-handoff.md`, three test files and two snapshots.
  - **L-014:** edit with the edit tool, not script string literals.
  - **L-018:** chain test → commit → push with `&&`.
- **Tests that pin things you'll change.** Update them in the same card, and don't weaken them:
  - The command list is hardcoded in `cli/test/commands.test.ts`, `cli/test/claude-code.test.ts` and `cli/test/opencode.test.ts`. Snapshots are in `cli/test/__snapshots__/`.
  - `cli/test/readme.test.ts` requires the mermaid diagram and the install command **before** `## Why`, plus the sections `Why it exists`, `How it works`, `Commands`, `The lessons ledger`, `Adapters`, `Honest limitations` (at least 4 bullets).
  - `cli/test/templates.test.ts` pins the exact list of templates, the required sections, and the AGENTS.md budget (under 2,000 tokens).
- **Borrowing from superpowers.** Superpowers is MIT (© 2025 Jesse Vincent). Every item below borrows **ideas only**; write your own text. If you ever copy a real passage, add a `NOTICE` file with their copyright line.
- **Sizes:** S = under 1 hour · M = 1 session · L = several sessions.

---

## Phase 7: Quick wins

### 7.1 Commands that trigger themselves, and approval only a human can give (S)
**Goal:** in Claude Code the agent picks the right Groundwork command from a plain request ("I have an app idea", "fix the typo on the home page"), and it can never run `gw-approve` or `gw-reject` itself.
**Why:** vibecoders don't need to learn command names. Experienced devs get a hard guarantee, not just a sentence in prose.
**Changes:**
- `core/commands/*.md`: rewrite each `description:` as a trigger ("Use when the user describes a new app or feature idea and there's no confirmed spec yet…"). Keep each one to a sentence or two.
- Check the current Claude Code skill docs for the frontmatter field that stops the model from invoking a skill (e.g. `disable-model-invocation`). Emit it for `gw-approve` and `gw-reject` from `cli/src/adapters/claude-code.ts`. Check whether OpenCode has an equivalent. If it doesn't, note that under Honest limitations.
- The OpenCode command descriptions come from the same frontmatter, so they change too.

**Acceptance criteria:**
- [ ] Every command description says *when* to use it, not only what it does
- [ ] The generated `gw-approve` and `gw-reject` skills can't be invoked by the model (field verified against the docs; the link goes in Evidence)
- [ ] Snapshots updated; the tests still check that the skill description equals the command description
- [ ] Without an adapter, `gw-approve` and `gw-reject` still say in their own text that only the human runs them

**Source:** idea borrowed from superpowers' "Use when…" descriptions (`skills/writing-skills/SKILL.md`).

### 7.2 Say the path out loud (S)
**Goal:** when a request arrives without a command, the agent says in one line which path it's taking and lets the human override it. For example: "This looks small, so I'll use the quick path" or "This needs a card, so I'll plan it first."
**Changes:** one new line in `core/templates/AGENTS.md` under "How we work", merged with the existing rule 9 so the file doesn't grow.
**Acceptance criteria:**
- [ ] The rule names both paths and the override
- [ ] The AGENTS.md template is still about 400 tokens (the templates test passes, and `doctor` on a fresh install shows no budget problem)

**Source:** idea borrowed from brainstorming's "say the classification out loud".

### 7.3 A plain-language approval stop (S)
**Goal:** every stop for approval shows three things:
1. **What changed**, in plain words
2. **How to check it yourself**: a URL to open, a command to run, or a thing to click
3. **Caveats**

**Why:** vibecoders can't review a diff, but they can click through a feature. This makes the human gate real for them. It's Groundwork's clearest advantage over superpowers.
**Changes:**
- `core/commands/gw-next.md` step 7 (per-card stop and phase stop)
- `core/commands/gw-approve.md` (show the same summary before committing)
- `core/templates/card.md`: an optional `## How to check` section that the reviewer fills in
- `core/roles/reviewer.md`: the reviewer writes "How to check" for the human

**Acceptance criteria:**
- [ ] `gw-next` describes the 3-part summary for both approval modes
- [ ] The card template has "How to check". Update `cli/src/schema.ts` or the templates test only if the section is required.

**Source:** original.

### 7.4 Setup without jargon, plus a glossary (S)
**Goal:** nobody meets the words `per-card` or `per-phase` before they know what a card is.
**Changes:**
- `core/commands/gw-setup.md` step 2: ask "Do you want to check every piece of work before it's saved, or each milestone?" and map the answer to the config value.
- `README.md`: a 5-word glossary (card, phase, evidence, handoff, lesson), one line each.

**Acceptance criteria:**
- [ ] The setup question uses no config words; the config value is still written
- [ ] The glossary is in the README; the README tests pass

**Source:** original.

### 7.5 README: "Your first 10 minutes" (S)
**Goal:** a newcomer sees what using Groundwork feels like before reading about roles and ledgers.
**Changes:**
- `README.md`: a short example transcript right after Install: idea → 3 scope questions → plan table → first card → approval stop (in the 7.3 format) → commit. Keep the mermaid diagram above `## Why`, because the README test requires it there. Move the long "How it works" detail lower if it makes the page easier to read.
- `cli/README.md`: a two-line version.

**Acceptance criteria:**
- [ ] The transcript is under about 30 lines and uses only the commands a first-timer needs
- [ ] `readme.test.ts` passes without being weakened

**Source:** idea borrowed from superpowers' narrative "How it works" opening. The text is your own.

### 7.6 Cuts and cleanup (S)
**Changes:**
- Delete the empty `adapters/claude-code/.gitkeep`, `docs/.gitkeep` and `examples/.gitkeep` directories.
- Remove the unreachable `'${cmd}' is planned but not implemented yet` branch in `cli/src/index.ts`, since every listed command is implemented.
- `.groundwork/SPEC.md`:
  - update §12 (repo layout) to match reality
  - rewrite §13 and §14 so v1.0 is no longer "benchmark evals". Evals move to "later, not a current goal".
- `README.md`: reword the "No evals yet" limitation to match.

**Acceptance criteria:**
- [ ] No empty placeholder directories
- [ ] No dead code path in `index.ts`
- [ ] SPEC and README agree on the current goal

**Source:** original.

### 7.7 Smaller evidence files (S)
**Goal:** evidence stays useful without committing 300-line logs into user repos.
**Changes:** `core/roles/tester.md` and `core/roles/reviewer.md`, plus `core/workflow.md` if it describes evidence. Save the command, the summary line, and the failures (about the last 30 lines), not the full output.
**Acceptance criteria:**
- [ ] Both roles say what to save and the rough size limit
- [ ] `gw-approve`'s evidence check still works, because files still exist and are linked

**Source:** original.

### 7.8 History lines that tools can parse (S)
**Goal:** `groundwork retro` and `doctor` read card History, so agents should write it in the format they parse.
**Changes:**
- `core/templates/card.md`: the History comment shows the exact line formats `cli/src/retro.ts` and `cli/src/doctor.ts` look for:
  - `YYYY-MM-DD rejected: <reason>`
  - `YYYY-MM-DD review → implementing: <problems>`
  - `YYYY-MM-DD approved by human`
- `core/workflow.md`: point to the template.

**Acceptance criteria:**
- [ ] The template formats match the regexes in `retro.ts` and `doctor.ts`
- [ ] A test builds a card from the template examples and `retro` finds all the signals

**Source:** original.

### 7.9 A clear message on old Node (S)
**Goal:** a vibecoder on Node 18 or 20 gets "Groundwork needs Node 22 or later. You have 20.x. Install it from nodejs.org", not a stack trace.
**Changes:** `cli/src/bin.ts` checks `process.versions.node` before importing anything that needs Node 22.
**Acceptance criteria:**
- [ ] A test with a stubbed version gets the plain message and exit code 1

**Source:** original.

---

### 7.10 Never overwrite a project's instruction files (S)
**Goal:** running `init` on an existing project can't lose its `CLAUDE.md` or `AGENTS.md`.
**Why:** today, `init` asks "Overwrite it? [y/N]" for both. Saying yes wipes the file *before* `gw-setup` gets a chance to import its rules.
**Changes:**
- `cli/src/init.ts` `planAdapter` and `planInit`: when `CLAUDE.md` or `AGENTS.md` already exists, never replace it. Use `append-lines` to add Groundwork's pointer lines (`@AGENTS.md` for CLAUDE.md; "Read .groundwork/HANDOFF.md first and follow .groundwork/workflow.md" for AGENTS.md). `gw-setup` merges the rest later, with your OK.
- `KEPT_ADVICE` becomes unnecessary for these two files.
- `doctor`: its existing CLAUDE.md check still passes.

**Acceptance criteria:**
- [ ] A test: an existing CLAUDE.md and AGENTS.md keep every original line after `init`, plus the pointer lines
- [ ] No overwrite prompt for these two files
- [ ] A fresh folder still gets the full templates

**Source:** original.

### 7.11 Imported rules keep their strength (S)
**Goal:** the rules a project already follows don't get demoted.
**Why:** today, `gw-setup` step 5 imports existing rules as NOTEs and rebuilds AGENTS.md. A rule that used to be always loaded ends up only in LESSONS, where just the reviewer reads it.
**Changes:** `core/commands/gw-setup.md` "Existing project" step 5:
1. Import each rule into LESSONS with origin "imported".
2. Ask which ones must stay always-on.
3. Those become RULEs in AGENTS.md's Rules section, with their lesson ID. The rest stay NOTEs.
4. Show what goes where before writing anything.

**Acceptance criteria:**
- [ ] The step says imported rules can be kept as RULEs
- [ ] Nothing is dropped without being shown to you first
- [ ] `existing-projects.test.ts` updated

**Source:** original.

## Phase 8: Activation (the "what now?" problem)

### 8.1 `/gw`: the one command to remember (M) · depends on D4
**Goal:** `/gw` reads HANDOFF and the cards, says where things stand in plain words, and runs the next step, or asks when the next step belongs to the human. It **replaces `gw-resume`** (cut).
**Behavior:**
- Nothing set up yet → `gw-setup`
- No spec → `gw-spec`
- Spec not confirmed → ask
- No cards → `gw-plan`
- A card in progress → resume that role (today's `gw-resume` steps)
- `awaiting-approval` → show the 7.3 summary and ask for approve or reject
- Otherwise → `gw-next`

**Changes:**
- New `core/commands/gw.md`, which takes over the useful parts of `gw-resume.md`.
- Delete `gw-resume.md`, and update every reference (see "How to work this plan" for the list).
- README: the main command table shows `/gw`, `gw-setup`, `gw-spec`, `gw-plan`, `gw-next`, `gw-approve`/`gw-reject` and `gw-quick`. A separate **Power commands** table shows `gw-decide`, `gw-ui-spec`, `gw-handoff` and `gw-retro`.
- Update the command lists in the three test files, plus the snapshots.
- `init`'s closing message (`NEXT_STEPS` in `cli/src/init.ts`): "open Claude Code here and type /gw".

**Acceptance criteria:**
- [ ] Every state in the list above maps to exactly one action in `gw.md`
- [ ] No file refers to `gw-resume` (grep, excluding old cards and evidence)
- [ ] The README shows the two-tier command table

**Source:** original.

### 8.2 Session-start orientation (M) · depends on 8.1
**Goal:** every new session, and every `/clear` or compaction, starts with 3 lines from HANDOFF. For example: "Groundwork: card 1.3 *Login flow* is being built (implementer). Next: make the session test pass. Type /gw to continue."
**Why:** resuming becomes automatic, which is what HANDOFF was always for. This is Groundwork's answer to superpowers' auto-activation. It injects *project state*, not a methodology.
**Changes:**
- New `core/hooks/session-start.mjs` (Node, like the guards, so it's cross-platform and avoids superpowers' bash-on-Windows wrapper). It prints the Claude Code SessionStart JSON with `additionalContext`, and nothing at all if `.groundwork/` is missing.
- `cli/src/adapters/claude-code.ts`: a `SessionStart` hook with matcher `startup|clear|compact`, merged through `mergeSettings`.
- `cli/src/adapters/opencode.ts`: the equivalent in the plugin if OpenCode has a session event (check the docs; if it doesn't, note it as a limitation).
- `cli/src/doctor.ts` `checkAdapters`: warn when the hook is missing.
- `cli/src/init.ts`: copy `hooks/` into `.groundwork/hooks/`. Update the list in `templates.test.ts` / `init.test.ts` if needed.

**Acceptance criteria:**
- [ ] Unit test: sample HANDOFF → the expected 3 lines; missing HANDOFF → a fallback line; no `.groundwork/` → no output
- [ ] The output stays under about 80 tokens
- [ ] It's checked in a real Claude Code session on Windows (evidence: screenshot or transcript)
- [ ] Without an adapter, nothing is lost: the "read HANDOFF first" rule in AGENTS.md still gets a fresh session oriented

**Source:** mechanism borrowed from superpowers (`hooks/hooks.json`, `hooks/session-start`). Content and implementation are original.

---

## Phase 9: A friendlier loop

### 9.1 Bugs through the quick path (S–M)
**Goal:** a bug with an unclear cause doesn't force a whole card and plan.
**Changes:** `core/commands/gw-quick.md` gets a "Fixing a bug" branch:
1. Reproduce it with a failing test.
2. State the cause in one sentence, with the evidence that shows it.
3. Only then fix it.
4. If there's still no cause after two honest attempts, stop and suggest a card.

Update "When to use it", and the AGENTS.md rule from 7.2.
**Acceptance criteria:**
- [ ] The bug branch requires a failing test and a stated cause before any fix
- [ ] It has a clear exit to a card
- [ ] `gw-quick.test.ts` covers the new steps

**Source:** idea borrowed from superpowers' systematic-debugging (root cause before fixes), in your own plain wording. Don't bring over its tone.

### 9.2 Labeled recommendations for decisions (S) · depends on D1
**Goal:** the planner may say "If you're not sure, B is the usual choice for a solo app because…". "Go with your recommendation" is an explicit choice, recorded as "accepted the recommendation". Nothing is chosen silently.
**Changes:**
- `core/commands/gw-decide.md` (steps 3–5)
- `core/roles/planner.md` (Must not)
- `core/commands/gw-plan.md`
- `core/templates/decision.md` (Decision comment)
- README "Stack-neutral" bullet
- `.groundwork/SPEC.md` principle 6
- `decide-ui-spec.test.ts`

**Acceptance criteria:**
- [ ] A recommendation is always labeled as one
- [ ] The human's acceptance is recorded in their words
- [ ] "You decide" with no reply still isn't accepted as a choice

**Source:** partly borrowed idea (superpowers leads with a recommendation). Groundwork keeps the explicit human choice.

### 9.3 Plain status labels (S)
**Goal:** `groundwork status` and the approval messages show "to do / being built / waiting for you / done / sent back". The internal statuses don't change.
**Changes:** `cli/src/status.ts`, plus a label map in `cli/src/schema.ts`. Update `status-adapter.test.ts`.
**Acceptance criteria:**
- [ ] Every `CARD_STATUSES` value maps to a label
- [ ] The internal statuses in the card files are unchanged

**Source:** original.

### 9.4 `groundwork upgrade` and a version stamp (M)
**Goal:** projects installed with an older version can be brought up to date, and `doctor` says when they're behind. This fixes a limitation the README already lists.
**Changes:**
- `cli/src/init.ts` writes `"version"` into `.groundwork/config.json`
- `core/templates/config.schema.json` allows it
- `cli/src/doctor.ts` adds a suggestion when the project version is older than the CLI
- new `cli/src/upgrade.ts` refreshes `roles/`, `commands/`, `workflow.md`, `guards/run.mjs` and `hooks/`, using `applyFiles` (asks before overwriting), and never touches SPEC, HANDOFF, LESSONS, cards, decisions or evidence
- `cli/src/index.ts` lists the command
- README Honest limitations: remove the bullet

**Acceptance criteria:**
- [ ] An upgrade test: a v0.3-shaped project gets the new core, and its state files are byte-identical afterwards
- [ ] `doctor` suggests an upgrade for an old version

**Source:** original.

### 9.5 "Just trying something" path (S)
**Goal:** a third size for feasibility questions ("Can this library do X?", "Is this even possible?"). The output is an answer, not kept code.
**Changes:**
- `core/commands/gw-quick.md`: a "Trying something out" section:
  1. State the question in one line.
  2. Try it on a throwaway branch or in a scratch folder.
  3. Report the answer and a recommendation.
  4. Never merge the code. If you want to keep it, that's a new card.
- The routing rule from 7.2 names all three paths: try, quick, card.

**Acceptance criteria:**
- [ ] The try path never commits to the main branch
- [ ] Keeping the result always goes through a card
- [ ] AGENTS.md stays within budget

**Source:** idea borrowed from brainstorming's "spike" path.

### 9.6 Judgment calls, logged and shown (M)
**Goal:** in `per-phase` mode, the agent keeps working instead of stalling on small questions, but every judgment call is visible to you.
**Changes:**
- `core/workflow.md` gets a short **Stop only for** list:
  - anything destructive or irreversible
  - security-sensitive changes
  - a new dependency or stack change (needs a decision record)
  - a spec gap that changes what users see
- Everything else: decide, and write a History line `YYYY-MM-DD call: <what> — <why> — <cost if wrong>`.
- `gw-approve` (phase approval) and the 7.3 summary list every `call:` line from the phase.
- `cli/src/retro.ts` counts calls that were later rejected.
- `core/templates/card.md` shows the History format (see 7.8).

**Acceptance criteria:**
- [ ] The stop list is written in plain words
- [ ] Phase approval shows every call from that phase's cards
- [ ] A retro test finds a call that was followed by a rejection

**Source:** idea borrowed from subagent-driven-development's "Rulings, not stalls". Groundwork's version stays visible and gated by approval.

### 9.7 Phase recap and a retro nudge (S–M)
**Goal:** at the end of every phase, you get a short plain-language recap:
- what shipped
- how to try it
- decisions made
- calls the agent made
- lessons added

Then `/gw` suggests `gw-retro`.
**Why:** vibecoders see real progress. Experienced devs get a changelog for free. It also feeds the case study and your marketing.
**Changes:**
- New `core/templates/JOURNAL.md`, copied to `.groundwork/JOURNAL.md` by `init`. Update the template list in `templates.test.ts`.
- `gw-approve` (phase approval) appends the recap.
- `core/commands/gw.md` routing: phase approved → suggest a retro.

**Acceptance criteria:**
- [ ] A recap is under about 150 words and links to cards instead of copying them
- [ ] Approving a phase always adds exactly one recap
- [ ] `/gw` suggests a retro after a phase closes

**Source:** original.

### 9.8 A test baseline for projects that already exist (M)
**Goal:** an existing project with failing tests, thousands of lint warnings, or no tests at all doesn't block every card forever.
**Why:** the implementer and reviewer require the full test suite, lint and build to pass. On a real legacy repo, that often can't happen on day one.
**Changes:**
- `gw-setup` (existing project) runs test, lint and build once and records the result as a **baseline**: `.groundwork/evidence/baseline/` plus a "Known failing" line in HANDOFF.
- `core/roles/implementer.md`, `reviewer.md` and `gw-quick.md`: the rule becomes **"no new failures"** compared with the baseline. A card that fixes a baseline failure says so.
- If there are no tests at all, `gw-setup` offers a decision (`gw-decide`): add a test setup now as the first card, or rely on manual checks until then.

**Acceptance criteria:**
- [ ] The baseline is saved and linked from HANDOFF
- [ ] The roles judge by "no new failures" when a baseline exists, and by "all pass" otherwise
- [ ] The no-tests case leads to a decision, not a dead end

**Source:** original.

### 9.9 Specs the size of a change (M)
**Goal:** on an existing project, you spec *the change you want*, not the whole app.
**Why:** today, setup writes a "current state" spec and points you to `gw-plan`. But there's nothing new in it to plan, so the next step is unclear.
**Changes:**
- `core/templates/SPEC.md`: keep "what the app does today" short, and add a **Changes** section with one sub-section per change (goal, rules, edge cases, and "must not break"). Update `templates.test.ts` if required sections change.
- `gw-spec`: on an existing project, start with "What do you want to change or add first?" and write a change section, using the same smallest-useful-version rule.
- `gw-plan`: plans cards for one change at a time.
- `gw-setup`: next step is `gw-spec` ("what do you want to change?"), or `gw-quick` for something small.
- `/gw` routing (8.1): an existing project with no open change asks what to work on.

**Acceptance criteria:**
- [ ] After setup on an existing project, the next step is always a question about what to change
- [ ] A change spec includes what must not break
- [ ] New-project specs are unaffected

**Source:** original.

### 9.10 Codebase map (S–M)
**Goal:** every role loads less of an unfamiliar codebase, because setup leaves a short map of where things live.
**Changes:**
- `gw-setup` (existing project) writes a **Codebase map** section in SPEC.md: main folders, entry points, where tests live, and anything unusual. Mark each item *found* or *guessed*, and keep it under about 20 lines.
- The roles' Load lists say "the Codebase map in SPEC.md, then only the files it points to".
- `gw-plan` updates the map when a card adds a new area.

**Acceptance criteria:**
- [ ] The map exists after existing-project setup and stays under the size limit
- [ ] Tester, implementer and reviewer name it in their Load lists

**Source:** original. Superpowers maps files per plan (writing-plans "File Structure"); this map lives for the whole project.

### 9.11 Follow the project's commit style (S)
**Goal:** Groundwork doesn't force `[1.2] Login flow` on a repo that already uses something else, such as `feat(auth): …`.
**Changes:**
- `core/templates/config.json` and `config.schema.json`: an optional `commitFormat`, for example `"feat: {title} ({id})"`. The default is today's format.
- `gw-setup` (existing project) proposes a format based on `git log`, marked *found*.
- `gw-approve`, `gw-next` and `gw-quick` use it.
- `cli/src/retro.ts` finds card IDs with the configured format instead of only `^[id]`.

**Acceptance criteria:**
- [ ] The default output is unchanged
- [ ] A configured format is used for commits
- [ ] A retro test with a custom format still finds signals

**Source:** original.

---

## Checkpoint: card 6.1, the real-app run

Do this **after Phase 8**, ideally after Phase 9. It isn't benchmarking. It's the fastest way to find where Groundwork stops feeling intuitive. Add these to card 6.1's criteria:
- [ ] Start from nothing with only the README (no memory of the internals). Write down every moment you didn't know what to do next.
- [ ] The session-start hook and the guard hook both work on **Windows** (`$CLAUDE_PROJECT_DIR` expansion is unverified today)
- [ ] `/gw` resumes after closing the session partway through a card
- [ ] Every "I didn't know what to do" moment becomes a LESSONS note

Re-plan Phase 10 from what 6.1 finds.

---

## Phase 10: Structural (after 6.1)

### 10.1 Experience setting (M–L) · depends on D2, 7.3, 9.2
**Goal:** one setup question ("Are you new to building software, or experienced?") sets `experience: "new" | "experienced"`.

| | new | experienced |
|---|---|---|
| Explanations | Explains each step in one sentence | Terse |
| Approval stop | Always shows "How to check it yourself" | Summary only |
| Decisions | Labeled recommendations for stack choices | Options only (still labeled if asked) |
| Default approval | per-card | per-phase |

**Changes:**
- `core/templates/config.json` and `config.schema.json`
- `gw-setup`
- one line in the AGENTS.md template that tells the agent to read the setting
- `gw-next`, `gw-approve`, `gw-decide`

**Acceptance criteria:**
- [ ] Both values are documented where they change behavior
- [ ] Switching the value mid-project needs no other change
- [ ] AGENTS.md stays within budget

**Source:** original.

### 10.2 A test that keeps the core adapter-free (S)
**Goal:** `core/` never starts depending on one tool. Everything tool-specific stays in `cli/src/adapters/`.
**Changes:** a new test in `cli/test/` that scans `core/` for tool-specific words and paths (`.claude/`, `.opencode/`, `CLAUDE_PROJECT_DIR`, `Skill tool`, `subagent_type`) and fails if it finds any, with a short allow-list for sentences like "if your tool has subagents".
**Acceptance criteria:**
- [ ] The test passes on today's core, or it finds real leaks and they're fixed
- [ ] An install with `--adapter none` shows how to reach every main command from plain markdown (`AGENTS.md` → `.groundwork/commands/`)

**Source:** original.

### 10.3 Position Groundwork as the project layer (S)
**Goal:** the README says in two sentences what Groundwork owns (spec, cards, approval, memory, lessons) and that it works *alongside* skill packs such as superpowers.
**Changes:** `README.md` (a short "Works with" note under Adapters), SPEC §1 comparison table.
**Acceptance criteria:**
- [ ] The first screen of the README makes the "project layer" idea clear
- [ ] Nothing claims compatibility that hasn't been tried. Say "should work alongside" until someone has run it.

**Source:** original.

### 10.4 Optional model hints per role (S–M)
**Goal:** save cost and time by letting cheap models do the mechanical roles and strong models do judgment. For example, a mid-tier model for the tester and implementer, and the strongest for the reviewer and planner.
**Changes:**
- `core/templates/config.schema.json`: an optional `models` object (`planner`, `tester`, `implementer`, `reviewer`).
- `cli/src/adapters/claude-code.ts` and `opencode.ts` write `model:` into the generated agent files when it's set.
- The core ignores it, so there's no effect without an adapter.
- `doctor` warns about unknown role names.

**Acceptance criteria:**
- [ ] Empty `models` gives exactly today's output (snapshots unchanged)
- [ ] A set value shows up in both adapters' agent files
- [ ] The `none` adapter is unaffected

**Source:** idea borrowed from subagent-driven-development's "Model Selection".

### 10.5 Existing-project run (M) · depends on 7.10, 7.11, 9.8–9.11
**Goal:** "bring your messy project under Groundwork" is a flow that has actually been run, not just written.
**Changes:**
- Run `gw-setup` on one of your real existing repos (the church website or MyPortfolio).
- Fix whatever it gets wrong in `core/guides/existing-project.md` (moved out of `gw-setup` in card 7.11): marking things *found* or *guessed*, recording the stack already in use, importing an old CLAUDE.md into LESSONS.
- Add an `existing-project` walkthrough to the README.

**Acceptance criteria:**
- [ ] One real repo onboarded with no manual edits to Groundwork's files
- [ ] Everything marked *guessed* was confirmed or corrected by you
- [ ] Findings logged in LESSONS
- [ ] README section added

**Source:** original.

### 10.6 Side-by-side trial (M)
**Goal:** an honest, qualitative check against superpowers. It's a comparison, not a benchmark.
**Changes:**
- Build the same tiny app twice, one evening each: once with superpowers, once with Groundwork.
- Write down every moment of confusion, every stop, every surprise, and what each one did better.
- Save the notes as `.groundwork/evidence/10.6/side-by-side.md`.
- Turn what superpowers did better into new cards, and what Groundwork did better into README and marketing copy.

**Acceptance criteria:**
- [ ] Both runs reach at least one approved or finished feature
- [ ] The notes list at least three things superpowers did better
- [ ] The "Done means" checklist at the top is re-checked honestly

**Source:** original.

---

## Parking lot (not this round)

- **Undo a card for vibecoders:** document "undo the last card" as `git revert` of its `[<id>]` commit, and maybe a `gw-undo` later.
- **Guard gap:** `git commit -F file` isn't checked by `no-ai-trailers`. Read the file when the command uses `-F`.
- **Hook cost:** the PreToolUse guard hook starts Node on every Bash/Write/Edit even when `guards` is empty. Only worth changing if 6.1 shows it's noticeable.
- **`doctor` checks HANDOFF format:** warn when fields that `status` and the session-start hook read are missing.
- **More adapters** (Cursor, Codex, Gemini): each is a thin generator in `cli/src/adapters/`, and the core doesn't change.
- **Plugin distribution:** declined (D3). Install is `npx groundwork-ai init` only.
- **Monorepos:** different test, lint and build commands per package. Today `config.commands` holds one set.
- **Team repos with pull-request flows:** cards commit straight to the current branch; a team repo may need a branch per card or phase, and a PR at approval.
- **Evals and benchmarks:** deliberately deferred (see the goal at the top).
- **Branch isolation for `per-phase` runs** (work on a branch, merge at phase approval): only if 6.1 or 10.6 shows that committing straight to the main branch is a problem.

## Cut list (in one place)

- `gw-resume` → merged into `/gw` (8.1)
- Empty `adapters/`, `docs/`, `examples/` directories and the dead CLI branch (7.6)
- The "v1.0 = benchmark evals" promise in SPEC and README (7.6)
- Full-length evidence logs (7.7)
- Config jargon in the setup questions (7.4)
- 12 equal commands in the README → 7 main commands plus 4 power commands (8.1)

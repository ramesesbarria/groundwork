# Lessons

Each lesson records the mistake it came from. Levels: NOTE → RULE → GUARD (see SPEC §9).
The first entries were imported from the author's Claude Code /insights report (2026-09-24), covering 67 sessions across several projects.

### L-001 · No AI attribution trailers in commits
- Level: RULE (planned guard: `guards/no-ai-trailers.mjs`)
- Origin: imported. AI-attribution trailers added to 7 commits in one session despite a written rule.

### L-002 · Pull before analyzing
- Level: NOTE
- Origin: imported. A report was built from a checkout 45 commits behind origin.

### L-003 · Propose the lean version first
- Level: RULE (in `core/roles/planner.md` and `gw-spec`, card 3.2)
- Origin: imported. The first harness design was too heavy and had to be cut back to 3 files.
- History: note (2026-09-24, imported) → rule (2026-09-24, repeated in the dogfood run: a "tiny sample app" spec grew into a multi-user phone app with push notifications, card 3.1 F4)

### L-004 · Write a behavior spec before UI animation work
- Level: NOTE
- Origin: imported. A testimonials carousel took many fix rounds, and one full attempt was thrown away.

### L-005 · "Remind me" means write it to HANDOFF.md
- Level: NOTE
- Origin: imported. A reminder was made as a session-scoped cron job and had to be undone.

### L-006 · Claim only what the evidence shows
- Level: NOTE
- Origin: imported. A job-application answer described a portfolio bug as a production incident.

### L-007 · Update HANDOFF before every stop, including stops to wait for the human
- Level: NOTE (fixed in `gw-plan`, card 3.2)
- Origin: dogfood run, card 3.1 F5. `gw-plan` stopped to wait for stack choices without updating HANDOFF, which then described the previous step.

### L-008 · Check the previous step was confirmed before building on it
- Level: NOTE (fixed in `gw-plan`, card 3.2)
- Origin: dogfood run, card 3.1 F7. `gw-plan` ran on a spec the human hadn't confirmed and didn't notice.

### L-009 · Manual checks only for what can't be automated
- Level: NOTE (fixed in `core/roles/tester.md`, card 3.2)
- Origin: dogfood run, card 3.1 F8. The tester repeated every acceptance criterion as a manual check, doubling the card.

### L-010 · Templates must read correctly in every config mode
- Level: NOTE (fixed in the AGENTS.md template, card 3.2)
- Origin: dogfood run, card 3.1 F6, found by the model during `gw-setup`. AGENTS.md said "don't commit until the human approves", which is wrong in `per-phase` mode.

### L-011 · When the human says "you decide", use visible defaults
- Level: NOTE (written into `gw-spec`, card 3.2)
- Origin: dogfood run, card 3.1 F3. The model marked every default *(default)* and listed extra choices. Good behavior, but improvised, so it's now written down.

### L-012 · A fresh install should be commit-ready
- Level: NOTE (fixed in `init` and `gw-setup`, card 3.2)
- Origin: dogfood run, card 3.1 F1 and F2. Line-ending warnings on every installed file on Windows (no `.gitattributes`), and nothing suggested committing after setup.

### L-013 · Process cost should match the size of the change
- Level: NOTE (light path `gw-quick` planned, card 4.1)
- Origin: the human, after the dogfood run: "isn't this so much work for a simple dev kit". The full loop costs the same for a typo as for a feature.

### L-014 · Edit code with the file-edit tool, not through script string literals
- Level: NOTE (repeated once already; next repeat → RULE)
- Origin: building Groundwork. Twice, a Python script that edited TypeScript turned `\n` escapes into real line breaks: a regex in card 1.4's tests, and `cli/src/init.ts` in card 3.2 (restored from git, redone with the edit tool).

### L-015 · Change into the target folder before running a command that writes files
- Level: GUARD (`init` refuses to run in Groundwork's own source repo, added with this lesson)
- Origin: card 4.3. While checking the OpenCode adapter, `node cli/dist/bin.js init … && cd "$T"` ran `init` *before* moving into the temp folder, so it installed Groundwork into its own repo. `git add -A` committed 38 stray files in `[4.3]` (not pushed). `init`'s ask-before-overwrite kept the real SPEC, HANDOFF and LESSONS safe. Went straight to a guard because it's cheap and the damage was large.

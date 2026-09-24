# Handoff

- **Phase:** 2 (Claude Code adapter + CLI), v0.1 "Core loop", running in `per-phase` mode at the human's request: cards commit after review, nothing is pushed until the phase is approved
- **Current card:** none (2.1 and 2.2 done, committed locally)
- **Status:** —
- **Last step:** 2.2 committed locally; phase 2 is complete and waiting for the human's review
- **Next step:** human reviews phase 2 → approve → push → confirm CI on Linux + Windows (card 2.2 criterion 3) → start 3.1 (dogfood run)
- **Failing checks:** none locally
- **Notes:** 3.1 includes the fresh-session resume test moved from 1.5. It's the first time the generated files are used inside real Claude Code.

# Lessons

Every rule in this project starts here, with a note on the mistake that created it. Add one with `npx groundwork-ai lesson "<name>" --origin "<what went wrong>"`.

**Levels** (a lesson moves up when the same mistake happens again):
- **NOTE**: recorded here only; read before reviewing or repeating that kind of work.
- **RULE**: promoted into AGENTS.md's Rules, so it's always in context.
- **GUARD**: a script in `.groundwork/guards/` that blocks the action (needs the flow: `npx groundwork-ai flow on`). Turn one on by adding its name to `guards` in `.groundwork/config.json` (e.g. `"guards": ["no-ai-trailers"]`).

<!-- Format:

### L-001 · Short name of the lesson
- Level: NOTE
- Origin: what went wrong, when, and where (a commit, a file, a task)
- History: note (date) → rule (date) → guard (date)

-->

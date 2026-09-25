# Role: Tester

## Job
Turn the current card's acceptance criteria into tests that fail now and will pass when the card is done.

1. Write one or more tests per acceptance criterion.
2. Run them and confirm they fail **for the right reason** (the feature is missing, not a typo or broken import).
3. Add manual checks only for criteria that can't be automated (for example, how something looks). Don't repeat criteria that a test already covers.
4. For a criterion that only shows in the running app, write a browser check (a script that starts the app with `run`, or the way you worked out if `run` is empty, drives a real or headless browser, and asserts what's on screen). Save it in the repo next to the tests, not in a temp folder, and put the command that reruns it under the card's **How to check**, so the implementer and reviewer rerun the same check.
5. Set the card status to `implementing`.

## Load
Read only these:
- `.groundwork/HANDOFF.md`
- The current card in `.groundwork/cards/`
- The Codebase map in `.groundwork/SPEC.md`, if there is one, then only the files it points to
- Existing tests near the code this card touches, to match their style
- The project's test and run commands in `.groundwork/config.json`

## Writes
- Test files
- The card: status, plus any manual checks
- The failing test output, saved to `.groundwork/evidence/<card-id>/`: the command, the summary line and the failures, about 30 lines at most, not the full output
- `.groundwork/HANDOFF.md`, when you play every role yourself. As a subagent, put what HANDOFF needs in your report instead; the runner writes it.

## Must not
- Write the implementation, not even a stub that makes a test pass.
- Weaken a test to make it easier to pass later.
- Write tests that only check a file exists or its source contains some text, just to have something that fails. Test behavior.
- Test things the card doesn't ask for. Note extra ideas in HANDOFF instead.

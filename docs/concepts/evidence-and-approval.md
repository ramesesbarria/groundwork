# Evidence and approval

**No evidence, no approval.** A card cannot be approved while its proof is missing. This is the rule
that turns "done" from a claim into something you can check.

## What counts as evidence

Evidence is saved as files in `.groundwork/evidence/<card-id>/` and linked from the card:

- **Test output** — the command, its summary line (e.g. "42 passed, 3 failed"), and the failures,
  about the last 30 lines at most. Not the full output: evidence is committed, so it stays short
  enough to read.
- **Screenshots** for UI work, one per screen size, when the tool can take them.
- **The reviewer's verdict** — which criteria were checked, and which lessons were checked against
  (e.g. "Checked against L-003, L-006").
- **A live check** for behavior that only shows in the running app: the tester writes a browser
  check (or the manual steps) and puts the command under the card's **How to check**, so the
  implementer and reviewer rerun the same check.

## How to check it yourself

The reviewer writes a **How to check** section on the card for you: what to open, run or click to
see the change working, in plain words. It's shown at every approval stop. If something couldn't be
verified live, the reviewer must say so and make it the first caveat — never quietly mark it met.

## What approval refuses

`/gw-approve` stops, and says exactly what's missing, when:

- the card's Evidence section is empty,
- any file it links to is missing, or
- an acceptance criterion is unchecked with no explanation.

The agent won't fill the gap itself to get past the gate. Either the work goes back, or the
evidence gets made first.

## Baselines

On a project that already had failing tests, lint warnings or no tests, "everything passes" can be
impossible on day one. Setup runs the checks once and saves the result in
`.groundwork/evidence/baseline/`, and `HANDOFF.md` says **Known failing: …**.

From then on:

- a card passes when **nothing new fails**, compared with the baseline;
- a card that fixes a baseline failure says so, and the baseline is updated;
- if the project has no tests at all, setup asks you to decide — add a test setup as the first
  card, or rely on manual checks until then — instead of leaving you stuck.

## Why keep the proof?

- You can check any past claim without re-running anything.
- The reviewer's verdict names what it actually verified.
- Rejections and send-backs feed `groundwork retro`, so a mistake you had to catch has a path to
  becoming a [lesson](/concepts/lessons-ledger).

## Next

[Handoff and resuming →](/concepts/handoff)

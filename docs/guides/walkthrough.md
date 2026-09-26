# Walkthrough: a calculator app

This is a real build, recorded as it happened: a small calculator app, built with Groundwork in
OpenCode. Each chapter is a short clip of the actual session — no staged output.

## 1. Writing the spec

`/gw` starts with the smallest useful version, not a blank prompt. It asks a few specific questions
and offers choices; you pick one or type your own.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/spec-questions.mp4"></video>

*The scope question and the memory-key question, with the answers.*

When the answers are in, the agent writes `.groundwork/SPEC.md` and reads it back in plain words —
including the calls it made where you didn't specify anything.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/spec-written.mp4"></video>

*From the last questions to "Spec written — here it is in plain words."*

## 2. Planning the cards

When the spec is settled, `gw-plan` turns it into phases and small cards — each small enough for
one session, with checkable acceptance criteria. Nothing is written until you say the plan looks
right.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/plan-confirm.mp4"></video>

*The plan table, the "Does this plan look right?" question, and the go-ahead.*

Then the card files land in `.groundwork/cards/`, and the next step is handed back to you.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/plan-cards-written.mp4"></video>

*"Planning is done" — six cards written, next step card 1.1.*

One more step before the card loop: the planning files get committed on their own, so card 1.1's
commit holds only card 1.1's work.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/plan-committed.mp4"></video>

*The plan commit, then the runner lines up card 1.1.*

## 3. Building the first card

`/gw` starts card 1.1 and hands it to the **tester** — a subagent with fresh context whose only job
is writing tests that fail for the right reason. The runner doesn't write them itself, and the
implementer won't be allowed to touch them later.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/tester-launched.mp4"></video>

*"Card started. Handing it to the tester now (a subagent, so its work stays separate from mine)."*

When the tests come back failing for the right reason, the runner confirms them, moves the card to
**implementing**, and hands it to the implementer — with the tester's evidence attached.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/implementer-launched.mp4"></video>

*"Failing state confirmed exactly as reported. Wiring card 1.1 to the implementer."*

## 4. Approval and commit

When the card has passed review, the runner stops and shows you the same three-part summary, in
plain words: what changed, how to check it yourself, and the caveats.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/approval-stop.mp4"></video>

*The approval stop for card 1.1, with the reviewer's caveats listed.*

Only you can approve. `/gw-approve` checks the evidence first, marks the card done, commits it —
and asks about the next card.

<video autoplay muted loop playsinline controls src="https://ramesesbarria.github.io/groundwork/clips/approved-commit.mp4"></video>

*"Approved and committed [1.1] Number entry (3e7c4c8). Card 1.2 is next."*

## Coming next

- Card 1.2 and the rest of the build
- The finished calculator

Recorded as the build moves along.

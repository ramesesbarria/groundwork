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

## Coming next

- Planning the cards
- The first card: tester → implementer → reviewer
- Approval and commit

Recorded as the build moves along.

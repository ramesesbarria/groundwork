---
id: {{id}}
title: {{title}}
phase: {{phase}}
status: todo | testing | implementing | built | review | awaiting-approval | done | rejected
depends_on: []
---
## Goal
<!-- One or two sentences: what's true when this card is done. -->

## Acceptance criteria
<!-- Checkable statements. The tester turns each one into a test. The reviewer ticks one met ([x]) or
     leaves it unticked with the reason: "- [ ] <criterion> — <why>". -->
- [ ]

## Human checks
<!-- Optional: what only a person can see or judge (a Tab walk, a focus ring). One "- [ ] <what to
     open, do and see>" per criterion the reviewer can't prove; ticked with the date when confirmed. -->

## How to check
<!-- Optional. Written by the reviewer for the human: a URL to open, a command to run, or a thing to click
     to see the change working, in plain words. Shown at the approval stop. -->

## Evidence
<!-- Links to exact proof files in ../evidence/{{id}}/ (test output, screenshots) and the reviewer's verdict.
     Never patterns like review-*; list each file. One short line per link: the file, the command and
     its summary line. Details belong in the file. Approval needs this section. -->

## History
<!-- One short line per event: date, what happened, and why. Every role rereads this card, so keep
     lines to a sentence or two; details go in the evidence files. `groundwork retro` and `doctor` read these formats exactly:
     - YYYY-MM-DD <from> → <to>: <why>   (every status change, e.g. "testing → implementing: 4 failing tests saved")
     - YYYY-MM-DD rejected: <reason>
     - YYYY-MM-DD review → implementing: <problems>
     - YYYY-MM-DD approved by human
     - YYYY-MM-DD call: <what> — <why> — <cost if wrong>
     Anything else: "YYYY-MM-DD <what happened>". -->

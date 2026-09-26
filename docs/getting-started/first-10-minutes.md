# Your first 10 minutes

Here's what a first session looks like, from an idea to a committed first card. The example: a page
where a book club votes on next month's book.

![An OpenCode session: /gw sets the project up, interviews for the spec, and writes the plan of cards.](https://ramesesbarria.github.io/groundwork/demo-first-session.gif)

Want the longer version? The [recorded walkthrough](/guides/walkthrough) follows a real build
chapter by chapter.

## 1. Describe the idea

```text
You:   /gw I want a page where my book club votes on next month's book
Agent: A few specific questions first:
       1. Who can vote: anyone with the link, or signed-in members only?
       2. One vote each, or rank several books?
       3. Show results before voting closes?
```

The agent asks **specific questions in small batches** — never "do you agree with section 2?" It
offers a sensible default where one exists. If you say "you decide", it marks each default it
chose *(default)* in the spec; nothing is presented as your decision when it wasn't.

## 2. Confirm the spec

```text
You:   Anyone with the link. One vote. Hide results until it closes.
Agent: Spec saved, starting with the smallest useful version. Does it look right?
You:   Yes.
```

The spec goes in `.groundwork/SPEC.md`, in your words. Everything that didn't make the smallest
useful version goes under "Later phases" — scope growth is declined by default, not discovered
later.

## 3. Agree the plan

```text
You:   /gw
Agent: Plan: 2 phases, 5 cards.
       1.1 Book list page · 1.2 Voting · 1.3 Close the vote · ...
       OK to write the cards?
You:   Go.
```

`/gw` knows the spec is confirmed and there are no cards, so it runs `gw-plan`. If the build needs
a stack choice (database, framework, hosting), you get 2–4 options with trade-offs first, and a
decision record is written once you choose. Nothing is picked for you.

## 4. Build the first card

```text
You:   /gw
Agent: Card 1.1 Book list page: tests written, code passing, review passed.
       What changed: the home page lists this month's books.
       How to check: run npm run dev and open http://localhost:3000
       Caveats: no styling yet.
       Approve or reject?
```

Behind that summary, a card went through three roles:

1. **Tester** wrote failing tests and saved the output.
2. **Implementer** made them pass, plus the full suite, lint and build.
3. **Reviewer** re-ran everything with fresh context and checked every acceptance criterion.

At the stop you get **what changed**, **how to check it yourself**, and **the caveats**, in plain
words — plus any judgment calls the agent logged along the way.

## 5. Approve

```text
You:   /gw-approve
Agent: Committed [1.1] Book list page. Next up: card 1.2 Voting.
```

Approval refuses to run while the evidence is missing. Once approved, the card is marked done, the
handoff is updated, and the changes are committed with the card's ID in the message.

Then `/gw` again for the next card. That's the whole loop.

## Where everything lives

| You want to know… | Look at |
|---|---|
| What's next | `/gw`, or `npx groundwork-ai status` |
| What we're building | `.groundwork/SPEC.md` |
| What each piece of work is | `.groundwork/cards/` |
| The proof it was done | `.groundwork/evidence/<card-id>/` |
| Where we stopped | `.groundwork/HANDOFF.md` |
| Stack choices and why | `.groundwork/decisions/` |
| Mistakes we learned from | `.groundwork/LESSONS.md` |

## Small changes skip the loop

For a typo, a copy tweak, a config value, or a bug, `/gw-quick` makes the change in one pass — no
card, no roles. Bugs still need a failing test and a stated cause before the fix. If a "quick" job
grows past about three files or changes behavior people notice, the agent stops and suggests a
card instead. [Right-sizing →](/concepts/right-sizing)

## Next

[How the build loop works →](/concepts/the-build-loop)

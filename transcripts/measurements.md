# Measurements

Raw numbers behind [What it costs](https://ramesesbarria.github.io/groundwork/concepts/cost).
Model: DeepSeek V4.1 Flash (`deepseek/deepseek-flash#max`) in OpenCode 2.0.18, on Windows.
Measured 2026-09-26 from OpenCode's per-call token accounting. "Context" is what the model was sent
for one call (input + cache read); "fresh" is input + output + reasoning.

## Summary

| Measure | Number |
|---|---:|
| Cost to build the calculator (6 cards, 2 phases) | $0.586 |
| Fresh tokens to build it | 1,327,941 |
| Of all fresh tokens, reasoning | 40.6% |
| Tokens re-read from cache, all sessions | 35.2M |
| Context at the start of each of the 18 role sessions | 8,789 – 9,652 |
| Peak context in the phase 1 main chat (one long chat) | 280,280 |
| Share of all re-read tokens in the two main chats | 61% (21.6M of 35.2M) |
| Context at the start of phase 2's new main chat | 9,192 (vs ≈190k if phase 1's chat had continued) |
| Re-read tokens avoided by that new chat (61 calls × ≈181k) | ≈11M |

## Cost per card

Tester, implementer and reviewer sessions together. Each started from the same ≈9k context, so
the cost tracks the work in the card, not how far into the project it is.

| Card | Cost | Fresh tokens | Peak context (largest role) |
|---|---:|---:|---:|
| 1.1 Number entry | $0.0593 | 140,272 | 74,174 |
| 1.2 Operations and equals | $0.0449 | 121,033 | 38,892 |
| 1.3 Clear and error state | $0.0395 | 108,356 | 41,030 |
| 1.4 Result formatting | $0.0599 | 151,850 | 56,751 |
| 2.1 Page and keypad (UI) | $0.1279 | 287,821 | 134,817 |
| 2.2 Wire it up (UI) | $0.0843 | 224,168 | 85,044 |

## By role (building only)

| Role | Cost | Fresh tokens |
|---|---:|---:|
| Tester (6 sessions) | $0.1704 | 384,888 |
| Reviewer (6 sessions) | $0.1486 | 371,631 |
| Implementer (6 sessions) | $0.0968 | 276,981 |
| Runner (main chats, build turns only) | $0.1701 | 294,441 |
| **Total** | **$0.5859** | **1,327,941** |

Not building, also in the main chats: GitHub Pages deploy $0.0204 (31,463 fresh), transcript
export $0.0610 (93,891 fresh).

## What a session pays before doing anything

Fresh sessions in copies of the finished calculator, first model call:

| Setup | Context at first call |
|---|---:|
| OpenCode alone, empty repo (includes this machine's global rules and skills) | 8,563 |
| The calculator with Groundwork removed | 8,564 |
| The calculator with Groundwork | 9,245 (+681) |
| Groundwork's tester subagent | 9,069 |

`npx groundwork-ai doctor` on the calculator: always loaded ≈479 tokens; a `/gw` start reads
≈1,473 of Groundwork's files; a role reads ≈1,117–1,522 before any code.

## Resuming: where does the project stand?

A fresh session in the finished calculator, asked where the project stands and what's next.

| | With Groundwork (`/gw`) | Groundwork removed |
|---|---:|---:|
| Model calls | 9 | 27 |
| Context at the last call | 24,881 | 61,785 |
| Fresh output + reasoning | 8,358 | 22,712 |
| Cost | $0.0086 | $0.0229 |
| Right answer | Yes: phase 2 built, waiting for the phase review | Rebuilt it from git history; also read folders outside the project |

One run each.

## Every session

Output of [`checks/session-costs.mjs`](../checks/session-costs.mjs) on the 20 exported sessions.
Main chats include the export and deploy turns; the per-turn tables separate them.

| Session | Agent | Calls | First context | Peak context | Context re-read | Fresh tokens | Reasoning | Cost |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Run gw command from .groundwork/commands/gw.md | build | 120 | 9,157 | 280,280 | 17,592,130 | 293,081 | 147,151 | $0.1856 |
| Write failing tests for 1.1 | gw-tester | 14 | 9,257 | 32,126 | 324,951 | 34,034 | 14,956 | $0.0142 |
| Build src/calc.js for card 1.1 | gw-implementer | 10 | 9,264 | 25,760 | 196,447 | 27,608 | 8,452 | $0.0099 |
| Review card 1.1 | gw-reviewer | 14 | 8,851 | 74,174 | 635,687 | 78,630 | 40,350 | $0.0352 |
| Write failing tests for 1.2 | gw-tester | 18 | 9,222 | 36,675 | 452,898 | 39,528 | 12,631 | $0.0147 |
| Implement operations for 1.2 | gw-implementer | 14 | 9,201 | 34,943 | 353,634 | 37,242 | 13,848 | $0.0142 |
| Review card 1.2 | gw-reviewer | 17 | 8,789 | 38,892 | 440,988 | 44,263 | 12,138 | $0.0160 |
| Write failing tests for 1.3 | gw-tester | 18 | 9,211 | 34,378 | 446,719 | 36,484 | 9,042 | $0.0126 |
| Implement error state for 1.3 | gw-implementer | 19 | 9,232 | 25,389 | 366,218 | 28,718 | 5,616 | $0.0095 |
| Review card 1.3 | gw-reviewer | 19 | 8,826 | 41,030 | 497,814 | 43,154 | 15,132 | $0.0174 |
| Write failing tests for 1.4 | gw-tester | 17 | 9,248 | 35,369 | 426,084 | 37,644 | 9,892 | $0.0129 |
| Implement formatting for 1.4 | gw-implementer | 19 | 9,317 | 43,162 | 545,561 | 54,649 | 18,846 | $0.0197 |
| Review card 1.4 | gw-reviewer | 17 | 8,851 | 56,751 | 612,405 | 59,557 | 31,490 | $0.0273 |
| Executing gw command from gw.md | build | 61 | 9,192 | 120,058 | 3,990,211 | 128,008 | 60,560 | $0.0663 |
| Tester: card 2.1 failing tests | gw-tester | 39 | 9,330 | 134,817 | 3,623,080 | 147,269 | 74,652 | $0.0751 |
| Implementer: card 2.1 | gw-implementer | 17 | 9,652 | 61,198 | 712,980 | 65,290 | 23,404 | $0.0251 |
| Reviewer: card 2.1 | gw-reviewer | 21 | 9,001 | 67,445 | 853,923 | 75,262 | 22,784 | $0.0277 |
| Tester: card 2.2 failing checks | gw-tester | 22 | 9,469 | 85,044 | 1,336,790 | 89,929 | 39,833 | $0.0409 |
| Implementer: card 2.2 | gw-implementer | 17 | 9,497 | 60,093 | 706,611 | 63,474 | 10,629 | $0.0184 |
| Reviewer: card 2.2 | gw-reviewer | 25 | 8,982 | 67,482 | 1,074,550 | 70,765 | 18,811 | $0.0250 |
| **Total** | | 518 | | | 35,189,681 | 1,454,589 | 590,217 | $0.6676 |

Run gw command from .groundwork/commands/gw.md, per human turn:

| Turn | Calls | Context at start → end | Fresh tokens | Cost |
|---|---:|---|---:|---:|
| Read `.groundwork/commands/gw.md` now and follow it exactly. | 5 | 9,157 → 15,031 | 15,626 | $0.0045 |
| We're building a calculator and no i haven't chosen a stack | 4 | 15,490 → 21,147 | 6,805 | $0.0033 |
| Read `.groundwork/commands/gw.md` now and follow it exactly. | 8 | 22,094 → 54,500 | 34,232 | $0.0194 |
| Lets init and then plan. Everything looks good so far | 13 | 55,407 → 102,571 | 48,897 | $0.0279 |
| go ahead with the commit. what's next? | 11 | 103,158 → 121,979 | 20,700 | $0.0129 |
| Read `.groundwork/commands/gw-approve.md` now and follow it  | 5 | 122,721 → 129,852 | 8,187 | $0.0060 |
| how many cards/phases left | 2 | 130,195 → 130,705 | 978 | $0.0012 |
| finish phase 1 as a whole right now | 27 | 130,994 → 170,315 | 43,058 | $0.0326 |
| Read `.groundwork/commands/gw-approve.md` now and follow it  | 5 | 171,618 → 177,922 | 7,307 | $0.0058 |
| Read `.groundwork/commands/gw-retro.md` now and follow it ex | 8 | 178,217 → 189,422 | 12,603 | $0.0107 |
| i will continue phase 2 in antoher chat but now i want a cou | 21 | 189,991 → 246,734 | 60,179 | $0.0366 |
| just finished second session gimme the prompt to make the se | 1 | 248,158 → 248,158 | 4,852 | $0.0036 |
| [Image 1]  | 10 | 252,996 → 280,280 | 28,860 | $0.0208 |

Executing gw command from gw.md, per human turn:

| Turn | Calls | Context at start → end | Fresh tokens | Cost |
|---|---:|---|---:|---:|
| Read `.groundwork/commands/gw.md` now and follow it exactly. | 40 | 9,192 → 81,251 | 87,011 | $0.0422 |
| can this deploy to github pages? https://github.com/ramesesb | 19 | 83,306 → 112,206 | 31,463 | $0.0204 |
| Read `.groundwork/commands/gw-approve.md` now and follow it  | 2 | 112,880 → 120,058 | 9,037 | $0.0036 |

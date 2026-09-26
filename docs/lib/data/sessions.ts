// All 20 sessions of the calculator run, generated from the "Every session" table in
// transcripts/measurements.md (output of checks/session-costs.mjs). Main chats include their
// export and deploy turns.

export type Session = {
  title: string;
  phase: number;
  card: string | null;
  role: 'runner' | 'tester' | 'implementer' | 'reviewer';
  calls: number;
  first: number;
  peak: number;
  reRead: number;
  fresh: number;
  reasoning: number;
  cost: number;
  path: string;
};

export const sessions: Session[] = [
  {
    title: "Run gw command from .groundwork/commands/gw.md",
    phase: 1,
    card: null,
    role: "runner",
    calls: 120,
    first: 9157,
    peak: 280280,
    reRead: 17592130,
    fresh: 293081,
    reasoning: 147151,
    cost: 0.1856,
    path: "transcripts/phase-1/main/transcript.md"
  },
  {
    title: "Write failing tests for 1.1",
    phase: 1,
    card: "1.1",
    role: "tester",
    calls: 14,
    first: 9257,
    peak: 32126,
    reRead: 324951,
    fresh: 34034,
    reasoning: 14956,
    cost: 0.0142,
    path: "transcripts/phase-1/subagents/1.1-tester/transcript.md"
  },
  {
    title: "Build src/calc.js for card 1.1",
    phase: 1,
    card: "1.1",
    role: "implementer",
    calls: 10,
    first: 9264,
    peak: 25760,
    reRead: 196447,
    fresh: 27608,
    reasoning: 8452,
    cost: 0.0099,
    path: "transcripts/phase-1/subagents/1.1-implementer/transcript.md"
  },
  {
    title: "Review card 1.1",
    phase: 1,
    card: "1.1",
    role: "reviewer",
    calls: 14,
    first: 8851,
    peak: 74174,
    reRead: 635687,
    fresh: 78630,
    reasoning: 40350,
    cost: 0.0352,
    path: "transcripts/phase-1/subagents/1.1-reviewer/transcript.md"
  },
  {
    title: "Write failing tests for 1.2",
    phase: 1,
    card: "1.2",
    role: "tester",
    calls: 18,
    first: 9222,
    peak: 36675,
    reRead: 452898,
    fresh: 39528,
    reasoning: 12631,
    cost: 0.0147,
    path: "transcripts/phase-1/subagents/1.2-tester/transcript.md"
  },
  {
    title: "Implement operations for 1.2",
    phase: 1,
    card: "1.2",
    role: "implementer",
    calls: 14,
    first: 9201,
    peak: 34943,
    reRead: 353634,
    fresh: 37242,
    reasoning: 13848,
    cost: 0.0142,
    path: "transcripts/phase-1/subagents/1.2-implementer/transcript.md"
  },
  {
    title: "Review card 1.2",
    phase: 1,
    card: "1.2",
    role: "reviewer",
    calls: 17,
    first: 8789,
    peak: 38892,
    reRead: 440988,
    fresh: 44263,
    reasoning: 12138,
    cost: 0.016,
    path: "transcripts/phase-1/subagents/1.2-reviewer/transcript.md"
  },
  {
    title: "Write failing tests for 1.3",
    phase: 1,
    card: "1.3",
    role: "tester",
    calls: 18,
    first: 9211,
    peak: 34378,
    reRead: 446719,
    fresh: 36484,
    reasoning: 9042,
    cost: 0.0126,
    path: "transcripts/phase-1/subagents/1.3-tester/transcript.md"
  },
  {
    title: "Implement error state for 1.3",
    phase: 1,
    card: "1.3",
    role: "implementer",
    calls: 19,
    first: 9232,
    peak: 25389,
    reRead: 366218,
    fresh: 28718,
    reasoning: 5616,
    cost: 0.0095,
    path: "transcripts/phase-1/subagents/1.3-implementer/transcript.md"
  },
  {
    title: "Review card 1.3",
    phase: 1,
    card: "1.3",
    role: "reviewer",
    calls: 19,
    first: 8826,
    peak: 41030,
    reRead: 497814,
    fresh: 43154,
    reasoning: 15132,
    cost: 0.0174,
    path: "transcripts/phase-1/subagents/1.3-reviewer/transcript.md"
  },
  {
    title: "Write failing tests for 1.4",
    phase: 1,
    card: "1.4",
    role: "tester",
    calls: 17,
    first: 9248,
    peak: 35369,
    reRead: 426084,
    fresh: 37644,
    reasoning: 9892,
    cost: 0.0129,
    path: "transcripts/phase-1/subagents/1.4-tester/transcript.md"
  },
  {
    title: "Implement formatting for 1.4",
    phase: 1,
    card: "1.4",
    role: "implementer",
    calls: 19,
    first: 9317,
    peak: 43162,
    reRead: 545561,
    fresh: 54649,
    reasoning: 18846,
    cost: 0.0197,
    path: "transcripts/phase-1/subagents/1.4-implementer/transcript.md"
  },
  {
    title: "Review card 1.4",
    phase: 1,
    card: "1.4",
    role: "reviewer",
    calls: 17,
    first: 8851,
    peak: 56751,
    reRead: 612405,
    fresh: 59557,
    reasoning: 31490,
    cost: 0.0273,
    path: "transcripts/phase-1/subagents/1.4-reviewer/transcript.md"
  },
  {
    title: "Executing gw command from gw.md",
    phase: 2,
    card: null,
    role: "runner",
    calls: 61,
    first: 9192,
    peak: 120058,
    reRead: 3990211,
    fresh: 128008,
    reasoning: 60560,
    cost: 0.0663,
    path: "transcripts/phase-2/main/transcript.md"
  },
  {
    title: "Tester: card 2.1 failing tests",
    phase: 2,
    card: "2.1",
    role: "tester",
    calls: 39,
    first: 9330,
    peak: 134817,
    reRead: 3623080,
    fresh: 147269,
    reasoning: 74652,
    cost: 0.0751,
    path: "transcripts/phase-2/subagents/2.1-tester/transcript.md"
  },
  {
    title: "Implementer: card 2.1",
    phase: 2,
    card: "2.1",
    role: "implementer",
    calls: 17,
    first: 9652,
    peak: 61198,
    reRead: 712980,
    fresh: 65290,
    reasoning: 23404,
    cost: 0.0251,
    path: "transcripts/phase-2/subagents/2.1-implementer/transcript.md"
  },
  {
    title: "Reviewer: card 2.1",
    phase: 2,
    card: "2.1",
    role: "reviewer",
    calls: 21,
    first: 9001,
    peak: 67445,
    reRead: 853923,
    fresh: 75262,
    reasoning: 22784,
    cost: 0.0277,
    path: "transcripts/phase-2/subagents/2.1-reviewer/transcript.md"
  },
  {
    title: "Tester: card 2.2 failing checks",
    phase: 2,
    card: "2.2",
    role: "tester",
    calls: 22,
    first: 9469,
    peak: 85044,
    reRead: 1336790,
    fresh: 89929,
    reasoning: 39833,
    cost: 0.0409,
    path: "transcripts/phase-2/subagents/2.2-tester/transcript.md"
  },
  {
    title: "Implementer: card 2.2",
    phase: 2,
    card: "2.2",
    role: "implementer",
    calls: 17,
    first: 9497,
    peak: 60093,
    reRead: 706611,
    fresh: 63474,
    reasoning: 10629,
    cost: 0.0184,
    path: "transcripts/phase-2/subagents/2.2-implementer/transcript.md"
  },
  {
    title: "Reviewer: card 2.2",
    phase: 2,
    card: "2.2",
    role: "reviewer",
    calls: 25,
    first: 8982,
    peak: 67482,
    reRead: 1074550,
    fresh: 70765,
    reasoning: 18811,
    cost: 0.025,
    path: "transcripts/phase-2/subagents/2.2-reviewer/transcript.md"
  }
];

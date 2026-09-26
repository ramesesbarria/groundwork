// The calculator run, as measured. Every figure here is copied from transcripts/measurements.md
// (OpenCode's per-call accounting, DeepSeek V4.1 Flash on max thinking, 2026-09-26). Change them
// there first; `source` points each figure back at its row.

import { blobUrl } from '@/lib/shared';

export const measurementsUrl = blobUrl('transcripts/measurements.md');
export const transcriptsUrl = blobUrl('transcripts/README.md');
export const appUrl = 'https://ramesesbarria.github.io/calculator-groundwork/';
export const appRepoUrl = 'https://github.com/ramesesbarria/calculator-groundwork';

export const model = 'DeepSeek V4.1 Flash (max thinking) in OpenCode 2.0.18';

export const headline = {
  buildCost: 0.586,
  freshTokens: 1_327_941,
  reasoningShare: 0.406,
  cards: 6,
  phases: 2,
  commits: 14,
  tests: 58,
  sessions: 20,
  roleSessions: 18,
  deployCost: 0.0204,
  exportCost: 0.061,
  reRead: 35_189_681,
};

export type CardCost = { id: string; title: string; cost: number; fresh: number; peak: number; ui?: boolean };

export const cards: CardCost[] = [
  { id: '1.1', title: 'Number entry', cost: 0.0593, fresh: 140_272, peak: 74_174 },
  { id: '1.2', title: 'Operations and equals', cost: 0.0449, fresh: 121_033, peak: 38_892 },
  { id: '1.3', title: 'Clear and error state', cost: 0.0395, fresh: 108_356, peak: 41_030 },
  { id: '1.4', title: 'Result formatting', cost: 0.0599, fresh: 151_850, peak: 56_751 },
  { id: '2.1', title: 'Page and keypad', cost: 0.1279, fresh: 287_821, peak: 134_817, ui: true },
  { id: '2.2', title: 'Wire it up', cost: 0.0843, fresh: 224_168, peak: 85_044, ui: true },
];

export const roles = [
  { role: 'Tester', sessions: 6, cost: 0.1704, fresh: 384_888 },
  { role: 'Reviewer', sessions: 6, cost: 0.1486, fresh: 371_631 },
  { role: 'Implementer', sessions: 6, cost: 0.0968, fresh: 276_981 },
  { role: 'Runner', sessions: 2, cost: 0.1701, fresh: 294_441 },
];

// Every role session, in run order: the context it started with and the largest it reached.
export type RoleSession = { card: string; role: 'tester' | 'implementer' | 'reviewer'; first: number; peak: number; cost: number };

export const roleSessions: RoleSession[] = [
  { card: '1.1', role: 'tester', first: 9_257, peak: 32_126, cost: 0.0142 },
  { card: '1.1', role: 'implementer', first: 9_264, peak: 25_760, cost: 0.0099 },
  { card: '1.1', role: 'reviewer', first: 8_851, peak: 74_174, cost: 0.0352 },
  { card: '1.2', role: 'tester', first: 9_222, peak: 36_675, cost: 0.0147 },
  { card: '1.2', role: 'implementer', first: 9_201, peak: 34_943, cost: 0.0142 },
  { card: '1.2', role: 'reviewer', first: 8_789, peak: 38_892, cost: 0.016 },
  { card: '1.3', role: 'tester', first: 9_211, peak: 34_378, cost: 0.0126 },
  { card: '1.3', role: 'implementer', first: 9_232, peak: 25_389, cost: 0.0095 },
  { card: '1.3', role: 'reviewer', first: 8_826, peak: 41_030, cost: 0.0174 },
  { card: '1.4', role: 'tester', first: 9_248, peak: 35_369, cost: 0.0129 },
  { card: '1.4', role: 'implementer', first: 9_317, peak: 43_162, cost: 0.0197 },
  { card: '1.4', role: 'reviewer', first: 8_851, peak: 56_751, cost: 0.0273 },
  { card: '2.1', role: 'tester', first: 9_330, peak: 134_817, cost: 0.0751 },
  { card: '2.1', role: 'implementer', first: 9_652, peak: 61_198, cost: 0.0251 },
  { card: '2.1', role: 'reviewer', first: 9_001, peak: 67_445, cost: 0.0277 },
  { card: '2.2', role: 'tester', first: 9_469, peak: 85_044, cost: 0.0409 },
  { card: '2.2', role: 'implementer', first: 9_497, peak: 60_093, cost: 0.0184 },
  { card: '2.2', role: 'reviewer', first: 8_982, peak: 67_482, cost: 0.025 },
];

// The phase 1 main chat (the runner), per human turn: context at the start and end of the turn.
export const runnerPhase1Turns = [
  { ask: '/gw', start: 9_157, end: 15_031 },
  { ask: 'building a calculator', start: 15_490, end: 21_147 },
  { ask: '/gw', start: 22_094, end: 54_500 },
  { ask: 'init, then plan', start: 55_407, end: 102_571 },
  { ask: 'commit; what’s next?', start: 103_158, end: 121_979 },
  { ask: '/gw-approve', start: 122_721, end: 129_852 },
  { ask: 'cards left?', start: 130_195, end: 130_705 },
  { ask: 'finish phase 1', start: 130_994, end: 170_315 },
  { ask: '/gw-approve', start: 171_618, end: 177_922 },
  { ask: '/gw-retro', start: 178_217, end: 189_422 },
  { ask: 'transcript export', start: 189_991, end: 246_734 },
  { ask: 'transcript export', start: 248_158, end: 248_158 },
  { ask: 'transcript export', start: 252_996, end: 280_280 },
];

// Context re-read by the three role sessions of each card, summed (measurements.md, Every session).
// 13,607,340 over 6 cards.
export const roleReReadPerCard = 13_607_340 / 6;

// The phase 1 main chat: every call re-sent the conversation so far.
export const phase1Main = { calls: 120, reRead: 17_592_130, fresh: 293_081 };

export const runner = {
  phase1Peak: 280_280,
  mainChatReRead: 21_600_000,
  mainChatShare: 0.61,
  phase2Start: 9_192,
  phase2WouldHaveStarted: 190_000,
  phase2Calls: 61,
  avoided: 11_000_000,
};

export const startup = {
  bare: 8_563,
  withoutGroundwork: 8_564,
  withGroundwork: 9_245,
  added: 681,
  tester: 9_069,
};

// Resuming: a fresh session asked where the project stands. `processed` sums input + cache read
// over every call (OpenCode's session store; added to measurements.md).
export const resume = {
  with: {
    calls: 9,
    toolCalls: 11,
    processed: 140_682,
    lastContext: 24_881,
    fresh: 8_358,
    cost: 0.0086,
    answer: 'Right: phase 2 built, waiting for the phase review.',
  },
  without: {
    calls: 27,
    toolCalls: 50,
    processed: 956_066,
    lastContext: 61_785,
    fresh: 22_712,
    cost: 0.0229,
    answer: 'Rebuilt it from git history, and read folders outside the project.',
  },
};

export const usd = (x: number, digits = 3) => `$${x.toFixed(digits)}`;
export const k = (x: number) => (x >= 1_000_000 ? `${(x / 1_000_000).toFixed(x >= 10_000_000 ? 0 : 2)}M` : `${(x / 1000).toFixed(x >= 100_000 ? 0 : 1)}k`);

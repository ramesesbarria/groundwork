// Shapes of Groundwork's files. The templates are tested against these.

export const CARD_FIELDS = ["id", "title", "phase", "status", "depends_on"] as const;

export const CARD_STATUSES = [
  "todo",
  "testing",
  "implementing",
  "built",
  "review",
  "awaiting-approval",
  "done",
  "rejected",
] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

// What people see. Card files keep the internal statuses; core/reference/statuses.md lists the same labels
// and core/hooks/session-start.mjs repeats them (it can't import from the CLI).
export const STATUS_LABELS: Record<CardStatus, string> = {
  todo: "to do",
  testing: "being tested",
  implementing: "being built",
  built: "built but not reviewed",
  review: "in review",
  "awaiting-approval": "waiting for you",
  done: "done",
  rejected: "sent back",
};

export const statusLabel = (status: string) => STATUS_LABELS[status as CardStatus] ?? status;

export const APPROVAL_MODES = ["per-card", "per-phase", "at-end"] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

// Allowed status changes. core/reference/statuses.md documents each one, core/guards/lib/cards.mjs
// enforces them, and tests keep all three in sync.
export const TRANSITIONS: ReadonlyArray<readonly [CardStatus, CardStatus]> = [
  ["todo", "testing"],
  ["testing", "implementing"],
  ["implementing", "review"],
  ["implementing", "testing"],
  ["review", "implementing"],
  ["review", "awaiting-approval"],
  ["review", "done"],
  ["awaiting-approval", "done"],
  ["awaiting-approval", "rejected"],
  ["done", "rejected"],
  ["rejected", "implementing"],
  // at-end mode: the runner builds each card itself, then one review covers them all.
  ["todo", "implementing"],
  ["implementing", "built"],
  ["built", "awaiting-approval"],
  ["built", "implementing"],
];

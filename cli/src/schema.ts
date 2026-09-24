// Shapes of Groundwork's files. Templates and SPEC §8 are tested against these.

export const CARD_FIELDS = ["id", "title", "phase", "status", "depends_on"] as const;

export const CARD_STATUSES = [
  "todo",
  "testing",
  "implementing",
  "review",
  "awaiting-approval",
  "done",
  "rejected",
] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const APPROVAL_MODES = ["per-card", "per-phase"] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

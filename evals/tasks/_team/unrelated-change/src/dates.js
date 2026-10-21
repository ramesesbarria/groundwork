// Small date helpers for upcoming features.

// "2026-10-19" -> "2026-10"
export const monthOf = (iso) => iso.slice(0, 7);

// "2026-10-19" -> 2026
export const yearOf = (iso) => Number(iso.slice(0, 4));

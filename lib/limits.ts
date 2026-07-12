// Shared per-note character caps. Kept framework-agnostic (no client/server-only
// imports) so both React components and server repos can enforce the same limits.

/** Max characters for a novel reading note. */
export const NOVEL_NOTE_MAX = 5000;

/** Max characters for a LeetCode per-problem note. */
export const LEETCODE_PROBLEM_NOTE_MAX = 5000;

/** Max characters for a LeetCode per-pattern note. */
export const LEETCODE_PATTERN_NOTE_MAX = 10000;

/** Clamp a string to a maximum length. Returns "" for non-string input. */
export function clampToLimit(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

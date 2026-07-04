// Local-first persistence for LeetCode solved-state.
// Kept fully separate from the novel tracker state (own STORAGE_KEY).
// Value shape: a map of problem key (`${patternId}:${index}`) -> true.

const STORAGE_KEY = "leetcode-tracker-local-first:v1";

export type SolvedMap = Record<string, boolean>;

export const emptySolved: SolvedMap = {};

export function normalizeSolved(input: unknown): SolvedMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return emptySolved;
  }

  const result: SolvedMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === true) {
      result[key] = true;
    }
  }
  return result;
}

export function loadSolved(): SolvedMap {
  if (typeof window === "undefined") return emptySolved;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySolved;
    return normalizeSolved(JSON.parse(raw));
  } catch {
    return emptySolved;
  }
}

export function saveSolved(solved: SolvedMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(solved));
}

// Local-first persistence for the LeetCode tracker.
// Kept fully separate from the novel tracker state (own STORAGE_KEY).
//
// State shape:
//   solved:        map of problem key (`${patternId}:${index}`) -> true
//   problemNotes:  map of problem key -> note text
//   patternNotes:  map of pattern id (as string) -> note text

const STORAGE_KEY = "leetcode-tracker-local-first:v1";

export type SolvedMap = Record<string, boolean>;
export type NotesMap = Record<string, string>;

export interface LeetcodeState {
  solved: SolvedMap;
  problemNotes: NotesMap;
  patternNotes: NotesMap;
}

export const emptyState: LeetcodeState = {
  solved: {},
  problemNotes: {},
  patternNotes: {}
};

function normalizeSolved(input: unknown): SolvedMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: SolvedMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === true) result[key] = true;
  }
  return result;
}

function normalizeNotes(input: unknown): NotesMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: NotesMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string" && value.length > 0) result[key] = value;
  }
  return result;
}

export function normalizeState(input: unknown): LeetcodeState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return emptyState;
  }

  const parsed = input as Record<string, unknown>;

  // New format: has a `solved` key.
  if ("solved" in parsed || "problemNotes" in parsed || "patternNotes" in parsed) {
    return {
      solved: normalizeSolved(parsed.solved),
      problemNotes: normalizeNotes(parsed.problemNotes),
      patternNotes: normalizeNotes(parsed.patternNotes)
    };
  }

  // Legacy format: the whole object was a flat solved map (`{ key: true }`).
  return {
    solved: normalizeSolved(parsed),
    problemNotes: {},
    patternNotes: {}
  };
}

export function loadState(): LeetcodeState {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState;
  }
}

export function saveState(state: LeetcodeState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLocalState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Merge anonymous local LeetCode progress into cloud progress on sign-in.
// Solved problems are unioned (a problem solved anywhere stays solved). For
// notes, a non-empty cloud note wins on conflict; otherwise the local note is
// kept, so nothing typed offline is lost.
function mergeNotes(local: NotesMap, cloud: NotesMap): NotesMap {
  const result: NotesMap = { ...local };
  for (const [key, note] of Object.entries(cloud)) {
    if (note && note.length > 0) result[key] = note;
  }
  return result;
}

export function mergeLeetcodeState(local: LeetcodeState, cloud: LeetcodeState): LeetcodeState {
  return {
    solved: { ...local.solved, ...cloud.solved },
    problemNotes: mergeNotes(local.problemNotes, cloud.problemNotes),
    patternNotes: mergeNotes(local.patternNotes, cloud.patternNotes)
  };
}

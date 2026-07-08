// Local-first persistence for the LeetCode tracker.
// Kept fully separate from the novel tracker state (own STORAGE_KEY).
//
// State shape:
//   solved:        map of problem key (`${patternId}:${index}`) -> true
//   solvedAt:      map of problem key -> ISO-8601 UTC timestamp of first solve
//   attempts:      map of problem key -> array of ISO-8601 UTC timestamps, one per
//                  recorded attempt (append-only; independent of solved status)
//   problemNotes:  map of problem key -> note text
//   patternNotes:  map of pattern id (as string) -> note text

const STORAGE_KEY = "leetcode-tracker-local-first:v1";

export type SolvedMap = Record<string, boolean>;
export type TimestampMap = Record<string, string>;
export type AttemptsMap = Record<string, string[]>;
export type NotesMap = Record<string, string>;

export interface LeetcodeState {
  solved: SolvedMap;
  solvedAt: TimestampMap;
  attempts: AttemptsMap;
  problemNotes: NotesMap;
  patternNotes: NotesMap;
}

export const emptyState: LeetcodeState = {
  solved: {},
  solvedAt: {},
  attempts: {},
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

// Accepts a map of problem key -> ISO timestamp. Values must be valid,
// non-empty strings that parse as dates; anything else is dropped.
function normalizeTimestamps(input: unknown, solved: SolvedMap): TimestampMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: TimestampMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string" || value.length === 0) continue;
    if (Number.isNaN(Date.parse(value))) continue;
    // Only keep timestamps for keys that are actually solved.
    if (solved[key]) result[key] = value;
  }
  return result;
}

// Accepts a map of problem key -> array of ISO timestamps (one per recorded
// attempt). Invalid/empty values are dropped; valid timestamps are deduped
// and sorted ascending (oldest attempt first). Independent of solved status
// -- a problem can have attempts recorded before it is ever solved.
function normalizeAttempts(input: unknown): AttemptsMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: AttemptsMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const seen = new Set<string>();
    for (const entry of value) {
      if (typeof entry !== "string" || entry.length === 0) continue;
      if (Number.isNaN(Date.parse(entry))) continue;
      seen.add(entry);
    }
    if (seen.size === 0) continue;
    result[key] = Array.from(seen).sort((a, b) => Date.parse(a) - Date.parse(b));
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
    const solved = normalizeSolved(parsed.solved);
    return {
      solved,
      solvedAt: normalizeTimestamps(parsed.solvedAt, solved),
      attempts: normalizeAttempts(parsed.attempts),
      problemNotes: normalizeNotes(parsed.problemNotes),
      patternNotes: normalizeNotes(parsed.patternNotes)
    };
  }

  // Legacy format: the whole object was a flat solved map (`{ key: true }`).
  return {
    solved: normalizeSolved(parsed),
    solvedAt: {},
    attempts: {},
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
  const solved = { ...local.solved, ...cloud.solved };

  // Keep the earliest known timestamp on conflict (first time the problem was
  // solved anywhere). Only retain timestamps for keys that end up solved.
  const solvedAt: TimestampMap = {};
  for (const [key, value] of Object.entries({ ...local.solvedAt, ...cloud.solvedAt })) {
    if (!solved[key]) continue;
    const localTs = local.solvedAt[key];
    const cloudTs = cloud.solvedAt[key];
    if (localTs && cloudTs) {
      solvedAt[key] = Date.parse(localTs) <= Date.parse(cloudTs) ? localTs : cloudTs;
    } else {
      solvedAt[key] = value;
    }
  }

  // Attempts are append-only history: union every recorded attempt timestamp
  // from both sides, deduped and sorted ascending.
  const attempts: AttemptsMap = {};
  const attemptKeys = new Set([...Object.keys(local.attempts), ...Object.keys(cloud.attempts)]);
  for (const key of attemptKeys) {
    const merged = new Set([...(local.attempts[key] ?? []), ...(cloud.attempts[key] ?? [])]);
    attempts[key] = Array.from(merged).sort((a, b) => Date.parse(a) - Date.parse(b));
  }

  return {
    solved,
    solvedAt,
    attempts,
    problemNotes: mergeNotes(local.problemNotes, cloud.problemNotes),
    patternNotes: mergeNotes(local.patternNotes, cloud.patternNotes)
  };
}

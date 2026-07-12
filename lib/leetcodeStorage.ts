// Local-first persistence for the LeetCode tracker.
// Kept fully separate from the novel tracker state (own STORAGE_KEY).
//
// State shape:
//   solved:        map of problem key (`${patternSlug}:${problemSlug}`) -> true
//   solvedAt:      map of problem key -> ISO-8601 UTC timestamp of first solve
//   attempts:      map of problem key -> array of ISO-8601 UTC timestamps, one per
//                  recorded attempt (append-only; independent of solved status)
//   problemNotes:  map of problem key -> note text
//   patternNotes:  map of pattern slug -> note text

import { LEGACY_PATTERN_ID_TO_SLUG, LEGACY_PROBLEM_KEY_TO_KEY } from "@/lib/leetcodeLegacyMap";

// Bumped to v2 when problem/pattern keys moved from the fragile order-based
// scheme (`${id}:${index}` / `${id}`) to order-independent slugs. Older
// payloads are migrated on load; see migrateLegacyKeys / loadState.
const STORAGE_KEY = "leetcode-tracker-local-first:v2";
const LEGACY_STORAGE_KEY = "leetcode-tracker-local-first:v1";

// Legacy problem keys look like `12:3`; legacy pattern-note keys look like `12`.
const LEGACY_PROBLEM_KEY = /^\d+:\d+$/;
const LEGACY_PATTERN_KEY = /^\d+$/;

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
  problemNotesUpdatedAt: TimestampMap;
  patternNotesUpdatedAt: TimestampMap;
}

export const emptyState: LeetcodeState = {
  solved: {},
  solvedAt: {},
  attempts: {},
  problemNotes: {},
  patternNotes: {},
  problemNotesUpdatedAt: {},
  patternNotesUpdatedAt: {}
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

// Accepts a map of key -> ISO timestamp for when a note was last saved. Only
// keeps timestamps for keys that still have a note; anything invalid is dropped.
function normalizeNoteTimestamps(input: unknown, notes: NotesMap): TimestampMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: TimestampMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string" || value.length === 0) continue;
    if (Number.isNaN(Date.parse(value))) continue;
    if (notes[key]) result[key] = value;
  }
  return result;
}

// Remap a legacy problem key (`${id}:${index}`) to its stable slug key. Keys
// already in the new format pass through untouched. Legacy-format keys with no
// mapping (e.g. a problem that was later removed) return null so callers can
// drop them. Idempotent: safe to run on already-migrated state.
function migrateProblemKey(key: string): string | null {
  if (!LEGACY_PROBLEM_KEY.test(key)) return key;
  return LEGACY_PROBLEM_KEY_TO_KEY[key] ?? null;
}

// Remap a legacy pattern-note key (`${id}`) to its slug. See migrateProblemKey.
function migratePatternKey(key: string): string | null {
  if (!LEGACY_PATTERN_KEY.test(key)) return key;
  return LEGACY_PATTERN_ID_TO_SLUG[key] ?? null;
}

// Rewrite the keys of every problem-keyed and pattern-keyed map from the legacy
// order-based scheme to order-independent slug keys. Runs inside normalizeState
// so both local loads and cloud reads/writes are migrated transparently.
export function migrateLegacyKeys(state: LeetcodeState): LeetcodeState {
  const solved: SolvedMap = {};
  for (const [key, value] of Object.entries(state.solved)) {
    const next = migrateProblemKey(key);
    if (next) solved[next] = value;
  }

  const solvedAt: TimestampMap = {};
  for (const [key, value] of Object.entries(state.solvedAt)) {
    const next = migrateProblemKey(key);
    if (next) solvedAt[next] = value;
  }

  const attempts: AttemptsMap = {};
  for (const [key, value] of Object.entries(state.attempts)) {
    const next = migrateProblemKey(key);
    if (next) attempts[next] = value;
  }

  const problemNotes: NotesMap = {};
  for (const [key, value] of Object.entries(state.problemNotes)) {
    const next = migrateProblemKey(key);
    if (next) problemNotes[next] = value;
  }

  const patternNotes: NotesMap = {};
  for (const [key, value] of Object.entries(state.patternNotes)) {
    const next = migratePatternKey(key);
    if (next) patternNotes[next] = value;
  }

  const problemNotesUpdatedAt: TimestampMap = {};
  for (const [key, value] of Object.entries(state.problemNotesUpdatedAt)) {
    const next = migrateProblemKey(key);
    if (next && problemNotes[next]) problemNotesUpdatedAt[next] = value;
  }

  const patternNotesUpdatedAt: TimestampMap = {};
  for (const [key, value] of Object.entries(state.patternNotesUpdatedAt)) {
    const next = migratePatternKey(key);
    if (next && patternNotes[next]) patternNotesUpdatedAt[next] = value;
  }

  return { solved, solvedAt, attempts, problemNotes, patternNotes, problemNotesUpdatedAt, patternNotesUpdatedAt };
}

export function normalizeState(input: unknown): LeetcodeState {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return emptyState;
  }

  const parsed = input as Record<string, unknown>;

  // New format: has a `solved` key.
  if ("solved" in parsed || "problemNotes" in parsed || "patternNotes" in parsed) {
    const solved = normalizeSolved(parsed.solved);
    const problemNotes = normalizeNotes(parsed.problemNotes);
    const patternNotes = normalizeNotes(parsed.patternNotes);
    return migrateLegacyKeys({
      solved,
      solvedAt: normalizeTimestamps(parsed.solvedAt, solved),
      attempts: normalizeAttempts(parsed.attempts),
      problemNotes,
      patternNotes,
      problemNotesUpdatedAt: normalizeNoteTimestamps(parsed.problemNotesUpdatedAt, problemNotes),
      patternNotesUpdatedAt: normalizeNoteTimestamps(parsed.patternNotesUpdatedAt, patternNotes)
    });
  }

  // Legacy format: the whole object was a flat solved map (`{ key: true }`).
  return migrateLegacyKeys({
    solved: normalizeSolved(parsed),
    solvedAt: {},
    attempts: {},
    problemNotes: {},
    patternNotes: {},
    problemNotesUpdatedAt: {},
    patternNotesUpdatedAt: {}
  });
}

export function loadState(): LeetcodeState {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    // One-time migration of pre-slug (v1) local data. normalizeState remaps the
    // legacy keys; we persist under the v2 key and drop the old entry so this
    // only runs once.
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = normalizeState(JSON.parse(legacyRaw));
      saveState(migrated);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }

    return emptyState;
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

// Keep the most recent save timestamp on conflict, but only for keys that still
// have a note after merging.
function mergeNoteTimestamps(local: TimestampMap, cloud: TimestampMap, notes: NotesMap): TimestampMap {
  const result: TimestampMap = {};
  for (const key of Object.keys(notes)) {
    const localTs = local[key];
    const cloudTs = cloud[key];
    if (localTs && cloudTs) {
      result[key] = Date.parse(localTs) >= Date.parse(cloudTs) ? localTs : cloudTs;
    } else if (localTs || cloudTs) {
      result[key] = localTs ?? cloudTs;
    }
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

  const problemNotes = mergeNotes(local.problemNotes, cloud.problemNotes);
  const patternNotes = mergeNotes(local.patternNotes, cloud.patternNotes);

  return {
    solved,
    solvedAt,
    attempts,
    problemNotes,
    patternNotes,
    problemNotesUpdatedAt: mergeNoteTimestamps(
      local.problemNotesUpdatedAt,
      cloud.problemNotesUpdatedAt,
      problemNotes
    ),
    patternNotesUpdatedAt: mergeNoteTimestamps(
      local.patternNotesUpdatedAt,
      cloud.patternNotesUpdatedAt,
      patternNotes
    )
  };
}

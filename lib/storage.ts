import type { TrackerState } from "@/lib/types";

const STORAGE_KEY = "novel-tracker-local-first:v1";

export const emptyState: TrackerState = {
  novels: [],
  notes: [],
  words: [],
  characters: [],
  checkIns: {}
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeTrackerState(input: unknown): TrackerState {
  if (!input || typeof input !== "object") {
    return emptyState;
  }

  const parsed = input as Partial<TrackerState>;
  return {
    novels: asArray(parsed.novels),
    notes: asArray(parsed.notes),
    words: asArray(parsed.words),
    characters: asArray(parsed.characters),
    checkIns:
      parsed.checkIns && typeof parsed.checkIns === "object" && !Array.isArray(parsed.checkIns)
        ? (parsed.checkIns as TrackerState["checkIns"])
        : {}
  };
}

export function loadTrackerState(): TrackerState {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    return normalizeTrackerState(parsed);
  } catch {
    return emptyState;
  }
}

export function saveTrackerState(state: TrackerState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

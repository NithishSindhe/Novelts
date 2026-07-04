import type { CheckInRecord, TrackerState } from "@/lib/types";

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

export function clearLocalTrackerState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Union two id-keyed entity lists, keeping every unique id. On id collision the
// cloud copy wins, but any "deleted" tag from either side is preserved so a
// delete performed on one device is not resurrected by the other.
function mergeById<T extends { id: string; tags?: string[] }>(local: T[], cloud: T[]): T[] {
  const byId = new Map<string, T>();

  for (const item of local) {
    byId.set(item.id, item);
  }

  for (const item of cloud) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const tags = Array.from(new Set([...(existing.tags ?? []), ...(item.tags ?? [])]));
    byId.set(item.id, { ...item, tags });
  }

  return Array.from(byId.values());
}

// Merge anonymous local data into cloud data on sign-in. Nothing is lost:
// entities are unioned by id and check-ins are unioned by date (with their
// sources combined). Cloud is treated as the base for field-level conflicts.
export function mergeTrackerState(local: TrackerState, cloud: TrackerState): TrackerState {
  const checkIns: Record<string, CheckInRecord> = { ...cloud.checkIns };

  for (const [date, record] of Object.entries(local.checkIns)) {
    const existing = checkIns[date];
    if (!existing) {
      checkIns[date] = record;
      continue;
    }
    checkIns[date] = {
      date,
      sources: Array.from(new Set([...existing.sources, ...record.sources])),
      createdAt: existing.createdAt ?? record.createdAt
    };
  }

  return {
    novels: mergeById(local.novels, cloud.novels),
    notes: mergeById(local.notes, cloud.notes),
    words: mergeById(local.words, cloud.words),
    characters: mergeById(local.characters, cloud.characters),
    checkIns
  };
}

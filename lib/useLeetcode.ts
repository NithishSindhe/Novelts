"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markCheckIn } from "@/lib/checkinClient";
import { todayDateId } from "@/lib/date";
import { clampToLimit, LEETCODE_PATTERN_NOTE_MAX, LEETCODE_PROBLEM_NOTE_MAX } from "@/lib/limits";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS } from "@/lib/leetcodeData";
import {
  emptyState,
  isNoteUnsynced,
  loadState,
  mergeLeetcodeState,
  normalizeState,
  saveState,
  type LeetcodeState
} from "@/lib/leetcodeStorage";

type SyncMode = "local" | "cloud";
export type SyncStatus = "local" | "syncing" | "synced" | "error";
export type NoteSaveState = "saving" | "error";
export type LeetcodeNoteKind = "problem" | "pattern";

// Retry policy for the per-note cloud save (matches the novel-notes feature):
// three attempts with linear backoff, then surface a failure to the user.
const NOTE_SAVE_ATTEMPTS = 3;
const NOTE_SAVE_BACKOFF_MS = 400;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A note returned by the server is, by definition, saved: stamp its syncedAt
// equal to its updatedAt so it is not falsely flagged "not saved to cloud".
function stampCloudSynced(state: LeetcodeState): LeetcodeState {
  return {
    ...state,
    problemNotesSyncedAt: { ...state.problemNotesUpdatedAt },
    patternNotesSyncedAt: { ...state.patternNotesUpdatedAt }
  };
}

// Signature of the cloud-synced-via-whole-state entities (solved/attempts).
// Notes are deliberately excluded so typing a note never triggers a whole-state
// PUT; notes sync only through the per-note endpoint.
function syncSignature(state: LeetcodeState): string {
  return JSON.stringify({ solved: state.solved, solvedAt: state.solvedAt, attempts: state.attempts });
}

export interface PatternProgress {
  solved: number;
  total: number;
}

export function useLeetcode() {
  const { isLoaded: authLoaded, userId: clerkUserId } = useAuth();
  const devUserId =
    process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_DEV_CLOUD_USER_ID ?? null : null;
  const userId = clerkUserId ?? devUserId;

  const [state, setState] = useState<LeetcodeState>(emptyState);
  const [ready, setReady] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode>("local");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  // Per-note save UI state, keyed by `${kind}:${key}` -> "saving" | "error".
  const [noteSaveState, setNoteSaveState] = useState<Record<string, NoteSaveState>>({});
  const cloudUserIdRef = useRef<string | null>(null);
  // Mirror of the latest state so async save handlers read fresh notes without
  // being re-created on every keystroke.
  const stateRef = useRef<LeetcodeState>(state);
  stateRef.current = state;
  // Signature of the last solved/attempts payload pushed to the cloud, used to
  // skip redundant whole-state PUTs (e.g. when only a note changed).
  const lastSyncSignatureRef = useRef<string | null>(null);
  // Guards the one-time post-sign-in auto-push of never-synced notes.
  const autoSyncedNotesRef = useRef(false);
  // Avoid spamming /api/checkin with repeat calls for the same day/kind
  // within a session; the endpoint itself is idempotent regardless.
  const checkedInRef = useRef<Set<string>>(new Set());

  const isSignedIn = Boolean(userId);

  const checkInFromLeetcode = useCallback(
    (kind: "leetcode_solved" | "leetcode_attempt", key: string) => {
      if (syncMode !== "cloud" || !cloudUserIdRef.current) return;
      const date = todayDateId();
      const dedupeKey = `${date}:${kind}:${key}`;
      if (checkedInRef.current.has(dedupeKey)) return;
      checkedInRef.current.add(dedupeKey);
      void markCheckIn({ date, source: "leetcode", kind, refKey: key });
    },
    [syncMode]
  );

  useEffect(() => {
    if (!authLoaded) return;

    let cancelled = false;

    async function loadInitialState() {
      setReady(false);
      autoSyncedNotesRef.current = false;
      lastSyncSignatureRef.current = null;

      if (userId) {
        setSyncMode("cloud");
        setSyncStatus("syncing");
        cloudUserIdRef.current = userId;

        const localState = loadState();
        const hasLocalData =
          Object.keys(localState.solved).length > 0 ||
          Object.keys(localState.attempts).length > 0 ||
          Object.keys(localState.problemNotes).length > 0 ||
          Object.keys(localState.patternNotes).length > 0;

        try {
          const cloudResponse = await fetch("/api/leetcode", { cache: "no-store" });
          if (cloudResponse.ok) {
            const payload = (await cloudResponse.json()) as { state?: unknown };
            const cloudState = stampCloudSynced(normalizeState(payload.state));
            const merged = hasLocalData ? mergeLeetcodeState(localState, cloudState) : cloudState;

            if (!cancelled) {
              setState(merged);
              setSyncStatus("synced");
            }
          } else if (!cancelled) {
            setState(emptyState);
            setSyncStatus("error");
          }
        } catch {
          if (!cancelled) {
            setState(emptyState);
            setSyncStatus("error");
          }
        }

        if (!cancelled) setReady(true);
        return;
      }

      if (cancelled) return;

      setSyncMode("local");
      setSyncStatus("local");
      cloudUserIdRef.current = null;
      setState(loadState());
      setReady(true);
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, userId]);

  useEffect(() => {
    if (!ready) return;

    // Local-first: always persist the full state (including notes) to the local
    // buffer so a refresh never loses in-progress typing, even when signed in.
    saveState(state);

    if (syncMode !== "cloud" || !cloudUserIdRef.current) return;

    // Only push to the cloud when the whole-state-synced entities changed.
    // Notes are excluded from this signature and sync via the per-note endpoint,
    // so typing a note no longer triggers a PUT that could clobber cloud notes.
    const signature = syncSignature(state);
    if (signature === lastSyncSignatureRef.current) return;
    lastSyncSignatureRef.current = signature;

    setSyncStatus("syncing");
    void fetch("/api/leetcode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state })
    })
      .then((response) => {
        setSyncStatus(response.ok ? "synced" : "error");
      })
      .catch(() => {
        // Non-fatal; retry on the next change.
        lastSyncSignatureRef.current = null;
        setSyncStatus("error");
      });
  }, [state, ready, syncMode]);

  const toggle = useCallback(
    (key: string) => {
      let becameSolved = false;
      setState((current) => {
        const solved = { ...current.solved };
        const solvedAt = { ...current.solvedAt };
        if (solved[key]) {
          delete solved[key];
          delete solvedAt[key];
        } else {
          solved[key] = true;
          solvedAt[key] = new Date().toISOString();
          becameSolved = true;
        }
        return { ...current, solved, solvedAt };
      });
      if (becameSolved) {
        checkInFromLeetcode("leetcode_solved", key);
      }
    },
    [checkInFromLeetcode]
  );

  const isSolved = useCallback((key: string) => Boolean(state.solved[key]), [state.solved]);

  const getSolvedAt = useCallback((key: string) => state.solvedAt[key] ?? "", [state.solvedAt]);

  // Records a new attempt timestamp for a problem. Append-only: existing
  // attempts are never modified or removed.
  const recordAttempt = useCallback(
    (key: string) => {
      setState((current) => {
        const attempts = { ...current.attempts };
        const existing = attempts[key] ?? [];
        attempts[key] = [...existing, new Date().toISOString()];
        return { ...current, attempts };
      });
      checkInFromLeetcode("leetcode_attempt", key);
    },
    [checkInFromLeetcode]
  );

  const getAttempts = useCallback((key: string) => state.attempts[key] ?? [], [state.attempts]);

  // Low-level per-note cloud save with retry. An empty note deletes the row
  // server-side. Returns true on success. Never throws.
  const postNoteToCloud = useCallback(
    async (kind: LeetcodeNoteKind, key: string, note: string, updatedAt: string): Promise<boolean> => {
      for (let attempt = 0; attempt < NOTE_SAVE_ATTEMPTS; attempt++) {
        try {
          const response = await fetch("/api/leetcode/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, key, note, updatedAt })
          });
          if (response.ok) return true;
        } catch {
          // fall through to retry
        }
        if (attempt < NOTE_SAVE_ATTEMPTS - 1) {
          await delay(NOTE_SAVE_BACKOFF_MS * (attempt + 1));
        }
      }
      return false;
    },
    []
  );

  const saveProblemNoteToCloud = useCallback(
    async (key: string): Promise<boolean> => {
      if (syncMode !== "cloud" || !cloudUserIdRef.current) return false;
      const note = stateRef.current.problemNotes[key] ?? "";
      const updatedAt = stateRef.current.problemNotesUpdatedAt[key] ?? new Date().toISOString();
      const saveKey = `problem:${key}`;
      setNoteSaveState((current) => ({ ...current, [saveKey]: "saving" }));
      const ok = await postNoteToCloud("problem", key, note, updatedAt);
      setNoteSaveState((current) => {
        const next = { ...current };
        if (ok) delete next[saveKey];
        else next[saveKey] = "error";
        return next;
      });
      if (ok) {
        setState((current) => ({
          ...current,
          problemNotesSyncedAt: { ...current.problemNotesSyncedAt, [key]: updatedAt }
        }));
      }
      return ok;
    },
    [postNoteToCloud, syncMode]
  );

  const savePatternNoteToCloud = useCallback(
    async (patternKey: string): Promise<boolean> => {
      if (syncMode !== "cloud" || !cloudUserIdRef.current) return false;
      const note = stateRef.current.patternNotes[patternKey] ?? "";
      const updatedAt = stateRef.current.patternNotesUpdatedAt[patternKey] ?? new Date().toISOString();
      const saveKey = `pattern:${patternKey}`;
      setNoteSaveState((current) => ({ ...current, [saveKey]: "saving" }));
      const ok = await postNoteToCloud("pattern", patternKey, note, updatedAt);
      setNoteSaveState((current) => {
        const next = { ...current };
        if (ok) delete next[saveKey];
        else next[saveKey] = "error";
        return next;
      });
      if (ok) {
        setState((current) => ({
          ...current,
          patternNotesSyncedAt: { ...current.patternNotesSyncedAt, [patternKey]: updatedAt }
        }));
      }
      return ok;
    },
    [postNoteToCloud, syncMode]
  );

  // Push every note with unsynced local edits. Also backs the one-time
  // post-sign-in auto-sync of notes that were typed while anonymous.
  const saveAllNotesToCloud = useCallback(async (): Promise<boolean> => {
    if (syncMode !== "cloud" || !cloudUserIdRef.current) return false;
    const current = stateRef.current;
    const problemKeys = Object.keys(current.problemNotes).filter((key) =>
      isNoteUnsynced(current.problemNotesUpdatedAt[key], current.problemNotesSyncedAt[key])
    );
    const patternKeys = Object.keys(current.patternNotes).filter((key) =>
      isNoteUnsynced(current.patternNotesUpdatedAt[key], current.patternNotesSyncedAt[key])
    );
    const results = await Promise.all([
      ...problemKeys.map((key) => saveProblemNoteToCloud(key)),
      ...patternKeys.map((key) => savePatternNoteToCloud(key))
    ]);
    return results.every(Boolean);
  }, [saveProblemNoteToCloud, savePatternNoteToCloud, syncMode]);

  const setProblemNote = useCallback(
    (key: string, note: string) => {
      const hadNote = Boolean(stateRef.current.problemNotes[key]);
      const clamped = clampToLimit(note, LEETCODE_PROBLEM_NOTE_MAX);
      const cleared = clamped.trim().length === 0;
      setState((current) => {
        const problemNotes = { ...current.problemNotes };
        const problemNotesUpdatedAt = { ...current.problemNotesUpdatedAt };
        const problemNotesSyncedAt = { ...current.problemNotesSyncedAt };
        if (!cleared) {
          problemNotes[key] = clamped;
          problemNotesUpdatedAt[key] = new Date().toISOString();
        } else {
          delete problemNotes[key];
          delete problemNotesUpdatedAt[key];
          delete problemNotesSyncedAt[key];
        }
        return { ...current, problemNotes, problemNotesUpdatedAt, problemNotesSyncedAt };
      });
      // Clearing a note removes it from the cloud immediately (a cleared editor
      // has nothing left to "Save"). Fire-and-forget with the same retry policy.
      if (cleared && hadNote && syncMode === "cloud") {
        void postNoteToCloud("problem", key, "", new Date().toISOString());
        setNoteSaveState((current) => {
          const next = { ...current };
          delete next[`problem:${key}`];
          return next;
        });
      }
    },
    [postNoteToCloud, syncMode]
  );

  const setPatternNote = useCallback(
    (patternKey: string, note: string) => {
      const hadNote = Boolean(stateRef.current.patternNotes[patternKey]);
      const clamped = clampToLimit(note, LEETCODE_PATTERN_NOTE_MAX);
      const cleared = clamped.trim().length === 0;
      setState((current) => {
        const patternNotes = { ...current.patternNotes };
        const patternNotesUpdatedAt = { ...current.patternNotesUpdatedAt };
        const patternNotesSyncedAt = { ...current.patternNotesSyncedAt };
        if (!cleared) {
          patternNotes[patternKey] = clamped;
          patternNotesUpdatedAt[patternKey] = new Date().toISOString();
        } else {
          delete patternNotes[patternKey];
          delete patternNotesUpdatedAt[patternKey];
          delete patternNotesSyncedAt[patternKey];
        }
        return { ...current, patternNotes, patternNotesUpdatedAt, patternNotesSyncedAt };
      });
      if (cleared && hadNote && syncMode === "cloud") {
        void postNoteToCloud("pattern", patternKey, "", new Date().toISOString());
        setNoteSaveState((current) => {
          const next = { ...current };
          delete next[`pattern:${patternKey}`];
          return next;
        });
      }
    },
    [postNoteToCloud, syncMode]
  );

  const getProblemNote = useCallback((key: string) => state.problemNotes[key] ?? "", [state.problemNotes]);
  const getPatternNote = useCallback(
    (patternKey: string) => state.patternNotes[patternKey] ?? "",
    [state.patternNotes]
  );

  // A note is "not saved to cloud" only for signed-in users; anonymous users
  // have nowhere to sync, so the badge/count stay hidden.
  const isProblemNoteUnsynced = useCallback(
    (key: string) =>
      syncMode === "cloud" &&
      isNoteUnsynced(state.problemNotesUpdatedAt[key], state.problemNotesSyncedAt[key]),
    [syncMode, state.problemNotesUpdatedAt, state.problemNotesSyncedAt]
  );

  const isPatternNoteUnsynced = useCallback(
    (patternKey: string) =>
      syncMode === "cloud" &&
      isNoteUnsynced(state.patternNotesUpdatedAt[patternKey], state.patternNotesSyncedAt[patternKey]),
    [syncMode, state.patternNotesUpdatedAt, state.patternNotesSyncedAt]
  );

  const getNoteSaveState = useCallback(
    (kind: LeetcodeNoteKind, key: string): NoteSaveState | undefined => noteSaveState[`${kind}:${key}`],
    [noteSaveState]
  );

  const unsyncedNoteCount = useMemo(() => {
    if (syncMode !== "cloud") return 0;
    let count = 0;
    for (const key of Object.keys(state.problemNotes)) {
      if (isNoteUnsynced(state.problemNotesUpdatedAt[key], state.problemNotesSyncedAt[key])) count++;
    }
    for (const key of Object.keys(state.patternNotes)) {
      if (isNoteUnsynced(state.patternNotesUpdatedAt[key], state.patternNotesSyncedAt[key])) count++;
    }
    return count;
  }, [
    syncMode,
    state.problemNotes,
    state.patternNotes,
    state.problemNotesUpdatedAt,
    state.patternNotesUpdatedAt,
    state.problemNotesSyncedAt,
    state.patternNotesSyncedAt
  ]);

  // One-time post-sign-in auto-push of notes typed while anonymous (or otherwise
  // never synced). The whole-state PUT no longer persists notes, so this is what
  // moves offline notes into the cloud after a merge. Declared after
  // saveAllNotesToCloud to avoid a temporal-dead-zone reference.
  useEffect(() => {
    if (!ready || syncMode !== "cloud" || !cloudUserIdRef.current) return;
    if (autoSyncedNotesRef.current) return;
    autoSyncedNotesRef.current = true;
    void saveAllNotesToCloud();
  }, [ready, syncMode, saveAllNotesToCloud]);

  const solvedCount = useMemo(() => Object.keys(state.solved).length, [state.solved]);

  const patternProgress = useMemo(() => {
    const map: Record<number, PatternProgress> = {};
    for (const pattern of LEETCODE_PATTERNS) {
      const count = pattern.problems.reduce((sum, problem) => sum + (state.solved[problem.key] ? 1 : 0), 0);
      map[pattern.id] = { solved: count, total: pattern.problems.length };
    }
    return map;
  }, [state.solved]);

  // Per-pattern count of problems that have at least one recorded attempt but
  // are not yet solved ("attempting").
  const patternAttempting = useMemo(() => {
    const map: Record<number, number> = {};
    for (const pattern of LEETCODE_PATTERNS) {
      const count = pattern.problems.reduce((sum, problem) => {
        const attempts = state.attempts[problem.key];
        const isAttempting = Boolean(attempts && attempts.length > 0) && !state.solved[problem.key];
        return sum + (isAttempting ? 1 : 0);
      }, 0);
      map[pattern.id] = count;
    }
    return map;
  }, [state.attempts, state.solved]);

  return {
    ready,
    isSolved,
    getSolvedAt,
    toggle,
    recordAttempt,
    getAttempts,
    solvedCount,
    totalCount: TOTAL_PROBLEMS,
    patternProgress,
    patternAttempting,
    getProblemNote,
    setProblemNote,
    getPatternNote,
    setPatternNote,
    saveProblemNoteToCloud,
    savePatternNoteToCloud,
    saveAllNotesToCloud,
    isProblemNoteUnsynced,
    isPatternNoteUnsynced,
    getNoteSaveState,
    unsyncedNoteCount,
    syncStatus,
    isSignedIn
  };
}

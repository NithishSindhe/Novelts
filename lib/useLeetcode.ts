"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markCheckIn } from "@/lib/checkinClient";
import { todayDateId } from "@/lib/date";
import { clampToLimit, LEETCODE_PATTERN_NOTE_MAX, LEETCODE_PROBLEM_NOTE_MAX } from "@/lib/limits";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS } from "@/lib/leetcodeData";
import {
  clearLocalState,
  emptyState,
  loadState,
  mergeLeetcodeState,
  normalizeState,
  saveState,
  type LeetcodeState
} from "@/lib/leetcodeStorage";

type SyncMode = "local" | "cloud";
export type SyncStatus = "local" | "syncing" | "synced" | "error";

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
  const cloudUserIdRef = useRef<string | null>(null);
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
            const cloudState = normalizeState(payload.state);
            const merged = hasLocalData ? mergeLeetcodeState(localState, cloudState) : cloudState;

            if (!cancelled) setState(merged);

            if (hasLocalData) {
              try {
                await fetch("/api/leetcode", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ state: merged })
                });
                clearLocalState();
                if (!cancelled) setSyncStatus("synced");
              } catch {
                // Keep local data; the change effect will retry the sync.
                if (!cancelled) setSyncStatus("error");
              }
            } else if (!cancelled) {
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

    if (syncMode === "cloud" && cloudUserIdRef.current) {
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
          // Non-fatal; the next change will retry.
          setSyncStatus("error");
        });
      return;
    }

    saveState(state);
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

  const setProblemNote = useCallback((key: string, note: string) => {
    setState((current) => {
      const problemNotes = { ...current.problemNotes };
      const problemNotesUpdatedAt = { ...current.problemNotesUpdatedAt };
      const clamped = clampToLimit(note, LEETCODE_PROBLEM_NOTE_MAX);
      const trimmed = clamped.trim();
      if (trimmed) {
        problemNotes[key] = clamped;
        problemNotesUpdatedAt[key] = new Date().toISOString();
      } else {
        delete problemNotes[key];
        delete problemNotesUpdatedAt[key];
      }
      return { ...current, problemNotes, problemNotesUpdatedAt };
    });
  }, []);

  const setPatternNote = useCallback((patternKey: string, note: string) => {
    setState((current) => {
      const patternNotes = { ...current.patternNotes };
      const patternNotesUpdatedAt = { ...current.patternNotesUpdatedAt };
      const clamped = clampToLimit(note, LEETCODE_PATTERN_NOTE_MAX);
      const trimmed = clamped.trim();
      if (trimmed) {
        patternNotes[patternKey] = clamped;
        patternNotesUpdatedAt[patternKey] = new Date().toISOString();
      } else {
        delete patternNotes[patternKey];
        delete patternNotesUpdatedAt[patternKey];
      }
      return { ...current, patternNotes, patternNotesUpdatedAt };
    });
  }, []);

  const getProblemNote = useCallback((key: string) => state.problemNotes[key] ?? "", [state.problemNotes]);
  const getPatternNote = useCallback(
    (patternKey: string) => state.patternNotes[patternKey] ?? "",
    [state.patternNotes]
  );

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
    syncStatus,
    isSignedIn
  };
}

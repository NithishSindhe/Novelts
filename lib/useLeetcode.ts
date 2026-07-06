"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const cloudUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoaded) return;

    let cancelled = false;

    async function loadInitialState() {
      setReady(false);

      if (userId) {
        setSyncMode("cloud");
        cloudUserIdRef.current = userId;

        const localState = loadState();
        const hasLocalData =
          Object.keys(localState.solved).length > 0 ||
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
              } catch {
                // Keep local data; the change effect will retry the sync.
              }
            }
          } else if (!cancelled) {
            setState(emptyState);
          }
        } catch {
          if (!cancelled) setState(emptyState);
        }

        if (!cancelled) setReady(true);
        return;
      }

      if (cancelled) return;

      setSyncMode("local");
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
      void fetch("/api/leetcode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      }).catch(() => {
        // Non-fatal; the next change will retry.
      });
      return;
    }

    saveState(state);
  }, [state, ready, syncMode]);

  const toggle = useCallback((key: string) => {
    setState((current) => {
      const solved = { ...current.solved };
      const solvedAt = { ...current.solvedAt };
      if (solved[key]) {
        delete solved[key];
        delete solvedAt[key];
      } else {
        solved[key] = true;
        solvedAt[key] = new Date().toISOString();
      }
      return { ...current, solved, solvedAt };
    });
  }, []);

  const isSolved = useCallback((key: string) => Boolean(state.solved[key]), [state.solved]);

  const getSolvedAt = useCallback((key: string) => state.solvedAt[key] ?? "", [state.solvedAt]);

  const setProblemNote = useCallback((key: string, note: string) => {
    setState((current) => {
      const problemNotes = { ...current.problemNotes };
      const trimmed = note.trim();
      if (trimmed) {
        problemNotes[key] = note;
      } else {
        delete problemNotes[key];
      }
      return { ...current, problemNotes };
    });
  }, []);

  const setPatternNote = useCallback((patternId: number, note: string) => {
    setState((current) => {
      const patternNotes = { ...current.patternNotes };
      const trimmed = note.trim();
      if (trimmed) {
        patternNotes[String(patternId)] = note;
      } else {
        delete patternNotes[String(patternId)];
      }
      return { ...current, patternNotes };
    });
  }, []);

  const getProblemNote = useCallback((key: string) => state.problemNotes[key] ?? "", [state.problemNotes]);
  const getPatternNote = useCallback(
    (patternId: number) => state.patternNotes[String(patternId)] ?? "",
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

  return {
    ready,
    isSolved,
    getSolvedAt,
    toggle,
    solvedCount,
    totalCount: TOTAL_PROBLEMS,
    patternProgress,
    getProblemNote,
    setProblemNote,
    getPatternNote,
    setPatternNote
  };
}

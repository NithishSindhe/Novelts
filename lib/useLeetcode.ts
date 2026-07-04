"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS } from "@/lib/leetcodeData";
import { emptySolved, loadSolved, saveSolved, type SolvedMap } from "@/lib/leetcodeStorage";

export interface PatternProgress {
  solved: number;
  total: number;
}

export function useLeetcode() {
  const [solved, setSolved] = useState<SolvedMap>(emptySolved);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSolved(loadSolved());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveSolved(solved);
  }, [solved, ready]);

  const toggle = useCallback((key: string) => {
    setSolved((current) => {
      const next = { ...current };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }, []);

  const isSolved = useCallback((key: string) => Boolean(solved[key]), [solved]);

  const solvedCount = useMemo(() => Object.keys(solved).length, [solved]);

  const patternProgress = useMemo(() => {
    const map: Record<number, PatternProgress> = {};
    for (const pattern of LEETCODE_PATTERNS) {
      const count = pattern.problems.reduce((sum, problem) => sum + (solved[problem.key] ? 1 : 0), 0);
      map[pattern.id] = { solved: count, total: pattern.problems.length };
    }
    return map;
  }, [solved]);

  return {
    ready,
    isSolved,
    toggle,
    solvedCount,
    totalCount: TOTAL_PROBLEMS,
    patternProgress
  };
}

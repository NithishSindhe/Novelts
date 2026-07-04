"use client";

import { useEffect, useMemo, useState } from "react";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS, type Difficulty, type LeetPattern } from "@/lib/leetcodeData";
import { useLeetcode } from "@/lib/useLeetcode";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "text-emerald-300 border-emerald-300/40 bg-emerald-300/10",
  Medium: "text-amber-200 border-amber-200/40 bg-amber-200/10",
  Hard: "text-rose-300 border-rose-300/40 bg-rose-300/10"
};

export function LeetcodeTracker() {
  const { ready, isSolved, toggle, solvedCount, totalCount, patternProgress } = useLeetcode();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activePatternId, setActivePatternId] = useState<number | null>(null);

  const overallPct = useMemo(() => {
    if (!totalCount) return 0;
    return Math.round((solvedCount / totalCount) * 100);
  }, [solvedCount, totalCount]);

  const activePattern = useMemo(
    () => LEETCODE_PATTERNS.find((pattern) => pattern.id === activePatternId) ?? null,
    [activePatternId]
  );

  useEffect(() => {
    if (!activePattern) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivePatternId(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activePattern]);

  return (
    <main className="theme-five flex-1 bg-[radial-gradient(circle_at_20%_20%,#f9f2c7_0%,transparent_25%),radial-gradient(circle_at_80%_10%,#d1f2ff_0%,transparent_35%),linear-gradient(135deg,#132133,#2a3557,#3a2b52)] px-4 safe-bottom-offset pt-8 text-amber-50">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="grid gap-4 rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.35)]">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl font-atlas">LeetCode Patterns</h1>
            <p className="mt-1 text-sm text-amber-100/70">
              {LEETCODE_PATTERNS.length} patterns · {TOTAL_PROBLEMS} problems · progress stored locally
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-amber-100/80 font-tech">
              <span>Overall progress</span>
              <span>
                {solvedCount} / {totalCount} ({overallPct}%)
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#0e1324]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-200 transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </header>

        {!ready ? (
          <section className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6">Loading local data...</section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {LEETCODE_PATTERNS.map((pattern) => {
              const progress = patternProgress[pattern.id] ?? { solved: 0, total: pattern.problems.length };
              const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
              const complete = progress.solved === progress.total;

              return (
                <button
                  className={`group flex h-full flex-col justify-between gap-4 rounded-[1.75rem] border bg-[#111629]/75 p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#141a30]/85 ${
                    complete ? "border-emerald-300/45" : "border-amber-100/25 hover:border-cyan-100/40"
                  }`}
                  key={pattern.id}
                  onClick={() => setActivePatternId(pattern.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-tech text-xs text-amber-100/50">
                      {String(pattern.id).padStart(2, "0")}
                    </span>
                    {complete ? (
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide text-emerald-300">
                        Done
                      </span>
                    ) : null}
                  </div>

                  <h2 className="font-atlas text-lg font-semibold leading-snug">{pattern.name}</h2>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-tech text-xs">
                      <span className={complete ? "text-emerald-300" : "text-amber-100/70"}>
                        {progress.solved}/{progress.total} solved
                      </span>
                      <span className="text-amber-100/50">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#0e1324]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          complete ? "bg-emerald-300" : "bg-gradient-to-r from-cyan-300 to-amber-200"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>

      {activePattern ? (
        <PatternModal
          hideCompleted={hideCompleted}
          isSolved={isSolved}
          onClose={() => setActivePatternId(null)}
          onToggleHideCompleted={() => setHideCompleted((value) => !value)}
          pattern={activePattern}
          progress={patternProgress[activePattern.id] ?? { solved: 0, total: activePattern.problems.length }}
          toggle={toggle}
        />
      ) : null}
    </main>
  );
}

interface PatternModalProps {
  pattern: LeetPattern;
  progress: { solved: number; total: number };
  hideCompleted: boolean;
  isSolved: (key: string) => boolean;
  toggle: (key: string) => void;
  onToggleHideCompleted: () => void;
  onClose: () => void;
}

function PatternModal({
  pattern,
  progress,
  hideCompleted,
  isSolved,
  toggle,
  onToggleHideCompleted,
  onClose
}: PatternModalProps) {
  const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
  const complete = progress.solved === progress.total;

  const visibleProblems = hideCompleted
    ? pattern.problems.filter((problem) => !isSolved(problem.key))
    : pattern.problems;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-amber-100/25 bg-[#111629] shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:rounded-[2rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-tech text-xs text-amber-100/50">{String(pattern.id).padStart(2, "0")}</span>
              <h2 className="font-atlas text-xl font-semibold">{pattern.name}</h2>
            </div>
            <button
              aria-label="Close"
              className="rounded-full border border-amber-100/40 px-2.5 py-0.5 font-tech text-sm text-amber-100/70 transition hover:bg-white/10 hover:text-amber-50"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between font-tech text-xs">
              <span className={complete ? "text-emerald-300" : "text-amber-100/70"}>
                {progress.solved}/{progress.total} solved
              </span>
              <span className="text-amber-100/50">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0e1324]">
              <div
                className={`h-full rounded-full transition-all ${
                  complete ? "bg-emerald-300" : "bg-gradient-to-r from-cyan-300 to-amber-200"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition ${
                hideCompleted
                  ? "bg-zinc-200 text-zinc-900"
                  : "border border-amber-100/60 bg-amber-200/10 text-amber-50 hover:bg-amber-200/20"
              }`}
              onClick={onToggleHideCompleted}
              type="button"
            >
              {hideCompleted ? "Showing unsolved" : "Hide solved"}
            </button>
          </div>
        </header>

        <ul className="themed-scrollbar divide-y divide-white/5 overflow-y-auto">
          {visibleProblems.length === 0 ? (
            <li className="px-5 py-6 text-sm text-amber-100/50">All problems solved in this pattern.</li>
          ) : (
            visibleProblems.map((problem) => {
              const solved = isSolved(problem.key);
              return (
                <li className="flex items-center gap-3 px-5 py-2.5" key={problem.key}>
                  <input
                    aria-label={`Mark ${problem.title} as solved`}
                    checked={solved}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-400"
                    onChange={() => toggle(problem.key)}
                    type="checkbox"
                  />
                  <a
                    className={`flex-1 text-sm transition hover:text-cyan-200 ${
                      solved ? "text-amber-100/45 line-through" : "text-amber-50"
                    }`}
                    href={problem.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {problem.title}
                  </a>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide ${DIFFICULTY_STYLES[problem.difficulty]}`}
                  >
                    {problem.difficulty}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

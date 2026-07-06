"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS, type Difficulty, type LeetPattern } from "@/lib/leetcodeData";
import { useLeetcode } from "@/lib/useLeetcode";
import { useMountTransition, type TransitionStatus } from "@/lib/useMountTransition";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  Medium: "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10",
  Hard: "text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-500/10"
};

export function LeetcodeTracker() {
  const {
    ready,
    isSolved,
    getSolvedAt,
    toggle,
    solvedCount,
    totalCount,
    patternProgress,
    getProblemNote,
    setProblemNote,
    getPatternNote,
    setPatternNote
  } = useLeetcode();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activePatternId, setActivePatternId] = useState<number | null>(null);
  const [openPatternNoteInitially, setOpenPatternNoteInitially] = useState(false);

  function openPattern(patternId: number, focusPatternNote = false) {
    setOpenPatternNoteInitially(focusPatternNote);
    setActivePatternId(patternId);
  }

  function closePattern() {
    setActivePatternId(null);
    setOpenPatternNoteInitially(false);
  }

  const overallPct = useMemo(() => {
    if (!totalCount) return 0;
    return Math.round((solvedCount / totalCount) * 100);
  }, [solvedCount, totalCount]);

  const activePattern = useMemo(
    () => LEETCODE_PATTERNS.find((pattern) => pattern.id === activePatternId) ?? null,
    [activePatternId]
  );

  const { shouldRender: modalMounted, status: modalStatus } = useMountTransition(Boolean(activePattern), 220);
  const lastPatternRef = useRef<LeetPattern | null>(activePattern);
  if (activePattern) lastPatternRef.current = activePattern;
  const patternToRender = activePattern ?? lastPatternRef.current;

  const problemNoteCountForPattern = useMemo(() => {
    return (pattern: LeetPattern) => {
      let count = 0;
      for (const problem of pattern.problems) {
        if (getProblemNote(problem.key).trim()) count += 1;
      }
      return count;
    };
  }, [getProblemNote]);

  useEffect(() => {
    if (!activePattern) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePattern();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [activePattern]);

  return (
    <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="grid gap-4 rounded-[2rem] border border-border bg-surface p-6 shadow-[0_15px_45px_rgba(0,0,0,0.12)]">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl font-atlas">LeetCode Patterns</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {LEETCODE_PATTERNS.length} patterns · {TOTAL_PROBLEMS} problems · progress stored locally
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">
              <span>Overall progress</span>
              <span>
                {solvedCount} / {totalCount} ({overallPct}%)
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </header>

        {!ready ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6">Loading local data...</section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {LEETCODE_PATTERNS.map((pattern, index) => {
              const progress = patternProgress[pattern.id] ?? { solved: 0, total: pattern.problems.length };
              const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
              const complete = progress.solved === progress.total;
              const problemNotes = problemNoteCountForPattern(pattern);
              const hasPatternNote = Boolean(getPatternNote(pattern.id).trim());

              const lastSolvedAt = pattern.problems.reduce<string>((latest, problem) => {
                const ts = getSolvedAt(problem.key);
                if (ts && (!latest || Date.parse(ts) > Date.parse(latest))) return ts;
                return latest;
              }, "");
              const cardTooltip =
                progress.solved > 0
                  ? `${progress.solved}/${progress.total} solved${
                      lastSolvedAt ? ` · last solved ${formatSolvedAt(lastSolvedAt)}` : ""
                    }`
                  : "No problems solved yet";

              return (
                <div
                  className={`group flex h-full cursor-pointer flex-col justify-between gap-4 rounded-[1.75rem] border bg-surface p-5 text-left transition-transform transition-colors duration-200 animate-rise-in hover:-translate-y-0.5 hover:bg-surface-2 ${
                    complete ? "border-success" : "border-border hover:border-accent-border"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 35, 420)}ms` }}
                  key={pattern.id}
                  onClick={() => openPattern(pattern.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPattern(pattern.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  title={cardTooltip}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-tech text-xs text-fg-subtle">
                      {String(pattern.id).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-2">
                      {problemNotes > 0 ? (
                        <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide text-accent">
                          {problemNotes} note{problemNotes > 1 ? "s" : ""}
                        </span>
                      ) : null}
                      {complete ? (
                        <span className="rounded-full border border-success px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide text-success">
                          Done
                        </span>
                      ) : null}
                      <button
                        aria-label={`${hasPatternNote ? "Edit" : "Add"} pattern note for ${pattern.name}`}
                        className={`shrink-0 rounded-full border p-1.5 transition ${
                          hasPatternNote
                            ? "border-accent-border bg-accent-soft text-accent"
                            : "border-border text-fg-subtle hover:border-accent-border hover:text-accent"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openPattern(pattern.id, true);
                        }}
                        title={hasPatternNote ? "Edit pattern note" : "Add pattern note"}
                        type="button"
                      >
                        <NoteIcon filled={hasPatternNote} />
                      </button>
                    </div>
                  </div>

                  <h2 className="font-atlas text-lg font-semibold leading-snug">{pattern.name}</h2>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-tech text-xs">
                      <span className={complete ? "text-success" : "text-fg-muted"}>
                        {progress.solved}/{progress.total} solved
                      </span>
                      <span className="text-fg-subtle">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full transition-all ${
                          complete ? "bg-success" : "bg-accent"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {modalMounted && patternToRender ? (
        <PatternModal
          status={modalStatus}
          getPatternNote={getPatternNote}
          getProblemNote={getProblemNote}
          hideCompleted={hideCompleted}
          initialShowPatternNote={openPatternNoteInitially}
          isSolved={isSolved}
          getSolvedAt={getSolvedAt}
          onClose={closePattern}
          onToggleHideCompleted={() => setHideCompleted((value) => !value)}
          pattern={patternToRender}
          progress={patternProgress[patternToRender.id] ?? { solved: 0, total: patternToRender.problems.length }}
          setPatternNote={setPatternNote}
          setProblemNote={setProblemNote}
          toggle={toggle}
        />
      ) : null}
    </main>
  );
}

function formatSolvedAt(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function NoteIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V15l-5 5H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M14 20v-4.5A1.5 1.5 0 0 1 15.5 14H20" fill="none" />
    </svg>
  );
}

interface PatternModalProps {
  pattern: LeetPattern;
  progress: { solved: number; total: number };
  status: TransitionStatus;
  hideCompleted: boolean;
  initialShowPatternNote: boolean;
  isSolved: (key: string) => boolean;
  getSolvedAt: (key: string) => string;
  toggle: (key: string) => void;
  getProblemNote: (key: string) => string;
  setProblemNote: (key: string, note: string) => void;
  getPatternNote: (patternId: number) => string;
  setPatternNote: (patternId: number, note: string) => void;
  onToggleHideCompleted: () => void;
  onClose: () => void;
}

function PatternModal({
  pattern,
  progress,
  status,
  hideCompleted,
  initialShowPatternNote,
  isSolved,
  getSolvedAt,
  toggle,
  getProblemNote,
  setProblemNote,
  getPatternNote,
  setPatternNote,
  onToggleHideCompleted,
  onClose
}: PatternModalProps) {
  const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
  const complete = progress.solved === progress.total;
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [showPatternNote, setShowPatternNote] = useState(
    () => initialShowPatternNote || Boolean(getPatternNote(pattern.id).trim())
  );

  const visibleProblems = hideCompleted
    ? pattern.problems.filter((problem) => !isSolved(problem.key))
    : pattern.problems;

  const entering = status === "entering";

  function toggleNote(key: string) {
    setOpenNotes((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 ${
        entering ? "animate-fade-in" : "animate-fade-out"
      }`}
      onClick={onClose}
      role="dialog"
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:rounded-[2rem] ${
          entering ? "animate-sheet-in sm:animate-modal-in" : "animate-sheet-out sm:animate-modal-out"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-tech text-xs text-fg-subtle">{String(pattern.id).padStart(2, "0")}</span>
              <h2 className="font-atlas text-xl font-semibold">{pattern.name}</h2>
            </div>
            <button
              aria-label="Close"
              className="rounded-full border border-border px-2.5 py-0.5 font-tech text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between font-tech text-xs">
              <span className={complete ? "text-success" : "text-fg-muted"}>
                {progress.solved}/{progress.total} solved
              </span>
              <span className="text-fg-subtle">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-all ${
                  complete ? "bg-success" : "bg-accent"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition ${
                hideCompleted
                  ? "bg-accent text-accent-fg"
                  : "border border-border bg-surface-2 text-fg-muted hover:text-fg"
              }`}
              onClick={onToggleHideCompleted}
              type="button"
            >
              {hideCompleted ? "Showing unsolved" : "Hide solved"}
            </button>
            <button
              className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition ${
                showPatternNote
                  ? "bg-accent-soft text-accent"
                  : "border border-border text-fg-muted hover:text-accent"
              }`}
              onClick={() => setShowPatternNote((value) => !value)}
              type="button"
            >
              {showPatternNote ? "Hide pattern note" : "Pattern note"}
            </button>
          </div>

          {showPatternNote ? (
            <textarea
              autoFocus
              className="themed-scrollbar mt-3 w-full resize-y rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent animate-expand-in"
              defaultValue={getPatternNote(pattern.id)}
              onChange={(event) => setPatternNote(pattern.id, event.target.value)}
              placeholder="Notes for this pattern (approach, template, gotchas)..."
              rows={3}
            />
          ) : null}
        </header>

        <ul className="themed-scrollbar divide-y divide-border overflow-y-auto">
          {visibleProblems.length === 0 ? (
            <li className="px-5 py-6 text-sm text-fg-subtle">All problems solved in this pattern.</li>
          ) : (
            visibleProblems.map((problem) => {
              const solved = isSolved(problem.key);
              const solvedLabel = solved ? formatSolvedAt(getSolvedAt(problem.key)) : "";
              const hasNote = Boolean(getProblemNote(problem.key).trim());
              const noteOpen = Boolean(openNotes[problem.key]);
              return (
                <li className="px-5 py-2.5" key={problem.key}>
                  <div className="flex items-center gap-3">
                    <input
                      aria-label={`Mark ${problem.title} as solved`}
                      checked={solved}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                      onChange={() => toggle(problem.key)}
                      type="checkbox"
                    />
                    <a
                      className={`flex-1 text-sm transition hover:text-accent ${
                        solved ? "text-fg-subtle line-through" : "text-fg"
                      }`}
                      href={problem.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {problem.title}
                    </a>
                    <button
                      aria-label={`${hasNote ? "Edit" : "Add"} note for ${problem.title}`}
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide transition ${
                        hasNote || noteOpen
                          ? "border-accent-border bg-accent-soft text-accent"
                          : "border-border text-fg-muted hover:bg-surface-2"
                      }`}
                      onClick={() => toggleNote(problem.key)}
                      type="button"
                    >
                      {hasNote ? "Note •" : "Note"}
                    </button>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide ${DIFFICULTY_STYLES[problem.difficulty]}`}
                    >
                      {problem.difficulty}
                    </span>
                  </div>

                  {solved ? (
                    <p className="mt-1 pl-7 font-tech text-[10px] text-success">
                      {solvedLabel ? `Solved · ${solvedLabel}` : "Solved"}
                    </p>
                  ) : null}

                  {noteOpen ? (
                    <textarea
                      autoFocus
                      className="themed-scrollbar mt-2 w-full resize-y rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent animate-expand-in"
                      defaultValue={getProblemNote(problem.key)}
                      onChange={(event) => setProblemNote(problem.key, event.target.value)}
                      placeholder="Notes for this problem (approach, edge cases, complexity)..."
                      rows={2}
                    />
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

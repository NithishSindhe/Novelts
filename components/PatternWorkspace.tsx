"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LEETCODE_PATTERNS, type Difficulty, type LeetProblem } from "@/lib/leetcodeData";
import { LEETCODE_PATTERN_NOTE_MAX, LEETCODE_PROBLEM_NOTE_MAX } from "@/lib/limits";
import { useLeetcode } from "@/lib/useLeetcode";
import { CharCounter } from "@/components/CharCounter";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  Medium: "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10",
  Hard: "text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-500/10"
};

const PATTERN_NOTE_KEY = "pattern";

interface PatternWorkspaceProps {
  patternSlug: string;
  selectedNote?: string;
}

export function PatternWorkspace({ patternSlug, selectedNote }: PatternWorkspaceProps) {
  const {
    ready,
    isSolved,
    getSolvedAt,
    toggle,
    recordAttempt,
    getAttempts,
    getProblemNote,
    setProblemNote,
    getPatternNote,
    setPatternNote
  } = useLeetcode();

  const router = useRouter();
  const searchParams = useSearchParams();

  const pattern = useMemo(
    () => LEETCODE_PATTERNS.find((item) => item.slug === patternSlug) ?? null,
    [patternSlug]
  );

  const [hideCompleted, setHideCompleted] = useState(false);
  const [confirmAttemptKey, setConfirmAttemptKey] = useState<string | null>(null);
  const [editorLength, setEditorLength] = useState(0);

  const progress = useMemo(() => {
    if (!pattern) return { solved: 0, total: 0 };
    const solved = pattern.problems.reduce((sum, problem) => sum + (isSolved(problem.key) ? 1 : 0), 0);
    return { solved, total: pattern.problems.length };
  }, [pattern, isSolved]);

  const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
  const complete = progress.total > 0 && progress.solved === progress.total;

  const visibleProblems = useMemo(() => {
    if (!pattern) return [];
    return hideCompleted ? pattern.problems.filter((problem) => !isSolved(problem.key)) : pattern.problems;
  }, [pattern, hideCompleted, isSolved]);

  // Resolve the active note target from the URL.
  const activeNote: "pattern" | LeetProblem | null = useMemo(() => {
    if (!pattern) return null;
    if (selectedNote === PATTERN_NOTE_KEY) return "pattern";
    const match = pattern.problems.find((problem) => problem.key === selectedNote);
    return match ?? null;
  }, [pattern, selectedNote]);

  // Keep the character counter in sync with whichever note is open.
  useEffect(() => {
    if (!activeNote) {
      setEditorLength(0);
      return;
    }
    const value = activeNote === "pattern" ? getPatternNote(patternSlug) : getProblemNote(activeNote.key);
    setEditorLength(value.length);
    // Only re-sync when the selected note target changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote, patternSlug]);

  function selectNote(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("note", key);
    router.replace(`/leetcode/${patternSlug}?${params.toString()}`, { scroll: false });
  }

  if (ready && !pattern) {
    return (
      <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
        <div className="mx-auto max-w-[1400px] space-y-5">
          <header className="rounded-[2rem] border border-border bg-surface p-6">
            <Link
              className="rounded-2xl border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent transition hover:bg-accent hover:text-accent-fg"
              href="/leetcode"
            >
              Back to patterns
            </Link>
            <p className="mt-4 text-sm font-tech text-fg-muted">This pattern could not be found.</p>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
      <div className="mx-auto max-w-[1400px] space-y-5">
        <header className="rounded-[2rem] border border-border bg-surface p-6 animate-rise-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="rounded-2xl border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent transition hover:bg-accent hover:text-accent-fg"
              href="/leetcode"
            >
              Back to patterns
            </Link>
            <button
              className={`rounded-2xl px-3 py-1.5 text-xs font-semibold transition ${
                hideCompleted
                  ? "bg-accent text-accent-fg"
                  : "border border-border bg-surface-2 text-fg-muted hover:text-fg"
              }`}
              onClick={() => setHideCompleted((value) => !value)}
              type="button"
            >
              {hideCompleted ? "Showing unsolved" : "Hide solved"}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-tech text-sm text-fg-subtle">
              {pattern ? String(pattern.id).padStart(2, "0") : "--"}
            </span>
            <h1 className="text-3xl font-bold font-atlas">{pattern?.name ?? "Pattern"}</h1>
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
                className={`h-full rounded-full transition-all ${complete ? "bg-success" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </header>

        {!ready ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6">Loading local data...</section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            {/* Problem list */}
            <div className="rounded-[2rem] border border-border bg-surface p-3 animate-rise-in">
              <button
                className={`mb-2 w-full rounded-2xl border p-3 text-left transition ${
                  activeNote === "pattern"
                    ? "border-accent-border bg-accent-soft"
                    : "border-border bg-surface-2 hover:border-accent-border"
                }`}
                onClick={() => selectNote(PATTERN_NOTE_KEY)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-atlas text-sm font-semibold text-fg">Pattern note</span>
                  {getPatternNote(patternSlug).trim() ? (
                    <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide text-accent">
                      Written
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-1 font-tech text-xs text-fg-muted">
                  {getPatternNote(patternSlug).trim() || "Approach, template, gotchas…"}
                </p>
              </button>

              <ul className="themed-scrollbar divide-y divide-border">
                {visibleProblems.length === 0 ? (
                  <li className="px-2 py-6 text-sm text-fg-subtle">All problems solved in this pattern.</li>
                ) : (
                  visibleProblems.map((problem) => {
                    const solved = isSolved(problem.key);
                    const solvedLabel = solved ? formatTimestamp(getSolvedAt(problem.key)) : "";
                    const hasNote = Boolean(getProblemNote(problem.key).trim());
                    const attempts = getAttempts(problem.key);
                    const attemptCount = attempts.length;
                    const lastAttemptLabel = attemptCount > 0 ? formatTimestamp(attempts[attempts.length - 1]) : "";
                    const isActive = activeNote !== "pattern" && activeNote?.key === problem.key;
                    return (
                      <li
                        className={`px-2 py-2.5 transition ${isActive ? "rounded-2xl bg-accent-soft" : ""}`}
                        key={problem.key}
                      >
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
                            aria-label={`Record an attempt for ${problem.title}`}
                            className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide transition ${
                              attemptCount > 0
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-border text-fg-muted hover:bg-surface-2"
                            }`}
                            onClick={() => setConfirmAttemptKey(problem.key)}
                            title="Record an attempt"
                            type="button"
                          >
                            {attemptCount > 0 ? `Attempt · ${attemptCount}` : "Attempt"}
                          </button>
                          <button
                            aria-label={`${hasNote ? "Read" : "Add"} note for ${problem.title}`}
                            className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide transition ${
                              hasNote || isActive
                                ? "border-accent-border bg-accent-soft text-accent"
                                : "border-border text-fg-muted hover:bg-surface-2"
                            }`}
                            onClick={() => selectNote(problem.key)}
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

                        {solved || attemptCount > 0 ? (
                          <p className="mt-1 pl-7 space-y-0.5">
                            {solved ? (
                              <span className="block font-tech text-[10px] text-success">
                                {solvedLabel ? `Solved · ${solvedLabel}` : "Solved"}
                              </span>
                            ) : null}
                            {attemptCount > 0 ? (
                              <span className="block font-tech text-[10px] text-amber-600 dark:text-amber-400">
                                {`Attempts: ${attemptCount} · last ${lastAttemptLabel}`}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Reading / editing pane */}
            <div className="min-h-[24rem] rounded-[2rem] border border-border bg-surface p-6 animate-rise-in lg:sticky lg:top-8" style={{ animationDelay: "80ms" }}>
              {!activeNote ? (
                <p className="text-sm font-tech text-fg-muted">
                  Select the pattern note or any problem&apos;s note to read and edit it here.
                </p>
              ) : activeNote === "pattern" ? (
                <>
                  <h2 className="font-atlas text-lg font-semibold text-fg">Pattern note</h2>
                  <p className="mt-0.5 font-tech text-xs text-fg-subtle">{pattern?.name}</p>
                  <textarea
                    autoFocus
                    className="themed-scrollbar mt-4 min-h-[22rem] w-full resize-y rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base leading-relaxed text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                    defaultValue={getPatternNote(patternSlug)}
                    key={`pattern-${patternSlug}`}
                    maxLength={LEETCODE_PATTERN_NOTE_MAX}
                    onChange={(event) => {
                      setEditorLength(event.target.value.length);
                      setPatternNote(patternSlug, event.target.value);
                    }}
                    placeholder="Notes for this pattern (approach, template, gotchas)…"
                  />
                  <CharCounter count={editorLength} max={LEETCODE_PATTERN_NOTE_MAX} className="mt-1" />
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-atlas text-lg font-semibold text-fg">{activeNote.title}</h2>
                      <a
                        className="mt-0.5 inline-block font-tech text-xs text-accent hover:underline"
                        href={activeNote.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open problem on LeetCode ↗
                      </a>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 font-tech text-[10px] uppercase tracking-wide ${DIFFICULTY_STYLES[activeNote.difficulty]}`}
                    >
                      {activeNote.difficulty}
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    className="themed-scrollbar mt-4 min-h-[22rem] w-full resize-y rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base leading-relaxed text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                    defaultValue={getProblemNote(activeNote.key)}
                    key={activeNote.key}
                    maxLength={LEETCODE_PROBLEM_NOTE_MAX}
                    onChange={(event) => {
                      setEditorLength(event.target.value.length);
                      setProblemNote(activeNote.key, event.target.value);
                    }}
                    placeholder="Notes for this problem (approach, edge cases, complexity)…"
                  />
                  <CharCounter count={editorLength} max={LEETCODE_PROBLEM_NOTE_MAX} className="mt-1" />
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {confirmAttemptKey ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setConfirmAttemptKey(null)}
          role="dialog"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-atlas text-base font-semibold text-fg">Record an attempt?</h3>
            <p className="mt-2 text-sm text-fg-muted">
              Are you sure you want to record an attempt time? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg"
                onClick={() => setConfirmAttemptKey(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                onClick={() => {
                  recordAttempt(confirmAttemptKey);
                  setConfirmAttemptKey(null);
                }}
                type="button"
              >
                Record attempt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function formatTimestamp(iso: string): string {
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

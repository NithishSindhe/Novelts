"use client";

import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { LEETCODE_PATTERNS, TOTAL_PROBLEMS, type LeetPattern } from "@/lib/leetcodeData";
import { useLeetcode, type SyncStatus } from "@/lib/useLeetcode";

export function LeetcodeTracker() {
  const {
    ready,
    getSolvedAt,
    solvedCount,
    totalCount,
    patternProgress,
    patternAttempting,
    getProblemNote,
    getPatternNote,
    syncStatus,
    isSignedIn
  } = useLeetcode();
  const router = useRouter();

  function openPattern(patternSlug: string, focusPatternNote = false) {
    router.push(`/leetcode/${patternSlug}${focusPatternNote ? "?note=pattern" : ""}`);
  }

  const overallPct = useMemo(() => {
    if (!totalCount) return 0;
    return Math.round((solvedCount / totalCount) * 100);
  }, [solvedCount, totalCount]);

  const problemNoteCountForPattern = useMemo(() => {
    return (pattern: LeetPattern) => {
      let count = 0;
      for (const problem of pattern.problems) {
        if (getProblemNote(problem.key).trim()) count += 1;
      }
      return count;
    };
  }, [getProblemNote]);

  return (
    <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="grid gap-4 rounded-[2rem] border border-border bg-surface p-6 shadow-[0_15px_45px_rgba(0,0,0,0.12)]">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl font-atlas">LeetCode Patterns</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
              {LEETCODE_PATTERNS.length} patterns · {TOTAL_PROBLEMS} problems ·{" "}
              <SyncIndicator status={syncStatus} />
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

          {!isSignedIn ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-border bg-accent-soft px-4 py-3 text-xs text-fg-muted">
              <span>
                Sign in to track daily check-ins and sync your notes and progress to the cloud.
              </span>
              <SignInButton mode="modal">
                <button className="shrink-0 rounded-2xl border border-accent-border bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:opacity-90">
                  Sign in
                </button>
              </SignInButton>
            </div>
          ) : null}
        </header>

        {!ready ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6">Loading local data...</section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {LEETCODE_PATTERNS.map((pattern, index) => {
              const progress = patternProgress[pattern.id] ?? { solved: 0, total: pattern.problems.length };
              const pct = progress.total ? Math.round((progress.solved / progress.total) * 100) : 0;
              const complete = progress.solved === progress.total;
              const attempting = patternAttempting[pattern.id] ?? 0;
              const problemNotes = problemNoteCountForPattern(pattern);
              const hasPatternNote = Boolean(getPatternNote(pattern.slug).trim());

              const lastSolvedAt = pattern.problems.reduce<string>((latest, problem) => {
                const ts = getSolvedAt(problem.key);
                if (ts && (!latest || Date.parse(ts) > Date.parse(latest))) return ts;
                return latest;
              }, "");
              const cardTooltip =
                progress.solved > 0
                  ? `${progress.solved}/${progress.total} solved${
                      lastSolvedAt ? ` · last solved ${formatTimestamp(lastSolvedAt)}` : ""
                    }`
                  : "No problems solved yet";

              return (
                <div
                  className={`group flex h-full cursor-pointer flex-col justify-between gap-4 rounded-[1.75rem] border bg-surface p-5 text-left transition-transform transition-colors duration-200 animate-rise-in hover:-translate-y-0.5 hover:bg-surface-2 ${
                    complete ? "border-success" : "border-border hover:border-accent-border"
                  }`}
                  style={{ animationDelay: `${Math.min(index * 35, 420)}ms` }}
                  key={pattern.id}
                  onClick={() => openPattern(pattern.slug)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openPattern(pattern.slug);
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
                          openPattern(pattern.slug, true);
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
                    {attempting > 0 ? (
                      <div className="flex items-center gap-1.5 font-tech text-xs text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {attempting} attempting
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const SYNC_STATUS_META: Record<SyncStatus, { label: string; dotClass: string; pulse?: boolean }> = {
  local: { label: "stored locally", dotClass: "bg-fg-subtle" },
  syncing: { label: "syncing…", dotClass: "bg-amber-500", pulse: true },
  synced: { label: "updates synced to cloud", dotClass: "bg-emerald-500" },
  error: { label: "sync error · updates saved locally", dotClass: "bg-rose-500" }
};

function SyncIndicator({ status }: { status: SyncStatus }) {
  const meta = SYNC_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5" title={`Progress ${meta.label}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dotClass} ${meta.pulse ? "animate-pulse" : ""}`}
      />
      {meta.label}
    </span>
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

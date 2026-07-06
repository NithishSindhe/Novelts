"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { dateIdFromLocal, formatDateLabel, parseDateId } from "@/lib/date";
import { useTracker } from "@/lib/useTracker";
import { useMountTransition } from "@/lib/useMountTransition";

const DELETED_TAG = "deleted";
const MONTH_CHUNKS = 3;

function hasDeletedTag(tags?: string[]): boolean {
  return Boolean(tags?.includes(DELETED_TAG));
}

function buildMonthChunks(count: number) {
  const now = new Date();

  return Array.from({ length: count }, (_, idx) => {
    const offset = count - 1 - idx;
    const firstDay = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const lastDay = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0);

    const dates = Array.from({ length: lastDay.getDate() }, (_, dayOffset) => {
      return dateIdFromLocal(new Date(firstDay.getFullYear(), firstDay.getMonth(), dayOffset + 1));
    });

    const leading = parseDateId(dates[0]).getDay();
    const cells = [...Array.from({ length: leading }, () => null as string | null), ...dates];

    return {
      key: `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}`,
      label: firstDay.toLocaleDateString(undefined, { month: "short" }),
      cells
    };
  });
}

export function HomeDashboard() {
  const { ready, state, streak, validDates, message, messageKind, addNovel, checkIn, softDeleteNovel } = useTracker();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [query, setQuery] = useState("");
  const [hoverInfo, setHoverInfo] = useState<{ label: string; x: number; y: number } | null>(null);

  const monthChunks = useMemo(() => buildMonthChunks(MONTH_CHUNKS), []);

  const activeNovels = useMemo(() => {
    return state.novels.filter((novel) => !hasDeletedTag(novel.tags));
  }, [state.novels]);

  const activeNovelIds = useMemo(() => new Set(activeNovels.map((novel) => novel.id)), [activeNovels]);

  const activeNotes = useMemo(() => {
    return state.notes.filter((note) => !hasDeletedTag(note.tags) && activeNovelIds.has(note.novelId));
  }, [state.notes, activeNovelIds]);

  const activeWords = useMemo(() => {
    return state.words.filter((word) => !word.novelId || activeNovelIds.has(word.novelId));
  }, [state.words, activeNovelIds]);

  const activeCharacters = useMemo(() => {
    return state.characters.filter((character) => !character.novelId || activeNovelIds.has(character.novelId));
  }, [state.characters, activeNovelIds]);

  const filteredNovels = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return activeNovels;

    return activeNovels.filter((novel) => {
      return novel.title.toLowerCase().includes(search) || novel.author.toLowerCase().includes(search);
    });
  }, [activeNovels, query]);

  const recentWords = useMemo(() => activeWords.slice(0, 12), [activeWords]);

  const { shouldRender: toastMounted, status: toastStatus } = useMountTransition(Boolean(message), 200);
  const lastToastRef = useRef({ text: message, kind: messageKind });
  if (message) lastToastRef.current = { text: message, kind: messageKind };
  const toast = message ? { text: message, kind: messageKind } : lastToastRef.current;

  function onAddNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addNovel({ title, author });
    setTitle("");
    setAuthor("");
  }

  function onDeleteNovel(novelId: string, novelTitle: string) {
    const shouldDelete = window.confirm(`Delete \"${novelTitle}\"? It will be hidden but kept in cloud/local data.`);
    if (!shouldDelete) return;
    softDeleteNovel(novelId);
  }

  return (
    <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="grid gap-4 rounded-[2rem] border border-border bg-surface p-6 shadow-[0_15px_45px_rgba(0,0,0,0.12)] animate-rise-in md:grid-cols-[1.15fr_1fr] md:items-end">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl font-atlas">Novelts Home</h1>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">Manual check-in</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...validDates].reverse().map((date) => {
                const active = Boolean(state.checkIns[date]);
                return (
                  <button
                    className={`rounded-2xl px-4 py-2 text-sm transition ${
                      active
                        ? "bg-accent text-accent-fg"
                        : "border border-border bg-surface-2 text-fg-muted hover:text-fg"
                    }`}
                    key={date}
                    onClick={() => checkIn(date, "manual")}
                    type="button"
                  >
                    {formatDateLabel(date)}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {toastMounted ? (
          <div className="fixed right-4 top-20 z-50">
            <div
              className={`rounded-full px-4 py-2 text-xs font-semibold shadow-lg ${
                toastStatus === "entering" ? "animate-toast-in" : "animate-toast-out"
              } ${
                toast.kind === "warning"
                  ? "border border-accent-border bg-accent text-accent-fg"
                  : "border border-border bg-surface text-fg"
              }`}
            >
              {toast.text}
            </div>
          </div>
        ) : null}

        {!ready ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6">Loading local data...</section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-2 animate-rise-in" style={{ animationDelay: "70ms" }}>
              <section className="grid grid-cols-2 gap-3 xl:col-start-1 xl:row-start-1">
                <article className="rounded-[1.5rem] border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">Current streak</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{streak.current}</p>
                </article>
                <article className="rounded-[1.5rem] border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">Longest streak</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{streak.longest}</p>
                </article>
                <article className="rounded-[1.5rem] border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">Novels</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{activeNovels.length}</p>
                </article>
                <article className="rounded-[1.5rem] border border-border bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-fg-subtle font-tech">Characters</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{activeCharacters.length}</p>
                </article>
              </section>

              <section className="rounded-[2rem] border border-border bg-surface p-5 xl:col-start-2 xl:row-start-1">
                <h2 className="text-xl font-semibold font-atlas">Add novel</h2>
                <form className="mt-3 space-y-2" onSubmit={onAddNovel}>
                  <input
                    className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Novel title"
                    required
                    value={title}
                  />
                  <input
                    className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="Author"
                    value={author}
                  />
                  <button
                    className="rounded-2xl border border-accent-border bg-accent-soft px-4 py-2 text-sm font-semibold tracking-wide text-fg transition hover:bg-accent hover:text-accent-fg"
                    type="submit"
                  >
                    Save novel
                  </button>
                </form>
              </section>

              <section className="rounded-[2rem] border border-border bg-surface p-5 xl:col-start-1 xl:row-start-2">
                <h2 className="text-xl font-semibold font-atlas">Check-ins</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {monthChunks.map((chunk) => (
                    <div key={chunk.key}>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-fg-subtle font-tech">{chunk.label}</p>
                      <div className="inline-grid grid-flow-col auto-cols-[11px] grid-rows-7 gap-1">
                        {chunk.cells.map((date, idx) => {
                          if (!date) {
                            return <div className="h-[11px] w-[11px] rounded-[3px] bg-transparent" key={`${chunk.key}-blank-${idx}`} />;
                          }

                          const record = state.checkIns[date];
                          const level = record ? (record.sources.length > 1 ? 2 : 1) : 0;
                          const cellColor =
                            level === 2
                              ? "bg-accent"
                              : level === 1
                              ? "bg-accent-soft"
                              : "bg-surface-2";

                          return (
                            <div
                              className={`h-[11px] w-[11px] rounded-[3px] ${cellColor}`}
                              key={date}
                              onMouseEnter={(event) => {
                                setHoverInfo({
                                  label: formatDateLabel(date),
                                  x: event.clientX,
                                  y: event.clientY
                                });
                              }}
                              onMouseLeave={() => setHoverInfo(null)}
                              onMouseMove={(event) => {
                                setHoverInfo((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-border bg-surface p-5 xl:col-start-2 xl:row-start-2">
                <div className="flex flex-col gap-3">
                  <h2 className="text-xl font-semibold font-atlas">Novel selection</h2>
                  <input
                    className="w-full rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title or author"
                    value={query}
                  />
                </div>

                <div className="themed-scrollbar mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {filteredNovels.map((novel) => {
                    const noteCount = activeNotes.filter((entry) => entry.novelId === novel.id).length;
                    const characterCount = activeCharacters.filter((entry) => entry.novelId === novel.id).length;
                    const wordCount = activeWords.filter((entry) => entry.novelId === novel.id).length;
                    const workspaceHref = {
                      pathname: `/novels/${novel.id}`,
                      query: {
                        title: novel.title,
                        author: novel.author
                      }
                    };

                    return (
                      <article className="rounded-2xl border border-border bg-surface-2 p-4" key={novel.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link className="text-lg font-semibold font-atlas text-fg hover:text-accent" href={workspaceHref}>
                              {novel.title}
                            </Link>
                            <p className="text-xs text-fg-muted font-tech">{novel.author || "Unknown author"}</p>
                          </div>
                          <button
                            className="rounded-xl border border-danger px-2 py-1 text-[10px] uppercase tracking-wide text-danger"
                            onClick={() => onDeleteNovel(novel.id, novel.title)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-3 text-xs text-fg-muted font-tech">
                          {wordCount} words · {characterCount} characters · {noteCount} notes
                        </p>
                        <Link className="mt-2 inline-block text-xs text-accent font-tech" href={workspaceHref}>
                          Open focused workspace
                        </Link>
                      </article>
                    );
                  })}
                  {!filteredNovels.length ? <p className="text-sm text-fg-muted font-tech">No novels match your search.</p> : null}
                </div>
              </section>
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-5 animate-rise-in" style={{ animationDelay: "140ms" }}>
              <h2 className="text-xl font-semibold font-atlas">Recent words</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {recentWords.map((entry) => {
                  const novel = activeNovels.find((item) => item.id === entry.novelId);
                  return (
                    <article className="rounded-xl border border-border bg-surface-2 p-3" key={entry.id}>
                      <p className="font-semibold">{entry.word}</p>
                      <p className="text-xs text-fg-muted font-tech">{entry.meaning || "No meaning yet"}</p>
                      <p className="text-xs text-accent font-tech">{novel?.title ?? "Unlinked"}</p>
                    </article>
                  );
                })}
                {!recentWords.length ? <p className="text-sm text-fg-muted font-tech">No words yet.</p> : null}
              </div>
            </section>
          </>
        )}
      </div>
      <div
        className={`pointer-events-none fixed z-50 -translate-y-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-fg shadow-[0_10px_25px_rgba(0,0,0,0.25)] transition duration-100 ${
          hoverInfo ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: hoverInfo ? `${hoverInfo.x + 12}px` : "-9999px",
          top: hoverInfo ? `${hoverInfo.y - 12}px` : "-9999px"
        }}
      >
        {hoverInfo?.label}
      </div>
    </main>
  );
}

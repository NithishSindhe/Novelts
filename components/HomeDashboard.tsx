"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { dateIdFromLocal, formatDateLabel, parseDateId } from "@/lib/date";
import { useTracker } from "@/lib/useTracker";

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
    <main className="theme-five min-h-dvh bg-[radial-gradient(circle_at_20%_20%,#f9f2c7_0%,transparent_25%),radial-gradient(circle_at_80%_10%,#d1f2ff_0%,transparent_35%),linear-gradient(135deg,#132133,#2a3557,#3a2b52)] px-4 safe-bottom-offset pt-8 text-amber-50">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="grid gap-4 rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6 shadow-[0_15px_45px_rgba(0,0,0,0.35)] md:grid-cols-[1.15fr_1fr] md:items-end">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl font-atlas">Novelts Home</h1>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80 font-tech">Manual check-in</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...validDates].reverse().map((date) => {
                const active = Boolean(state.checkIns[date]);
                return (
                  <button
                    className={`rounded-2xl px-4 py-2 text-sm transition ${
                      active ? "bg-zinc-200 text-zinc-900" : "bg-zinc-700/70 text-zinc-100 hover:bg-zinc-600/70"
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

        {message ? (
          <div className="fixed right-4 top-20 z-50">
            <div
              className={`rounded-full px-4 py-2 text-xs font-semibold shadow-lg ${
                messageKind === "warning"
                  ? "border border-amber-200/80 bg-amber-200 text-amber-950"
                  : "border border-cyan-100/60 bg-cyan-100 text-cyan-950"
              }`}
            >
              {message}
            </div>
          </div>
        ) : null}

        {!ready ? (
          <section className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6">Loading local data...</section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-2">
              <section className="grid grid-cols-2 gap-3 xl:col-start-1 xl:row-start-1">
                <article className="rounded-[1.5rem] bg-[#111629]/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/75 font-tech">Current streak</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{streak.current}</p>
                </article>
                <article className="rounded-[1.5rem] bg-[#111629]/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/75 font-tech">Longest streak</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{streak.longest}</p>
                </article>
                <article className="rounded-[1.5rem] bg-[#111629]/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/75 font-tech">Novels</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{activeNovels.length}</p>
                </article>
                <article className="rounded-[1.5rem] bg-[#111629]/75 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/75 font-tech">Characters</p>
                  <p className="mt-2 text-3xl font-bold font-atlas">{activeCharacters.length}</p>
                </article>
              </section>

              <section className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-5 xl:col-start-2 xl:row-start-1">
                <h2 className="text-xl font-semibold font-atlas">Add novel</h2>
                <form className="mt-3 space-y-2" onSubmit={onAddNovel}>
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Novel title"
                    required
                    value={title}
                  />
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="Author"
                    value={author}
                  />
                  <button
                    className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-4 py-2 text-sm font-semibold tracking-wide text-amber-50 transition hover:bg-amber-200/20"
                    type="submit"
                  >
                    Save novel
                  </button>
                </form>
              </section>

              <section className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-5 xl:col-start-1 xl:row-start-2">
                <h2 className="text-xl font-semibold font-atlas">Check-ins</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {monthChunks.map((chunk) => (
                    <div key={chunk.key}>
                      <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-amber-100/70 font-tech">{chunk.label}</p>
                      <div className="inline-grid grid-flow-col auto-cols-[11px] grid-rows-7 gap-1">
                        {chunk.cells.map((date, idx) => {
                          if (!date) {
                            return <div className="h-[11px] w-[11px] rounded-[3px] bg-transparent" key={`${chunk.key}-blank-${idx}`} />;
                          }

                          const record = state.checkIns[date];
                          const level = record ? (record.sources.length > 1 ? 2 : 1) : 0;
                          const cellColor =
                            level === 2
                              ? "bg-[#bfd0e6]"
                              : level === 1
                              ? "bg-[#748dab]"
                              : "bg-[#324057]";

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

              <section className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-5 xl:col-start-2 xl:row-start-2">
                <div className="flex flex-col gap-3">
                  <h2 className="text-xl font-semibold font-atlas">Novel selection</h2>
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
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
                      <article className="rounded-2xl border border-cyan-100/35 bg-[#1a2140]/85 p-4" key={novel.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link className="text-lg font-semibold font-atlas text-amber-50 hover:text-cyan-100" href={workspaceHref}>
                              {novel.title}
                            </Link>
                            <p className="text-xs text-amber-100/75 font-tech">{novel.author || "Unknown author"}</p>
                          </div>
                          <button
                            className="rounded-xl border border-rose-200/50 px-2 py-1 text-[10px] uppercase tracking-wide text-rose-200"
                            onClick={() => onDeleteNovel(novel.id, novel.title)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="mt-3 text-xs text-amber-100/70 font-tech">
                          {wordCount} words · {characterCount} characters · {noteCount} notes
                        </p>
                        <Link className="mt-2 inline-block text-xs text-cyan-100 font-tech" href={workspaceHref}>
                          Open focused workspace
                        </Link>
                      </article>
                    );
                  })}
                  {!filteredNovels.length ? <p className="text-sm text-amber-100/75 font-tech">No novels match your search.</p> : null}
                </div>
              </section>
            </section>

            <section className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-5">
              <h2 className="text-xl font-semibold font-atlas">Recent words</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {recentWords.map((entry) => {
                  const novel = activeNovels.find((item) => item.id === entry.novelId);
                  return (
                    <article className="rounded-xl border border-cyan-100/25 bg-[#111629]/80 p-3" key={entry.id}>
                      <p className="font-semibold">{entry.word}</p>
                      <p className="text-xs text-amber-100/80 font-tech">{entry.meaning || "No meaning yet"}</p>
                      <p className="text-xs text-cyan-100/80 font-tech">{novel?.title ?? "Unlinked"}</p>
                    </article>
                  );
                })}
                {!recentWords.length ? <p className="text-sm text-amber-100/75 font-tech">No words yet.</p> : null}
              </div>
            </section>
          </>
        )}
      </div>
      <div
        className={`pointer-events-none fixed z-50 -translate-y-2 rounded-full border border-cyan-100/50 bg-[#15203a] px-3 py-1 text-[11px] text-cyan-50 shadow-[0_10px_25px_rgba(0,0,0,0.35)] transition duration-100 ${
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

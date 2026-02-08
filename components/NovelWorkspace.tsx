"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatDateLabel, todayDateId } from "@/lib/date";
import { useTracker } from "@/lib/useTracker";

const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024;
const DELETED_TAG = "deleted";

function hasDeletedTag(tags?: string[]): boolean {
  return Boolean(tags?.includes(DELETED_TAG));
}

interface NovelWorkspaceProps {
  novelId: string;
  initialTitle?: string;
  initialAuthor?: string;
}

export function NovelWorkspace({ novelId, initialTitle, initialAuthor }: NovelWorkspaceProps) {
  const {
    ready,
    state,
    message,
    messageKind,
    ensureNovel,
    addWord,
    editWord,
    addCharacter,
    editCharacter,
    addNote,
    editNote,
    toggleNotePin,
    softDeleteNote
  } = useTracker();

  const novel = useMemo(
    () => state.novels.find((item) => item.id === novelId && !hasDeletedTag(item.tags)),
    [state.novels, novelId]
  );

  const words = useMemo(() => state.words.filter((item) => item.novelId === novelId), [state.words, novelId]);
  const characters = useMemo(() => state.characters.filter((item) => item.novelId === novelId), [state.characters, novelId]);
  const notes = useMemo(() => {
    return state.notes
      .filter((item) => item.novelId === novelId && !hasDeletedTag(item.tags))
      .sort((a, b) => {
        const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pinDiff !== 0) return pinDiff;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [state.notes, novelId]);

  const recoveringNovel = ready && !novel && Boolean(initialTitle?.trim());

  useEffect(() => {
    if (!recoveringNovel) return;
    ensureNovel({
      id: novelId,
      title: initialTitle?.trim() ?? "",
      author: initialAuthor?.trim() ?? ""
    });
  }, [recoveringNovel, ensureNovel, novelId, initialTitle, initialAuthor]);

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [context, setContext] = useState("");
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState({ word: "", meaning: "", context: "" });

  const [characterName, setCharacterName] = useState("");
  const [characterRole, setCharacterRole] = useState("");
  const [characterTraits, setCharacterTraits] = useState("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState({ name: "", role: "", traits: "" });

  const [noteContent, setNoteContent] = useState("");
  const [noteScreenshot, setNoteScreenshot] = useState<string | undefined>(undefined);
  const [noteImageError, setNoteImageError] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onAddWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addWord({ word, meaning, context, novelId });
    setWord("");
    setMeaning("");
    setContext("");
  }

  function onAddCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addCharacter({ name: characterName, role: characterRole, traits: characterTraits, novelId });
    setCharacterName("");
    setCharacterRole("");
    setCharacterTraits("");
  }

  function onAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addNote({ novelId, content: noteContent, screenshotDataUrl: noteScreenshot });
    setNoteContent("");
    setNoteScreenshot(undefined);
    setNoteImageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    setNoteImageError("");

    const file = event.target.files?.[0];
    if (!file) {
      setNoteScreenshot(undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNoteImageError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setNoteImageError("Screenshot is too large. Use an image under 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNoteScreenshot(reader.result);
      }
    };
    reader.onerror = () => {
      setNoteImageError("Could not read screenshot. Try another file.");
      setNoteScreenshot(undefined);
    };
    reader.readAsDataURL(file);
  }

  function clearScreenshot() {
    setNoteScreenshot(undefined);
    setNoteImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onDeleteNote(noteId: string) {
    const shouldDelete = window.confirm("Delete this note? It will be hidden but kept in cloud/local data.");
    if (!shouldDelete) return;
    softDeleteNote(noteId);
  }

  function startEditNote(noteId: string) {
    const target = notes.find((item) => item.id === noteId);
    if (!target) return;
    setEditingNoteId(noteId);
    setEditingNoteContent(target.content);
  }

  function saveEditNote() {
    if (!editingNoteId) return;
    editNote(editingNoteId, { content: editingNoteContent });
    setEditingNoteId(null);
    setEditingNoteContent("");
  }

  function startEditWord(wordId: string) {
    const target = words.find((item) => item.id === wordId);
    if (!target) return;
    setEditingWordId(wordId);
    setEditingWord({
      word: target.word,
      meaning: target.meaning,
      context: target.context
    });
  }

  function saveEditWord() {
    if (!editingWordId) return;
    editWord(editingWordId, editingWord);
    setEditingWordId(null);
  }

  function startEditCharacter(characterId: string) {
    const target = characters.find((item) => item.id === characterId);
    if (!target) return;
    setEditingCharacterId(characterId);
    setEditingCharacter({
      name: target.name,
      role: target.role,
      traits: target.traits
    });
  }

  function saveEditCharacter() {
    if (!editingCharacterId) return;
    editCharacter(editingCharacterId, editingCharacter);
    setEditingCharacterId(null);
  }

  return (
    <main className="theme-five min-h-dvh bg-[radial-gradient(circle_at_20%_20%,#f9f2c7_0%,transparent_25%),radial-gradient(circle_at_80%_10%,#d1f2ff_0%,transparent_35%),linear-gradient(135deg,#132133,#2a3557,#3a2b52)] px-4 safe-bottom-offset pt-8 text-amber-50">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <header className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6">
          <Link
            className="rounded-2xl border border-cyan-100/40 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100 transition hover:bg-cyan-200/25"
            href="/"
          >
            Back
          </Link>
          <h1 className="mt-3 text-3xl font-bold font-atlas">{novel?.title ?? "Novel workspace"}</h1>
          <p className="text-sm text-amber-100/80 font-tech">{novel?.author || "Unknown author"}</p>
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
        ) : !novel ? (
          <section className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-6 text-sm font-tech">
            <p>{recoveringNovel ? "Opening novel workspace..." : "This novel could not be loaded."}</p>
            {!recoveringNovel ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-cyan-100/50 bg-cyan-200/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-200/25"
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  Retry load
                </button>
                <Link
                  className="rounded-2xl border border-amber-100/40 bg-amber-100/10 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-100/20"
                  href="/"
                >
                  Back
                </Link>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">
            <aside className="space-y-4">
              <article className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-4">
                <h2 className="text-lg font-semibold font-atlas">Add note</h2>
                {!state.checkIns[todayDateId()] ? (
                  <p className="text-xs text-amber-100/75 font-tech">Saving a note automatically checks in today.</p>
                ) : null}
                <form className="mt-3 space-y-2" onSubmit={onAddNote}>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setNoteContent(event.target.value)}
                    placeholder="Write your chapter note"
                    required
                    value={noteContent}
                  />
                  <input
                    accept="image/*"
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 file:mr-4 file:rounded-xl file:border-0 file:bg-amber-100/25 file:px-3 file:py-1 file:text-xs file:text-amber-50"
                    onChange={onScreenshotChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  {noteImageError ? <p className="text-xs text-rose-300">{noteImageError}</p> : null}
                  {noteScreenshot ? (
                    <div className="space-y-2 rounded-xl border border-cyan-100/25 bg-[#111629]/80 p-2">
                      <p className="text-xs text-cyan-100/80 font-tech">Screenshot preview</p>
                      <Image
                        alt="Note screenshot preview"
                        className="h-36 w-full rounded-lg object-cover"
                        height={300}
                        src={noteScreenshot}
                        unoptimized
                        width={500}
                      />
                      <button
                        className="rounded-xl border border-cyan-100/40 px-3 py-1 text-xs text-cyan-100"
                        onClick={clearScreenshot}
                        type="button"
                      >
                        Remove screenshot
                      </button>
                    </div>
                  ) : null}
                  <button
                    className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/20"
                    type="submit"
                  >
                    Save note
                  </button>
                </form>
              </article>

              <article className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-4">
                <h2 className="text-lg font-semibold font-atlas">Add character</h2>
                <form className="mt-3 space-y-2" onSubmit={onAddCharacter}>
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setCharacterName(event.target.value)}
                    placeholder="Name"
                    required
                    value={characterName}
                  />
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setCharacterRole(event.target.value)}
                    placeholder="Role"
                    value={characterRole}
                  />
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setCharacterTraits(event.target.value)}
                    placeholder="Traits"
                    value={characterTraits}
                  />
                  <button
                    className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/20"
                    type="submit"
                  >
                    Save character
                  </button>
                </form>
              </article>

              <article className="rounded-[2rem] border border-cyan-100/35 bg-[#1a2140]/85 p-4">
                <h2 className="text-lg font-semibold font-atlas">Add word</h2>
                <form className="mt-3 space-y-2" onSubmit={onAddWord}>
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setWord(event.target.value)}
                    placeholder="Word"
                    required
                    value={word}
                  />
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setMeaning(event.target.value)}
                    placeholder="Meaning"
                    value={meaning}
                  />
                  <input
                    className="w-full rounded-2xl border border-amber-100/35 bg-[#0e1324] px-3 py-2 text-sm text-amber-50 outline-none placeholder:text-amber-100/45 focus:border-cyan-200"
                    onChange={(event) => setContext(event.target.value)}
                    placeholder="Context"
                    value={context}
                  />
                  <button
                    className="rounded-2xl border border-amber-100/60 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/20"
                    type="submit"
                  >
                    Save word
                  </button>
                </form>
              </article>
            </aside>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-4">
                <h3 className="text-lg font-semibold font-atlas">Words</h3>
                <div className="themed-scrollbar mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {words.slice(0, 40).map((entry) => (
                    <div className="rounded-xl border border-cyan-100/25 bg-[#1a2140]/85 p-3" key={entry.id}>
                      {editingWordId === entry.id ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingWord((prev) => ({ ...prev, word: event.target.value }))}
                            value={editingWord.word}
                          />
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingWord((prev) => ({ ...prev, meaning: event.target.value }))}
                            value={editingWord.meaning}
                          />
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingWord((prev) => ({ ...prev, context: event.target.value }))}
                            value={editingWord.context}
                          />
                          <div className="flex gap-2">
                            <button
                              className="rounded-xl border border-cyan-100/40 px-2 py-1 text-xs text-cyan-100"
                              onClick={saveEditWord}
                              type="button"
                            >
                              Save
                            </button>
                            <button
                              className="rounded-xl border border-slate-300/40 px-2 py-1 text-xs text-slate-200"
                              onClick={() => setEditingWordId(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{entry.word}</p>
                            <button
                              className="rounded-xl border border-cyan-100/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-100"
                              onClick={() => startEditWord(entry.id)}
                              type="button"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs text-amber-100/80 font-tech">{entry.meaning || "No meaning"}</p>
                        </>
                      )}
                    </div>
                  ))}
                  {!words.length ? <p className="text-sm text-amber-100/75 font-tech">No words yet.</p> : null}
                </div>
              </article>

              <article className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-4">
                <h3 className="text-lg font-semibold font-atlas">Characters</h3>
                <div className="themed-scrollbar mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {characters.slice(0, 40).map((entry) => (
                    <div className="rounded-xl border border-cyan-100/25 bg-[#1a2140]/85 p-3" key={entry.id}>
                      {editingCharacterId === entry.id ? (
                        <div className="space-y-2">
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingCharacter((prev) => ({ ...prev, name: event.target.value }))}
                            value={editingCharacter.name}
                          />
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingCharacter((prev) => ({ ...prev, role: event.target.value }))}
                            value={editingCharacter.role}
                          />
                          <input
                            className="w-full rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-1 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingCharacter((prev) => ({ ...prev, traits: event.target.value }))}
                            value={editingCharacter.traits}
                          />
                          <div className="flex gap-2">
                            <button
                              className="rounded-xl border border-cyan-100/40 px-2 py-1 text-xs text-cyan-100"
                              onClick={saveEditCharacter}
                              type="button"
                            >
                              Save
                            </button>
                            <button
                              className="rounded-xl border border-slate-300/40 px-2 py-1 text-xs text-slate-200"
                              onClick={() => setEditingCharacterId(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{entry.name}</p>
                            <button
                              className="rounded-xl border border-cyan-100/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-100"
                              onClick={() => startEditCharacter(entry.id)}
                              type="button"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs text-amber-100/80 font-tech">{entry.role || "No role"}</p>
                          <p className="text-xs text-amber-100/80 font-tech">{entry.traits || "No traits"}</p>
                        </>
                      )}
                    </div>
                  ))}
                  {!characters.length ? <p className="text-sm text-amber-100/75 font-tech">No characters yet.</p> : null}
                </div>
              </article>

              <article className="rounded-[2rem] border border-amber-100/35 bg-[#111629]/75 p-4 xl:col-span-2">
                <h3 className="text-lg font-semibold font-atlas">Notes</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {notes.slice(0, 60).map((entry) => (
                    <div className="rounded-xl border border-cyan-100/25 bg-[#1a2140]/85 p-3" key={entry.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-cyan-100/80 font-tech">{formatDateLabel(entry.date)}</p>
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded-xl border border-cyan-100/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-100"
                            onClick={() => startEditNote(entry.id)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-xl border border-cyan-100/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-100"
                            onClick={() => toggleNotePin(entry.id)}
                            type="button"
                          >
                            {entry.pinned ? "Unpin" : "Pin"}
                          </button>
                          <button
                            className="rounded-xl border border-rose-200/50 px-2 py-1 text-[10px] uppercase tracking-wide text-rose-200"
                            onClick={() => onDeleteNote(entry.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {entry.pinned ? (
                        <p className="mt-1 inline-block rounded-full border border-amber-100/35 bg-amber-100/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100">
                          Pinned
                        </p>
                      ) : null}
                      {editingNoteId === entry.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="min-h-20 w-full resize-y rounded-xl border border-amber-100/35 bg-[#0e1324] px-2 py-2 text-sm text-amber-50 outline-none focus:border-cyan-200"
                            onChange={(event) => setEditingNoteContent(event.target.value)}
                            value={editingNoteContent}
                          />
                          <div className="flex gap-2">
                            <button
                              className="rounded-xl border border-cyan-100/40 px-2 py-1 text-xs text-cyan-100"
                              onClick={saveEditNote}
                              type="button"
                            >
                              Save
                            </button>
                            <button
                              className="rounded-xl border border-slate-300/40 px-2 py-1 text-xs text-slate-200"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteContent("");
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-amber-100/90 font-tech">{entry.content}</p>
                      )}
                      {entry.screenshotDataUrl ? (
                        <Image
                          alt="Attached screenshot"
                          className="mt-2 h-40 w-full rounded-lg object-cover"
                          height={320}
                          src={entry.screenshotDataUrl}
                          unoptimized
                          width={560}
                        />
                      ) : null}
                    </div>
                  ))}
                  {!notes.length ? <p className="text-sm text-amber-100/75 font-tech">No notes yet.</p> : null}
                </div>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

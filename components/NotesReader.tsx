"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateLabel } from "@/lib/date";
import { NOVEL_NOTE_MAX } from "@/lib/limits";
import { useTracker } from "@/lib/useTracker";
import { isNoteUnsynced } from "@/lib/noteSync";
import { CharCounter } from "@/components/CharCounter";
import { NoteScreenshot } from "@/components/NoteScreenshot";

const DELETED_TAG = "deleted";

function hasDeletedTag(tags?: string[]): boolean {
  return Boolean(tags?.includes(DELETED_TAG));
}

interface NotesReaderProps {
  novelId: string;
  selectedNoteId?: string;
}

export function NotesReader({ novelId, selectedNoteId }: NotesReaderProps) {
  const { ready, state, editNote, toggleNotePin, softDeleteNote, syncMode, saveNoteToCloud } = useTracker();
  const router = useRouter();
  const searchParams = useSearchParams();

  const novel = useMemo(
    () => state.novels.find((item) => item.id === novelId && !hasDeletedTag(item.tags)),
    [state.novels, novelId]
  );

  const notes = useMemo(() => {
    return state.notes
      .filter((item) => item.novelId === novelId && !hasDeletedTag(item.tags))
      .sort((a, b) => {
        const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pinDiff !== 0) return pinDiff;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [state.notes, novelId]);

  // Resolve the active note: URL param if valid, otherwise fall back to the first note.
  const activeNote = useMemo(() => {
    const fromUrl = notes.find((item) => item.id === selectedNoteId);
    return fromUrl ?? notes[0];
  }, [notes, selectedNoteId]);

  const [editing, setEditing] = useState(false);
  const [editingContent, setEditingContent] = useState("");

  // Reset the editor whenever the active note changes.
  useEffect(() => {
    setEditing(false);
    setEditingContent("");
  }, [activeNote?.id]);

  function selectNote(noteId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("note", noteId);
    router.replace(`/novels/${novelId}/notes?${params.toString()}`, { scroll: false });
  }

  function startEdit() {
    if (!activeNote) return;
    setEditing(true);
    setEditingContent(activeNote.content);
  }

  // Commit the in-progress edit to the local buffer. Used by the Save button
  // and by auto-save when focus leaves the editor / the tab is hidden or
  // closed. editNote no-ops when the content is unchanged.
  const activeNoteId = activeNote?.id;
  const commitEdit = useCallback(() => {
    if (!activeNoteId) return;
    if (editingContent.trim()) {
      editNote(activeNoteId, { content: editingContent });
    }
    setEditing(false);
  }, [activeNoteId, editingContent, editNote]);

  function saveEdit() {
    commitEdit();
  }

  // Flush an open edit when the tab is hidden or the page is closed/navigated.
  const commitRef = useRef(commitEdit);
  commitRef.current = commitEdit;
  const cancelEditRef = useRef(false);
  useEffect(() => {
    if (!editing) return;
    function flush() {
      commitRef.current();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [editing]);

  function onDelete() {
    if (!activeNote) return;
    const shouldDelete = window.confirm("Delete this note? It will be hidden but kept in cloud/local data.");
    if (!shouldDelete) return;
    softDeleteNote(activeNote.id);
  }

  return (
    <main className="theme-five flex-1 bg-background px-4 safe-bottom-offset pt-8 text-fg">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <header className="rounded-[2rem] border border-border bg-surface p-6 animate-rise-in">
          <Link
            className="rounded-2xl border border-accent-border bg-accent-soft px-3 py-1 text-xs text-accent transition hover:bg-accent hover:text-accent-fg"
            href={`/novels/${novelId}`}
          >
            Back to workspace
          </Link>
          <h1 className="mt-3 text-3xl font-bold font-atlas">{novel?.title ?? "Novel"} — Notes</h1>
          <p className="text-sm text-fg-muted font-tech">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
            {novel?.author ? ` · ${novel.author}` : ""}
          </p>
        </header>

        {!ready ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6">Loading local data...</section>
        ) : !notes.length ? (
          <section className="rounded-[2rem] border border-border bg-surface p-6 text-sm font-tech text-fg-muted">
            No notes yet. Head back to the workspace to add one.
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[0.9fr_2.1fr] xl:items-start">
            {/* Master list */}
            <aside className="rounded-[2rem] border border-border bg-surface p-3 animate-rise-in xl:sticky xl:top-8 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
              <div className="space-y-2">
                {notes.map((entry) => {
                  const isActive = activeNote?.id === entry.id;
                  return (
                    <button
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isActive
                          ? "border-accent-border bg-accent-soft"
                          : "border-border bg-surface-2 hover:border-accent-border"
                      }`}
                      key={entry.id}
                      onClick={() => selectNote(entry.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-accent font-tech">{formatDateLabel(entry.date)}</span>
                        {entry.pinned ? (
                          <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-fg font-tech">{entry.content}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Detail reading pane */}
            <article className="min-h-[24rem] rounded-[2rem] border border-border bg-surface p-6 animate-rise-in" style={{ animationDelay: "80ms" }}>
              {!activeNote ? (
                <p className="text-sm text-fg-muted font-tech">Select a note to read it here.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-accent font-tech">{formatDateLabel(activeNote.date)}</p>
                      {activeNote.pinned ? (
                        <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                          Pinned
                        </span>
                      ) : null}
                      {syncMode === "cloud" && isNoteUnsynced(activeNote) ? (
                        <span
                          className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent"
                          title="This note is saved on this device but not yet in the cloud."
                        >
                          Not saved to cloud
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {syncMode === "cloud" && isNoteUnsynced(activeNote) ? (
                        <button
                          className="rounded-xl border border-accent-border px-3 py-1 text-[11px] uppercase tracking-wide text-accent"
                          onClick={() => void saveNoteToCloud(activeNote.id)}
                          type="button"
                        >
                          Save to cloud
                        </button>
                      ) : null}
                      <button
                        className="rounded-xl border border-accent-border px-3 py-1 text-[11px] uppercase tracking-wide text-accent"
                        onClick={editing ? saveEdit : startEdit}
                        type="button"
                      >
                        {editing ? "Save" : "Edit"}
                      </button>
                      <button
                        className="rounded-xl border border-accent-border px-3 py-1 text-[11px] uppercase tracking-wide text-accent"
                        onClick={() => toggleNotePin(activeNote.id)}
                        type="button"
                      >
                        {activeNote.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        className="rounded-xl border border-danger px-3 py-1 text-[11px] uppercase tracking-wide text-danger"
                        onClick={onDelete}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <div className="mt-4 space-y-2 animate-expand-in">
                      <textarea
                        autoFocus
                        className="min-h-[24rem] w-full resize-y rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base leading-relaxed text-fg outline-none focus:border-accent"
                        maxLength={NOVEL_NOTE_MAX}
                        onBlur={() => {
                          if (cancelEditRef.current) {
                            cancelEditRef.current = false;
                            setEditing(false);
                            return;
                          }
                          commitEdit();
                        }}
                        onChange={(event) => setEditingContent(event.target.value)}
                        value={editingContent}
                      />
                      <CharCounter count={editingContent.length} max={NOVEL_NOTE_MAX} />
                      <button
                        className="rounded-xl border border-border px-3 py-1 text-xs text-fg-muted"
                        onMouseDown={() => {
                          cancelEditRef.current = true;
                        }}
                        onClick={() => {
                          cancelEditRef.current = false;
                          setEditing(false);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-fg font-tech">
                      {activeNote.content}
                    </p>
                  )}

                  {activeNote.screenshotDataUrl || activeNote.hasScreenshot ? (
                    <NoteScreenshot note={activeNote} />
                  ) : null}
                </>
              )}
            </article>
          </section>
        )}
      </div>
    </main>
  );
}

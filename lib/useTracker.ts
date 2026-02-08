"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allowedCheckInDates, isDateAllowedForCheckIn, todayDateId } from "@/lib/date";
import { createId } from "@/lib/id";
import { emptyState, loadTrackerState, normalizeTrackerState, saveTrackerState } from "@/lib/storage";
import { calculateStreak } from "@/lib/streak";
import type { CharacterEntry, CheckInSource, Novel, NovelNote, TrackerState, WordEntry } from "@/lib/types";

type SyncMode = "local" | "cloud";
type MessageKind = "info" | "warning";
const DELETED_TAG = "deleted";

function withCheckIn(current: TrackerState, date: string, source: CheckInSource): TrackerState {
  const existing = current.checkIns[date];
  const sources = existing ? Array.from(new Set([...existing.sources, source])) : [source];

  return {
    ...current,
    checkIns: {
      ...current.checkIns,
      [date]: {
        date,
        sources,
        createdAt: existing?.createdAt ?? new Date().toISOString()
      }
    }
  };
}

function hasDeletedTag(tags?: string[]): boolean {
  return Boolean(tags?.includes(DELETED_TAG));
}

function withDeletedTag(tags?: string[]): string[] {
  return Array.from(new Set([...(tags ?? []), DELETED_TAG]));
}

export function useTracker() {
  const { isLoaded: authLoaded, userId } = useAuth();
  const [state, setState] = useState<TrackerState>(emptyState);
  const [validDates, setValidDates] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [messageKind, setMessageKind] = useState<MessageKind>("info");
  const [syncMode, setSyncMode] = useState<SyncMode>("local");
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((text: string, kind: MessageKind = "info", ttlMs = 5000) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }

    setMessage(text);
    setMessageKind(kind);

    if (ttlMs > 0) {
      messageTimerRef.current = setTimeout(() => {
        setMessage("");
        setMessageKind("info");
        messageTimerRef.current = null;
      }, ttlMs);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setValidDates(allowedCheckInDates());
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    let cancelled = false;

    async function loadInitialState() {
      setReady(false);

      if (userId) {
        setSyncMode("cloud");
        setCloudUserId(userId);

        try {
          const cloudResponse = await fetch("/api/tracker", { cache: "no-store" });
          if (cloudResponse.ok) {
            const payload = (await cloudResponse.json()) as { state?: unknown };
            if (!cancelled) {
              setState(normalizeTrackerState(payload.state));
            }
          } else if (!cancelled) {
            setState(emptyState);
            showMessage("Could not load cloud data. Started with an empty cloud state.", "warning", 5000);
          }
        } catch {
          if (!cancelled) {
            setState(emptyState);
            showMessage("Could not load cloud data. Started with an empty cloud state.", "warning", 5000);
          }
        }

        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      if (cancelled) return;

      setSyncMode("local");
      setCloudUserId(null);
      setState(loadTrackerState());
      setReady(true);
    }

    void loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, userId, showMessage]);

  useEffect(() => {
    if (!ready) return;

    if (syncMode === "cloud" && cloudUserId) {
      void fetch("/api/tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      }).catch(() => {
        showMessage("Cloud sync failed. Try again in a moment.", "warning", 5000);
      });
      return;
    }

    saveTrackerState(state);
  }, [state, ready, syncMode, cloudUserId, showMessage]);

  const streak = useMemo(() => calculateStreak(state.checkIns), [state.checkIns]);
  const checkInDates = useMemo(() => Object.keys(state.checkIns).sort().reverse(), [state.checkIns]);

  function applyCheckInIfMissing(current: TrackerState, date: string, source: CheckInSource) {
    if (current.checkIns[date]) {
      return { nextState: current, added: false };
    }
    return { nextState: withCheckIn(current, date, source), added: true };
  }

  function addNovel(input: Pick<Novel, "title" | "author">) {
    if (!input.title.trim()) return;

    const next: Novel = {
      id: createId("novel"),
      title: input.title.trim(),
      author: input.author.trim(),
      tags: [],
      createdAt: new Date().toISOString()
    };

    setState((current) => ({ ...current, novels: [next, ...current.novels] }));
    showMessage("Novel added.");
  }

  function ensureNovel(input: Pick<Novel, "id" | "title" | "author">) {
    const title = input.title.trim();
    if (!title) return;

    const author = input.author.trim();
    setState((current) => {
      const existingNovel = current.novels.find((novel) => novel.id === input.id);
      if (existingNovel && !hasDeletedTag(existingNovel.tags)) {
        return current;
      }

      if (existingNovel) {
        const nextNovels = current.novels.map((novel) => {
          if (novel.id !== input.id) return novel;
          return {
            ...novel,
            title: title || novel.title,
            author: author || novel.author,
            tags: (novel.tags ?? []).filter((tag) => tag !== DELETED_TAG)
          };
        });
        return { ...current, novels: nextNovels };
      }

      const next: Novel = {
        id: input.id,
        title,
        author,
        tags: [],
        createdAt: new Date().toISOString()
      };
      return { ...current, novels: [next, ...current.novels] };
    });
  }

  function addWord(input: Pick<WordEntry, "word" | "meaning" | "context" | "novelId"> & { date?: string }) {
    if (!input.word.trim()) return;
    if (input.novelId) {
      const targetNovel = state.novels.find((novel) => novel.id === input.novelId);
      if (!targetNovel || hasDeletedTag(targetNovel.tags)) {
        showMessage("Cannot add word to a deleted novel.");
        return;
      }
    }

    const next: WordEntry = {
      id: createId("word"),
      word: input.word.trim(),
      meaning: input.meaning.trim(),
      context: input.context.trim(),
      novelId: input.novelId || undefined,
      date: input.date ?? todayDateId(),
      createdAt: new Date().toISOString()
    };

    let addedCheckIn = false;
    setState((current) => {
      const withWord = { ...current, words: [next, ...current.words] };
      const result = applyCheckInIfMissing(withWord, next.date, "note");
      addedCheckIn = result.added;
      return result.nextState;
    });
    showMessage(addedCheckIn ? "Word saved. Check-in added." : "Word saved.");
  }

  function editWord(wordId: string, input: Pick<WordEntry, "word" | "meaning" | "context">) {
    if (!input.word.trim()) {
      showMessage("Word cannot be empty.");
      return;
    }

    setState((current) => {
      const nextWords = current.words.map((word) => {
        if (word.id !== wordId) return word;
        return {
          ...word,
          word: input.word.trim(),
          meaning: input.meaning.trim(),
          context: input.context.trim()
        };
      });

      return { ...current, words: nextWords };
    });
    showMessage("Word updated.");
  }

  function addCharacter(input: Pick<CharacterEntry, "name" | "role" | "traits" | "novelId"> & { date?: string }) {
    if (!input.name.trim()) return;
    if (input.novelId) {
      const targetNovel = state.novels.find((novel) => novel.id === input.novelId);
      if (!targetNovel || hasDeletedTag(targetNovel.tags)) {
        showMessage("Cannot add character to a deleted novel.");
        return;
      }
    }

    const next: CharacterEntry = {
      id: createId("character"),
      name: input.name.trim(),
      role: input.role.trim(),
      traits: input.traits.trim(),
      novelId: input.novelId || undefined,
      date: input.date ?? todayDateId(),
      createdAt: new Date().toISOString()
    };

    let addedCheckIn = false;
    setState((current) => {
      const withCharacter = { ...current, characters: [next, ...current.characters] };
      const result = applyCheckInIfMissing(withCharacter, next.date, "note");
      addedCheckIn = result.added;
      return result.nextState;
    });
    showMessage(addedCheckIn ? "Character saved. Check-in added." : "Character saved.");
  }

  function editCharacter(characterId: string, input: Pick<CharacterEntry, "name" | "role" | "traits">) {
    if (!input.name.trim()) {
      showMessage("Character name cannot be empty.");
      return;
    }

    setState((current) => {
      const nextCharacters = current.characters.map((character) => {
        if (character.id !== characterId) return character;
        return {
          ...character,
          name: input.name.trim(),
          role: input.role.trim(),
          traits: input.traits.trim()
        };
      });

      return { ...current, characters: nextCharacters };
    });
    showMessage("Character updated.");
  }

  function checkIn(date: string, source: CheckInSource = "manual") {
    if (!isDateAllowedForCheckIn(date)) {
      showMessage("Only today, yesterday, or two days ago is allowed.");
      return;
    }

    let added = false;
    setState((current) => {
      const result = applyCheckInIfMissing(current, date, source);
      added = result.added;
      return result.nextState;
    });
    showMessage(added ? `Checked in for ${date}.` : `Already checked in for ${date}.`);
  }

  function addNote(input: Pick<NovelNote, "novelId" | "content"> & { date?: string; screenshotDataUrl?: string }) {
    if (!input.content.trim()) return;
    const targetNovel = state.novels.find((novel) => novel.id === input.novelId);
    if (!targetNovel || hasDeletedTag(targetNovel.tags)) {
      showMessage("Cannot add note to a deleted novel.");
      return;
    }

    const noteDate = input.date ?? todayDateId();

    if (!isDateAllowedForCheckIn(noteDate)) {
      showMessage("Notes can only auto check-in for today, yesterday, or two days ago.");
      return;
    }

    const next: NovelNote = {
      id: createId("note"),
      novelId: input.novelId,
      content: input.content.trim(),
      date: noteDate,
      screenshotDataUrl: input.screenshotDataUrl,
      pinned: false,
      tags: [],
      createdAt: new Date().toISOString()
    };

    let addedCheckIn = false;
    setState((current) => {
      const withNote = { ...current, notes: [next, ...current.notes] };
      const result = applyCheckInIfMissing(withNote, noteDate, "note");
      addedCheckIn = result.added;
      return result.nextState;
    });
    showMessage(addedCheckIn ? "Note saved. Check-in added." : "Note saved.");
  }

  function editNote(noteId: string, input: Pick<NovelNote, "content">) {
    if (!input.content.trim()) {
      showMessage("Note cannot be empty.");
      return;
    }

    setState((current) => {
      const nextNotes = current.notes.map((note) => {
        if (note.id !== noteId) return note;
        return { ...note, content: input.content.trim() };
      });

      return { ...current, notes: nextNotes };
    });
    showMessage("Note updated.");
  }

  function toggleNotePin(noteId: string) {
    setState((current) => {
      const nextNotes = current.notes.map((note) => {
        if (note.id !== noteId) return note;
        return { ...note, pinned: !note.pinned };
      });

      return { ...current, notes: nextNotes };
    });
    showMessage("Note pin updated.");
  }

  function softDeleteNovel(novelId: string) {
    setState((current) => {
      const nextNovels = current.novels.map((novel) => {
        if (novel.id !== novelId) return novel;
        return { ...novel, tags: withDeletedTag(novel.tags) };
      });
      return { ...current, novels: nextNovels };
    });
    showMessage("Novel deleted.");
  }

  function softDeleteNote(noteId: string) {
    setState((current) => {
      const nextNotes = current.notes.map((note) => {
        if (note.id !== noteId) return note;
        return { ...note, tags: withDeletedTag(note.tags) };
      });
      return { ...current, notes: nextNotes };
    });
    showMessage("Note deleted.");
  }

  return {
    ready,
    state,
    streak,
    checkInDates,
    validDates,
    message,
    messageKind,
    syncMode,
    cloudUserId,
    addNovel,
    ensureNovel,
    addWord,
    editWord,
    addCharacter,
    editCharacter,
    addNote,
    editNote,
    toggleNotePin,
    softDeleteNovel,
    softDeleteNote,
    checkIn
  };
}

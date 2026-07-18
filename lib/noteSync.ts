import type { NovelNote } from "@/lib/types";

// A note is considered "unsynced" (not saved to cloud) when it has never been
// synced, or when it has been edited locally since the last successful sync.
// The comparison uses updatedAt (falling back to createdAt) vs syncedAt.
export function isNoteUnsynced(note: NovelNote): boolean {
  if (!note.syncedAt) return true;
  const lastEdit = note.updatedAt ?? note.createdAt;
  return lastEdit > note.syncedAt;
}

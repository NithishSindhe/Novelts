import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { upsertCheckIn, upsertNotes } from "@/lib/server/trackerRepo";
import { isDateAllowedForCheckIn } from "@/lib/date";
import { logServerError } from "@/lib/server/log";

// Per-note save endpoint. Persists one or more individual notes without a
// whole-state replace, backing the explicit "Save to cloud" action.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { notes?: unknown };
  try {
    body = (await request.json()) as { notes?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const savedIds = await upsertNotes(userId, body.notes);

    // Saving a note counts as activity for that note's day. Check in once per
    // distinct in-window date among the saved notes. Additive and idempotent;
    // failure here must not fail the note save.
    try {
      const savedIdSet = new Set(savedIds);
      const notes = Array.isArray(body.notes)
        ? (body.notes as Array<{ id?: unknown; date?: unknown }>)
        : [];
      const dates = new Set<string>();
      for (const note of notes) {
        if (
          note &&
          typeof note.id === "string" &&
          savedIdSet.has(note.id) &&
          typeof note.date === "string" &&
          isDateAllowedForCheckIn(note.date)
        ) {
          dates.add(note.date);
        }
      }
      for (const date of dates) {
        await upsertCheckIn(userId, date, "note");
      }
    } catch (checkInError) {
      logServerError("POST /api/tracker/notes check-in", checkInError);
    }

    return NextResponse.json({ ok: true, savedIds });
  } catch (error) {
    logServerError("POST /api/tracker/notes", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

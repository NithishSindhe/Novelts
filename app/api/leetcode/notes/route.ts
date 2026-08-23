import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { upsertLeetcodeNote, type LeetcodeNoteKind } from "@/lib/server/leetcodeRepo";
import { upsertCheckIn } from "@/lib/server/trackerRepo";
import { dateIdFromLocal, isDateAllowedForCheckIn } from "@/lib/date";
import { logServerError } from "@/lib/server/log";

// Per-note save endpoint for LeetCode problem/pattern notes. Persists (or, when
// the note is empty, deletes) a single note without touching the whole-state
// sync of solved/attempts. Backs the explicit "Save to cloud" action.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { kind?: unknown; key?: unknown; note?: unknown; updatedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== "problem" && kind !== "pattern") {
    return NextResponse.json({ error: "Invalid note kind" }, { status: 400 });
  }
  if (typeof body.key !== "string" || body.key.length === 0) {
    return NextResponse.json({ error: "Missing note key" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note : "";
  const updatedAt = typeof body.updatedAt === "string" ? body.updatedAt : undefined;

  try {
    const savedAt = await upsertLeetcodeNote(userId, kind as LeetcodeNoteKind, body.key, note, updatedAt);

    // Writing a note counts as activity for that day. Skip clears/deletes (an
    // empty note removes the row). Additive and idempotent; failure here must
    // not fail the note save.
    if (note.trim().length > 0) {
      try {
        const date = dateIdFromLocal(new Date(savedAt));
        if (isDateAllowedForCheckIn(date)) {
          await upsertCheckIn(userId, date, "note");
        }
      } catch (checkInError) {
        logServerError("POST /api/leetcode/notes check-in", checkInError);
      }
    }

    return NextResponse.json({ ok: true, savedAt });
  } catch (error) {
    logServerError("POST /api/leetcode/notes", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

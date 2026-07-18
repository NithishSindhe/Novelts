import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { upsertNotes } from "@/lib/server/trackerRepo";
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
    return NextResponse.json({ ok: true, savedIds });
  } catch (error) {
    logServerError("POST /api/tracker/notes", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { upsertLeetcodeNote, type LeetcodeNoteKind } from "@/lib/server/leetcodeRepo";
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
    return NextResponse.json({ ok: true, savedAt });
  } catch (error) {
    logServerError("POST /api/leetcode/notes", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

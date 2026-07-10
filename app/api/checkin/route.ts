import { NextResponse } from "next/server";
import { isDateAllowedForCheckIn } from "@/lib/date";
import { resolveUserId } from "@/lib/server/authUser";
import { logActivityEvent, upsertCheckIn } from "@/lib/server/trackerRepo";
import type { CheckInSource } from "@/lib/types";

const ALLOWED_SOURCES: CheckInSource[] = ["manual", "note", "leetcode"];

// Generic, additive check-in endpoint. Any feature can call this to mark a
// day as checked-in and (optionally) log an activity event for that day,
// without touching the rest of the user's tracker state. Unlike PUT
// /api/tracker, this never deletes or replaces existing data.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    date?: unknown;
    source?: unknown;
    kind?: unknown;
    refKey?: unknown;
    metadata?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : null;
  if (!date || !isDateAllowedForCheckIn(date)) {
    return NextResponse.json(
      { error: "date must be today, yesterday, or two days ago." },
      { status: 400 }
    );
  }

  const source = typeof body.source === "string" ? (body.source as CheckInSource) : "manual";
  if (!ALLOWED_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid check-in source." }, { status: 400 });
  }

  try {
    await upsertCheckIn(userId, date, source);

    if (typeof body.kind === "string") {
      await logActivityEvent(userId, {
        date,
        kind: body.kind,
        refKey: typeof body.refKey === "string" ? body.refKey : undefined,
        metadata:
          body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
            ? (body.metadata as Record<string, unknown>)
            : undefined
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

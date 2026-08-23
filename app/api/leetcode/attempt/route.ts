import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { addAttempt } from "@/lib/server/leetcodeRepo";
import { recordLeetcodeAttemptEvent } from "@/lib/server/activityRepo";
import { logServerError } from "@/lib/server/log";

// Interactive, single-attempt append. Backs the "record attempt" action so each
// attempt is an O(1) append instead of a whole-state resync. Append-only:
// duplicate timestamps are ignored server-side.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { key?: unknown; attemptedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (typeof body.key !== "string" || body.key.length === 0) {
    return NextResponse.json({ error: "Missing problem key" }, { status: 400 });
  }
  const attemptedAt = typeof body.attemptedAt === "string" ? body.attemptedAt : undefined;

  try {
    const savedAt = await addAttempt(userId, body.key, attemptedAt);
    await recordLeetcodeAttemptEvent(userId, body.key, savedAt);
    return NextResponse.json({ ok: true, savedAt });
  } catch (error) {
    logServerError("POST /api/leetcode/attempt", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

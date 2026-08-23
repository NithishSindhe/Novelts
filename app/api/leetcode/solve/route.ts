import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { setSolved } from "@/lib/server/leetcodeRepo";
import { recordLeetcodeSolvedEvent } from "@/lib/server/activityRepo";
import { upsertCheckIn } from "@/lib/server/trackerRepo";
import { dateIdFromLocal, isDateAllowedForCheckIn } from "@/lib/date";
import { logServerError } from "@/lib/server/log";

// Interactive, single-problem solved toggle. Backs the "mark solved" action so
// a solve/un-solve is an O(1) write instead of a whole-state resync. Un-solving
// removes only the solved row; attempt history is preserved server-side.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { key?: unknown; solved?: unknown; solvedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (typeof body.key !== "string" || body.key.length === 0) {
    return NextResponse.json({ error: "Missing problem key" }, { status: 400 });
  }
  if (typeof body.solved !== "boolean") {
    return NextResponse.json({ error: "Missing solved flag" }, { status: 400 });
  }
  const solvedAt = typeof body.solvedAt === "string" ? body.solvedAt : undefined;

  try {
    const effectiveAt = await setSolved(userId, body.key, body.solved, solvedAt);
    await recordLeetcodeSolvedEvent(userId, body.key, body.solved, effectiveAt || undefined);

    // Marking a problem solved counts as activity for that day. Additive and
    // idempotent; failure here must not fail the solve write.
    if (body.solved && effectiveAt) {
      try {
        const date = dateIdFromLocal(new Date(effectiveAt));
        if (isDateAllowedForCheckIn(date)) {
          await upsertCheckIn(userId, date, "leetcode");
        }
      } catch (checkInError) {
        logServerError("POST /api/leetcode/solve check-in", checkInError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("POST /api/leetcode/solve", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

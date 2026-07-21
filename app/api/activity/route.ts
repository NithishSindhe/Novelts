import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { readActivityFeed } from "@/lib/server/activityRepo";
import { logServerError } from "@/lib/server/log";

// Dedicated, read-only feed endpoint. Backed by public.activity_events, which is
// materialized at write time from the shared buildActivityFeed derivation. This
// is a single indexed query (user_id + ts desc) rather than the former 9-query
// full-state fan-out + in-memory derivation.
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const events = await readActivityFeed(userId);
    return NextResponse.json({ events });
  } catch (error) {
    logServerError("GET /api/activity", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

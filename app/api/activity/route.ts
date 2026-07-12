import { NextResponse } from "next/server";
import { buildActivityFeed } from "@/lib/activityFeed";
import { resolveUserId } from "@/lib/server/authUser";
import { readLeetcodeState } from "@/lib/server/leetcodeRepo";
import { readTrackerState } from "@/lib/server/trackerRepo";
import { logServerError } from "@/lib/server/log";

// Dedicated, read-only feed endpoint. It queries the full persisted state
// (novels/words/characters/notes + LeetCode progress/notes) and derives the
// GitHub-style recent-activity list server-side, so a page load never misses
// activity that another hook happened not to fetch.
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const [tracker, leetcode] = await Promise.all([readTrackerState(userId), readLeetcodeState(userId)]);
    const events = buildActivityFeed(tracker, leetcode);
    return NextResponse.json({ events });
  } catch (error) {
    logServerError("GET /api/activity", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

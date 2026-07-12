import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { readTrackerState, writeTrackerState } from "@/lib/server/trackerRepo";
import { logServerError } from "@/lib/server/log";

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const state = await readTrackerState(userId);
    return NextResponse.json({ state });
  } catch (error) {
    logServerError("GET /api/tracker", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { state?: unknown };
  try {
    body = (await request.json()) as { state?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    await writeTrackerState(userId, body.state);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("PUT /api/tracker", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

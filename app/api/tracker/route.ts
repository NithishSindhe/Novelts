import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { emptyState, normalizeTrackerState } from "@/lib/storage";
import { getSupabaseAdmin, type SupabaseJson } from "@/lib/server/supabaseAdmin";

async function resolveUserId(): Promise<string | null> {
  try {
    const authState = await auth();
    if (authState.userId) return authState.userId;
  } catch (error:unknown) {
    console.log(error)
    // Clerk not configured yet.
  }

  return null;
}

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tracker_states")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as { state?: unknown } | null;
    return NextResponse.json({ state: normalizeTrackerState(row?.state ?? emptyState) });
  } catch (error) {
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

  const state = normalizeTrackerState(body.state);
  const statePayload = state as unknown as SupabaseJson;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("tracker_states").upsert(
      {
        user_id: userId,
        username: userId,
        state: statePayload,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.log('here:',error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

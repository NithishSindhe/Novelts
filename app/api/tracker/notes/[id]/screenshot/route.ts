import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/server/authUser";
import { readNoteScreenshot } from "@/lib/server/trackerRepo";
import { logServerError } from "@/lib/server/log";

// Lazy-load a single note's screenshot. The bulk GET /api/tracker read omits
// screenshot_data_url (potentially large base64) so page loads stay light; the
// note UI fetches the image here only when a note with a screenshot is opened.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing note id" }, { status: 400 });
  }

  try {
    const screenshotDataUrl = await readNoteScreenshot(userId, id);
    return NextResponse.json({ screenshotDataUrl });
  } catch (error) {
    logServerError("GET /api/tracker/notes/[id]/screenshot", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

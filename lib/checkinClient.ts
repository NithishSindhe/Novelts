import type { CheckInSource } from "@/lib/types";

export interface MarkCheckInInput {
  date: string;
  source: CheckInSource;
  kind?: string;
  refKey?: string;
  metadata?: Record<string, unknown>;
}

// Reusable client for the generic, additive check-in API. Any feature
// (LeetCode, and anything added later) can call this to mark today as
// checked-in and optionally log an activity event, without depending on the
// tracker's whole-state sync. Resolves to `true` on success.
export async function markCheckIn(input: MarkCheckInInput): Promise<boolean> {
  try {
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    return response.ok;
  } catch {
    return false;
  }
}

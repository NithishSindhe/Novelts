import { getDb } from "@/lib/server/db";
import {
  deriveActivityEvents,
  renderEvent,
  type ActivityEvent,
  type ActivityKind,
  type DerivedActivityEvent
} from "@/lib/activityFeed";
import type { LeetcodeState } from "@/lib/leetcodeStorage";
import type { TrackerState } from "@/lib/types";

const TRACKER_KINDS: ActivityKind[] = ["novel_added", "novel_content", "novel_note"];
const LEETCODE_KINDS: ActivityKind[] = [
  "leetcode_solved",
  "leetcode_attempt",
  "leetcode_problem_note",
  "leetcode_pattern_note"
];

// Empty state shims so a single-source write can derive only its own events
// without needing the other half of the user's state.
const EMPTY_TRACKER: TrackerState = { novels: [], notes: [], words: [], characters: [], checkIns: {} };
const EMPTY_LEETCODE: LeetcodeState = {
  solved: {},
  solvedAt: {},
  attempts: {},
  problemNotes: {},
  patternNotes: {},
  problemNotesUpdatedAt: {},
  patternNotesUpdatedAt: {},
  problemNotesSyncedAt: {},
  patternNotesSyncedAt: {}
};

// Materialize the given derived events into public.activity_events, pruning only
// the supplied `kinds` for this user first. Idempotent: events carry a
// deterministic `event_key`, so a re-sync of unchanged state yields identical
// rows. Pruning is scoped to `kinds` so the legacy check-in events written by
// /api/checkin (separate namespace, event_key null) are never touched, and a
// tracker sync never clobbers LeetCode events (or vice versa). `date` mirrors
// the YYYY-MM-DD prefix of the timestamp for consistency with check-in rows.
async function materialize(
  userId: string,
  kinds: ActivityKind[],
  events: DerivedActivityEvent[]
): Promise<void> {
  const sql = getDb();

  const statements = [
    sql`
      delete from public.activity_events
      where user_id = ${userId}
        and event_key is not null
        and kind = any(${kinds as unknown as string[]})
    `
  ];

  for (const event of events) {
    // Only persist events that currently render (skip stale catalog refs / empty
    // content buckets) so the stored feed matches what a reader would see.
    if (!renderEvent(event)) continue;
    const date = event.timestamp.slice(0, 10);
    statements.push(sql`
      insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
      values (
        ${userId},
        ${event.id},
        ${event.kind},
        ${event.timestamp}::timestamptz,
        ${date},
        ${JSON.stringify(event.metadata ?? {})}
      )
      on conflict (user_id, event_key) where event_key is not null
        do update set kind = excluded.kind, ts = excluded.ts, date = excluded.date, metadata = excluded.metadata
    `);
  }

  await sql.transaction(statements);
}

// Materialize the tracker-derived feed events (novels/words/characters/notes).
export async function materializeTrackerEvents(userId: string, tracker: TrackerState): Promise<void> {
  await materialize(userId, TRACKER_KINDS, deriveActivityEvents(tracker, EMPTY_LEETCODE));
}

// Materialize the LeetCode-derived feed events (solves/attempts/notes).
export async function materializeLeetcodeEvents(userId: string, leetcode: LeetcodeState): Promise<void> {
  await materialize(userId, LEETCODE_KINDS, deriveActivityEvents(EMPTY_TRACKER, leetcode));
}

// Single indexed read that backs GET /api/activity. Replaces the previous
// 9-query full-state fan-out + in-memory derivation.
export async function readActivityFeed(userId: string, limit = 20): Promise<ActivityEvent[]> {
  const sql = getDb();
  const rows = (await sql`
    select event_key, kind, ts, metadata
    from public.activity_events
    where user_id = ${userId} and event_key is not null
    order by ts desc
    limit ${limit}
  `) as Array<Record<string, unknown>>;

  return rows
    .map((row) => {
      const derived: DerivedActivityEvent = {
        id: String(row.event_key),
        kind: row.kind as ActivityKind,
        timestamp: new Date(row.ts as string).toISOString(),
        metadata: (row.metadata as Record<string, unknown>) ?? {}
      };
      return renderEvent(derived);
    })
    .filter((event): event is ActivityEvent => event !== null);
}

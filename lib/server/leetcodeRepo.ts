import { getDb } from "@/lib/server/db";
import { materializeLeetcodeEvents } from "@/lib/server/activityRepo";
import { clampToLimit, LEETCODE_PATTERN_NOTE_MAX, LEETCODE_PROBLEM_NOTE_MAX } from "@/lib/limits";
import { normalizeState, type LeetcodeState } from "@/lib/leetcodeStorage";

async function ensureUser(userId: string): Promise<void> {
  const sql = getDb();
  await sql`
    insert into public.users (user_id, username)
    values (${userId}, ${userId})
    on conflict (user_id) do nothing
  `;
}

export async function readLeetcodeState(userId: string): Promise<LeetcodeState> {
  const sql = getDb();

  const [solved, attempts, problemNotes, patternNotes] = await Promise.all([
    sql`select problem_key, solved_at from public.leetcode_solved where user_id = ${userId}`,
    sql`select problem_key, attempted_at from public.leetcode_attempts where user_id = ${userId} order by attempted_at asc`,
    sql`select problem_key, note, updated_at from public.leetcode_problem_notes where user_id = ${userId}`,
    sql`select pattern_key, note, updated_at from public.leetcode_pattern_notes where user_id = ${userId}`
  ]);

  const solvedRows = solved as Record<string, unknown>[];
  const attemptRows = attempts as Record<string, unknown>[];

  const state: LeetcodeState = {
    solved: solvedRows.reduce<Record<string, boolean>>((acc, row) => {
      acc[String(row.problem_key)] = true;
      return acc;
    }, {}),
    solvedAt: solvedRows.reduce<Record<string, string>>((acc, row) => {
      if (row.solved_at != null) {
        acc[String(row.problem_key)] = new Date(row.solved_at as string).toISOString();
      }
      return acc;
    }, {}),
    attempts: attemptRows.reduce<Record<string, string[]>>((acc, row) => {
      if (row.attempted_at == null) return acc;
      const key = String(row.problem_key);
      const list = acc[key] ?? [];
      list.push(new Date(row.attempted_at as string).toISOString());
      acc[key] = list;
      return acc;
    }, {}),
    problemNotes: (problemNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      acc[String(row.problem_key)] = String(row.note);
      return acc;
    }, {}),
    patternNotes: (patternNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      acc[String(row.pattern_key)] = String(row.note);
      return acc;
    }, {}),
    problemNotesUpdatedAt: (problemNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      if (row.updated_at != null) {
        acc[String(row.problem_key)] = new Date(row.updated_at as string).toISOString();
      }
      return acc;
    }, {}),
    patternNotesUpdatedAt: (patternNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      if (row.updated_at != null) {
        acc[String(row.pattern_key)] = new Date(row.updated_at as string).toISOString();
      }
      return acc;
    }, {}),
    // Client-only sync markers; never persisted server-side. The client stamps
    // these on read (a cloud note is, by definition, saved).
    problemNotesSyncedAt: {},
    patternNotesSyncedAt: {}
  };

  return normalizeState(state);
}

export async function writeLeetcodeState(userId: string, input: unknown): Promise<void> {
  const state = normalizeState(input);
  const sql = getDb();

  await ensureUser(userId);

  // NOTE: problem/pattern notes are intentionally NOT written here. They are
  // persisted only via upsertLeetcodeNote (the /api/leetcode/notes route) so
  // that the periodic whole-state sync of solved/attempts can never clobber a
  // cloud note that was saved explicitly. Deleting notes here would wipe them.
  const statements = [
    sql`delete from public.leetcode_solved where user_id = ${userId}`,
    sql`delete from public.leetcode_attempts where user_id = ${userId}`
  ];

  for (const key of Object.keys(state.solved)) {
    const solvedAt = state.solvedAt[key] ?? null;
    statements.push(sql`
      insert into public.leetcode_solved (user_id, problem_key, solved_at)
      values (${userId}, ${key}, coalesce(${solvedAt}::timestamptz, timezone('utc', now())))
    `);
  }

  for (const [key, timestamps] of Object.entries(state.attempts)) {
    for (const attemptedAt of timestamps) {
      statements.push(sql`
        insert into public.leetcode_attempts (user_id, problem_key, attempted_at)
        values (${userId}, ${key}, ${attemptedAt}::timestamptz)
        on conflict (user_id, problem_key, attempted_at) do nothing
      `);
    }
  }

  await sql.transaction(statements);

  // Materialize the derived activity feed from the full incoming state (solves,
  // attempts, and note timestamps). Outside the transaction so a feed hiccup
  // never fails a state save.
  await materializeLeetcodeEvents(userId, state);
}

export type LeetcodeNoteKind = "problem" | "pattern";

// Persist a single problem- or pattern-scoped note. An empty note deletes the
// row (clearing a note removes it from the cloud). Non-empty notes are upserted
// on the composite primary key so repeated saves update in place. Returns the
// ISO timestamp the row was written with (or the delete time) so the client can
// stamp its syncedAt marker.
export async function upsertLeetcodeNote(
  userId: string,
  kind: LeetcodeNoteKind,
  key: string,
  note: string,
  updatedAt?: string
): Promise<string> {
  const sql = getDb();
  await ensureUser(userId);

  const trimmed = note.trim();
  const savedAt = updatedAt && !Number.isNaN(Date.parse(updatedAt)) ? updatedAt : new Date().toISOString();

  if (kind === "problem") {
    if (trimmed.length === 0) {
      await sql`delete from public.leetcode_problem_notes where user_id = ${userId} and problem_key = ${key}`;
      return savedAt;
    }
    const clamped = clampToLimit(note, LEETCODE_PROBLEM_NOTE_MAX);
    await sql`
      insert into public.leetcode_problem_notes (user_id, problem_key, note, updated_at)
      values (${userId}, ${key}, ${clamped}, ${savedAt}::timestamptz)
      on conflict (user_id, problem_key)
        do update set note = excluded.note, updated_at = excluded.updated_at
    `;
    return savedAt;
  }

  if (trimmed.length === 0) {
    await sql`delete from public.leetcode_pattern_notes where user_id = ${userId} and pattern_key = ${key}`;
    return savedAt;
  }
  const clamped = clampToLimit(note, LEETCODE_PATTERN_NOTE_MAX);
  await sql`
    insert into public.leetcode_pattern_notes (user_id, pattern_key, note, updated_at)
    values (${userId}, ${key}, ${clamped}, ${savedAt}::timestamptz)
    on conflict (user_id, pattern_key)
      do update set note = excluded.note, updated_at = excluded.updated_at
  `;
  return savedAt;
}

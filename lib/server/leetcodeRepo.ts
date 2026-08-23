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

// Reconcile the full LeetCode progress state against what is already persisted,
// writing only the differences. This is the whole-state safety-net path (used
// for local -> cloud reconciliation); the common interactive writes go through
// setSolved / addAttempt below.
//
// Cost is proportional to what actually changed, not to the user's total
// history: unchanged solves/attempts produce no writes at all.
//
// Invariants:
//   - Attempts are append-only. They are NEVER deleted here, even when a
//     problem is un-solved.
//   - problem/pattern notes are intentionally NOT written here. They are
//     persisted only via upsertLeetcodeNote (the /api/leetcode/notes route) so
//     that this whole-state sync can never clobber a cloud note saved
//     explicitly.
export async function writeLeetcodeState(userId: string, input: unknown): Promise<void> {
  const state = normalizeState(input);
  const sql = getDb();

  await ensureUser(userId);

  // Snapshot current DB state so we can diff against the incoming state.
  const [solvedRows, attemptRows] = await Promise.all([
    sql`select problem_key from public.leetcode_solved where user_id = ${userId}`,
    sql`select problem_key, attempted_at from public.leetcode_attempts where user_id = ${userId}`
  ]);

  const dbSolved = new Set((solvedRows as Array<{ problem_key: string }>).map((row) => row.problem_key));
  const incomingSolved = new Set(Object.keys(state.solved));

  // Existing attempt tuples, keyed by `${problem_key}\u0000${epochMs}` so we can
  // skip re-inserting timestamps that are already stored.
  const dbAttempts = new Set(
    (attemptRows as Array<{ problem_key: string; attempted_at: string }>).map(
      (row) => `${row.problem_key}\u0000${new Date(row.attempted_at).getTime()}`
    )
  );

  const statements = [];

  // Solved: insert newly-solved keys, delete keys that are no longer solved.
  for (const key of incomingSolved) {
    if (dbSolved.has(key)) continue;
    const solvedAt = state.solvedAt[key] ?? null;
    statements.push(sql`
      insert into public.leetcode_solved (user_id, problem_key, solved_at)
      values (${userId}, ${key}, coalesce(${solvedAt}::timestamptz, timezone('utc', now())))
      on conflict (user_id, problem_key) do nothing
    `);
  }
  for (const key of dbSolved) {
    if (incomingSolved.has(key)) continue;
    statements.push(sql`
      delete from public.leetcode_solved where user_id = ${userId} and problem_key = ${key}
    `);
  }

  // Attempts: append-only. Insert only tuples not already stored; never delete.
  for (const [key, timestamps] of Object.entries(state.attempts)) {
    for (const attemptedAt of timestamps) {
      const ms = Date.parse(attemptedAt);
      if (Number.isNaN(ms)) continue;
      if (dbAttempts.has(`${key}\u0000${ms}`)) continue;
      statements.push(sql`
        insert into public.leetcode_attempts (user_id, problem_key, attempted_at)
        values (${userId}, ${key}, ${attemptedAt}::timestamptz)
        on conflict (user_id, problem_key, attempted_at) do nothing
      `);
    }
  }

  if (statements.length) {
    await sql.transaction(statements);
  }

  // Materialize the derived activity feed from the full incoming state (solves,
  // attempts, and note timestamps). Outside the transaction so a feed hiccup
  // never fails a state save.
  await materializeLeetcodeEvents(userId, state);
}

// Toggle a single problem's solved status. O(1) write used by the interactive
// /api/leetcode/solve endpoint. Un-solving deletes only the solved row; the
// problem's attempt history is intentionally preserved. Returns the effective
// solved-at timestamp used (empty string on un-solve) so the caller can
// materialize a matching activity-feed event.
export async function setSolved(
  userId: string,
  key: string,
  solved: boolean,
  solvedAt?: string
): Promise<string> {
  const sql = getDb();
  await ensureUser(userId);

  if (!solved) {
    await sql`delete from public.leetcode_solved where user_id = ${userId} and problem_key = ${key}`;
    return "";
  }

  const at = solvedAt && !Number.isNaN(Date.parse(solvedAt)) ? solvedAt : new Date().toISOString();
  await sql`
    insert into public.leetcode_solved (user_id, problem_key, solved_at)
    values (${userId}, ${key}, ${at}::timestamptz)
    on conflict (user_id, problem_key) do nothing
  `;
  return at;
}

// Append a single attempt timestamp for a problem. O(1) append used by the
// interactive /api/leetcode/attempt endpoint. Duplicate timestamps are ignored.
export async function addAttempt(userId: string, key: string, attemptedAt?: string): Promise<string> {
  const sql = getDb();
  await ensureUser(userId);

  const at = attemptedAt && !Number.isNaN(Date.parse(attemptedAt)) ? attemptedAt : new Date().toISOString();
  await sql`
    insert into public.leetcode_attempts (user_id, problem_key, attempted_at)
    values (${userId}, ${key}, ${at}::timestamptz)
    on conflict (user_id, problem_key, attempted_at) do nothing
  `;
  return at;
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

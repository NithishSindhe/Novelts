import { getDb } from "@/lib/server/db";
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
    }, {})
  };

  return normalizeState(state);
}

export async function writeLeetcodeState(userId: string, input: unknown): Promise<void> {
  const state = normalizeState(input);
  const sql = getDb();

  await ensureUser(userId);

  const statements = [
    sql`delete from public.leetcode_solved where user_id = ${userId}`,
    sql`delete from public.leetcode_attempts where user_id = ${userId}`,
    sql`delete from public.leetcode_problem_notes where user_id = ${userId}`,
    sql`delete from public.leetcode_pattern_notes where user_id = ${userId}`
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

  for (const [key, note] of Object.entries(state.problemNotes)) {
    // Server-side guard rail against oversized notes sent directly to the API.
    const clamped = clampToLimit(note, LEETCODE_PROBLEM_NOTE_MAX);
    const updatedAt = state.problemNotesUpdatedAt[key] ?? null;
    statements.push(sql`
      insert into public.leetcode_problem_notes (user_id, problem_key, note, updated_at)
      values (${userId}, ${key}, ${clamped}, coalesce(${updatedAt}::timestamptz, timezone('utc', now())))
    `);
  }

  for (const [patternKey, note] of Object.entries(state.patternNotes)) {
    const clamped = clampToLimit(note, LEETCODE_PATTERN_NOTE_MAX);
    const updatedAt = state.patternNotesUpdatedAt[patternKey] ?? null;
    statements.push(sql`
      insert into public.leetcode_pattern_notes (user_id, pattern_key, note, updated_at)
      values (${userId}, ${patternKey}, ${clamped}, coalesce(${updatedAt}::timestamptz, timezone('utc', now())))
    `);
  }

  await sql.transaction(statements);
}

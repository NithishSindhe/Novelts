import { getDb } from "@/lib/server/db";
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

  const [solved, problemNotes, patternNotes] = await Promise.all([
    sql`select problem_key from public.leetcode_solved where user_id = ${userId}`,
    sql`select problem_key, note from public.leetcode_problem_notes where user_id = ${userId}`,
    sql`select pattern_id, note from public.leetcode_pattern_notes where user_id = ${userId}`
  ]);

  const state: LeetcodeState = {
    solved: (solved as Record<string, unknown>[]).reduce<Record<string, boolean>>((acc, row) => {
      acc[String(row.problem_key)] = true;
      return acc;
    }, {}),
    problemNotes: (problemNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      acc[String(row.problem_key)] = String(row.note);
      return acc;
    }, {}),
    patternNotes: (patternNotes as Record<string, unknown>[]).reduce<Record<string, string>>((acc, row) => {
      acc[String(row.pattern_id)] = String(row.note);
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
    sql`delete from public.leetcode_problem_notes where user_id = ${userId}`,
    sql`delete from public.leetcode_pattern_notes where user_id = ${userId}`
  ];

  for (const key of Object.keys(state.solved)) {
    statements.push(sql`
      insert into public.leetcode_solved (user_id, problem_key)
      values (${userId}, ${key})
    `);
  }

  for (const [key, note] of Object.entries(state.problemNotes)) {
    statements.push(sql`
      insert into public.leetcode_problem_notes (user_id, problem_key, note)
      values (${userId}, ${key}, ${note})
    `);
  }

  for (const [patternId, note] of Object.entries(state.patternNotes)) {
    const numericId = Number(patternId);
    if (!Number.isFinite(numericId)) continue;
    statements.push(sql`
      insert into public.leetcode_pattern_notes (user_id, pattern_id, note)
      values (${userId}, ${numericId}, ${note})
    `);
  }

  await sql.transaction(statements);
}

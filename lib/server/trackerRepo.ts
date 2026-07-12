import { getDb } from "@/lib/server/db";
import { clampToLimit, NOVEL_NOTE_MAX } from "@/lib/limits";
import { emptyState, normalizeTrackerState } from "@/lib/storage";
import type { CharacterEntry, CheckInRecord, CheckInSource, Novel, NovelNote, TrackerState, WordEntry } from "@/lib/types";

async function ensureUser(userId: string): Promise<void> {
  const sql = getDb();
  await sql`
    insert into public.users (user_id, username)
    values (${userId}, ${userId})
    on conflict (user_id) do nothing
  `;
}

// Additive, idempotent check-in: unions the new source into any existing
// record for that day rather than replacing it. Safe to call from any
// feature (LeetCode, future features, etc.) without touching the rest of the
// user's tracker state.
export async function upsertCheckIn(userId: string, date: string, source: CheckInSource): Promise<void> {
  const sql = getDb();
  await ensureUser(userId);
  await sql`
    insert into public.check_ins (user_id, date, sources)
    values (${userId}, ${date}, ${[source]})
    on conflict (user_id, date) do update
    set sources = (
      select array_agg(distinct s)
      from unnest(public.check_ins.sources || excluded.sources) as s
    )
  `;
}

// Append-only log entry so "what happened on day X" can be answered with a
// single query regardless of which feature recorded the event.
export async function logActivityEvent(
  userId: string,
  input: { date: string; kind: string; refKey?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const sql = getDb();
  await ensureUser(userId);
  await sql`
    insert into public.activity_events (user_id, date, kind, ref_key, metadata)
    values (${userId}, ${input.date}, ${input.kind}, ${input.refKey ?? null}, ${JSON.stringify(input.metadata ?? {})})
  `;
}

export async function readTrackerState(userId: string): Promise<TrackerState> {
  const sql = getDb();

  const [novels, notes, words, characters, checkIns] = await Promise.all([
    sql`select id, title, author, tags, created_at from public.novels where user_id = ${userId} order by created_at desc`,
    sql`select id, novel_id, content, date, screenshot_data_url, pinned, tags, created_at from public.notes where user_id = ${userId} order by created_at desc`,
    sql`select id, word, meaning, context, novel_id, date, created_at from public.words where user_id = ${userId} order by created_at desc`,
    sql`select id, name, role, traits, novel_id, date, created_at from public.characters where user_id = ${userId} order by created_at desc`,
    sql`select date, sources, created_at from public.check_ins where user_id = ${userId}`
  ]);

  const state: TrackerState = {
    novels: (novels as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      author: String(row.author ?? ""),
      tags: (row.tags as string[]) ?? [],
      createdAt: new Date(row.created_at as string).toISOString()
    })) as Novel[],
    notes: (notes as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      novelId: String(row.novel_id),
      content: String(row.content),
      date: String(row.date),
      screenshotDataUrl: (row.screenshot_data_url as string | null) ?? undefined,
      pinned: Boolean(row.pinned),
      tags: (row.tags as string[]) ?? [],
      createdAt: new Date(row.created_at as string).toISOString()
    })) as NovelNote[],
    words: (words as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      word: String(row.word),
      meaning: String(row.meaning ?? ""),
      context: String(row.context ?? ""),
      novelId: (row.novel_id as string | null) ?? undefined,
      date: String(row.date),
      createdAt: new Date(row.created_at as string).toISOString()
    })) as WordEntry[],
    characters: (characters as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      role: String(row.role ?? ""),
      traits: String(row.traits ?? ""),
      novelId: (row.novel_id as string | null) ?? undefined,
      date: String(row.date),
      createdAt: new Date(row.created_at as string).toISOString()
    })) as CharacterEntry[],
    checkIns: (checkIns as Record<string, unknown>[]).reduce<Record<string, CheckInRecord>>((acc, row) => {
      const date = String(row.date);
      acc[date] = {
        date,
        sources: (row.sources as CheckInRecord["sources"]) ?? [],
        createdAt: new Date(row.created_at as string).toISOString()
      };
      return acc;
    }, {})
  };

  return normalizeTrackerState(state);
}

export async function writeTrackerState(userId: string, input: unknown): Promise<void> {
  const state = normalizeTrackerState(input);
  const sql = getDb();

  await ensureUser(userId);

  // The set of valid novel ids, used to keep note/word/character FKs valid.
  const novelIds = new Set(state.novels.map((novel) => novel.id));
  const novelIdOrNull = (novelId?: string) => (novelId && novelIds.has(novelId) ? novelId : null);
  const nowIso = () => new Date().toISOString();
  const createdAt = (value?: string) => value || nowIso();

  // Replace-all for this user, transactionally: clear then re-insert.
  // Deleting the novels cascades to notes/words/characters, so we clear the
  // leaf tables explicitly first only for rows that reference no novel.
  // Note: check_ins are intentionally NOT deleted here. They are synced
  // additively (upsert below) so that check-ins recorded by other features
  // (e.g. LeetCode via /api/checkin) are not wiped by the tracker's
  // whole-state replace.
  const statements = [
    sql`delete from public.notes where user_id = ${userId}`,
    sql`delete from public.words where user_id = ${userId}`,
    sql`delete from public.characters where user_id = ${userId}`,
    sql`delete from public.novels where user_id = ${userId}`
  ];

  for (const novel of state.novels) {
    statements.push(sql`
      insert into public.novels (id, user_id, title, author, tags, created_at)
      values (${novel.id}, ${userId}, ${novel.title}, ${novel.author ?? ""}, ${novel.tags ?? []}, ${createdAt(novel.createdAt)})
    `);
  }

  for (const note of state.notes) {
    // Server-side guard rail: clamp note content so an oversized payload sent
    // directly to the API cannot exceed the limit enforced in the UI.
    const content = clampToLimit(note.content, NOVEL_NOTE_MAX);
    statements.push(sql`
      insert into public.notes (id, user_id, novel_id, content, date, screenshot_data_url, pinned, tags, created_at)
      values (${note.id}, ${userId}, ${novelIdOrNull(note.novelId)}, ${content}, ${note.date}, ${note.screenshotDataUrl ?? null}, ${note.pinned ?? false}, ${note.tags ?? []}, ${createdAt(note.createdAt)})
    `);
  }

  for (const word of state.words) {
    statements.push(sql`
      insert into public.words (id, user_id, novel_id, word, meaning, context, date, created_at)
      values (${word.id}, ${userId}, ${novelIdOrNull(word.novelId)}, ${word.word}, ${word.meaning ?? ""}, ${word.context ?? ""}, ${word.date}, ${createdAt(word.createdAt)})
    `);
  }

  for (const character of state.characters) {
    statements.push(sql`
      insert into public.characters (id, user_id, novel_id, name, role, traits, date, created_at)
      values (${character.id}, ${userId}, ${novelIdOrNull(character.novelId)}, ${character.name}, ${character.role ?? ""}, ${character.traits ?? ""}, ${character.date}, ${createdAt(character.createdAt)})
    `);
  }

  for (const record of Object.values(state.checkIns)) {
    statements.push(sql`
      insert into public.check_ins (user_id, date, sources, created_at)
      values (${userId}, ${record.date}, ${record.sources ?? []}, ${createdAt(record.createdAt)})
      on conflict (user_id, date) do update
      set sources = (
        select array_agg(distinct s)
        from unnest(public.check_ins.sources || excluded.sources) as s
      )
    `);
  }

  await sql.transaction(statements);
}

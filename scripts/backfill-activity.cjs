// Novelts: one-time backfill of the materialized activity feed.
//
// Populates public.activity_events (event_key + ts + metadata) for all existing
// users from their current tracker/LeetCode rows, using the SAME deterministic
// event_keys that lib/activityFeed.ts (deriveActivityEvents) produces, so the
// backfilled rows are identical to what a future whole-state sync would write
// (the upsert is idempotent on (user_id, event_key)).
//
// Anything referencing an out-of-catalog LeetCode key or an inactive novel is
// dropped at read time by renderEvent(), so this SQL does not need the in-code
// catalog. Ordinary usage re-materializes on the next sync, so this is only
// needed to avoid empty feeds immediately after the 0006 migration.
//
// Usage:  node scripts/backfill-activity.cjs

const fs = require("node:fs");
const path = require("node:path");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

// Each statement inserts one activity_events kind, keyed to match the TS
// derivation. `on conflict (user_id, event_key)` keeps it idempotent/rerunnable.
const STATEMENTS = [
  // novel_added: active novels only ('deleted' tag excluded).
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select user_id, 'novel-added:' || id, 'novel_added', created_at,
          to_char(created_at, 'YYYY-MM-DD'),
          jsonb_build_object('novelId', id, 'title', title)
   from public.novels
   where not ('deleted' = any(tags))
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // novel_note: notes on an active novel, not soft-deleted.
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select n.user_id, 'novel-note:' || n.id, 'novel_note', n.created_at,
          to_char(n.created_at, 'YYYY-MM-DD'),
          jsonb_build_object('novelId', n.novel_id, 'title', nv.title)
   from public.notes n
   join public.novels nv on nv.id = n.novel_id and nv.user_id = n.user_id
   where not ('deleted' = any(n.tags)) and not ('deleted' = any(nv.tags))
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // novel_content: words + characters grouped per (day, novel). Content tied to
  // a soft-deleted novel is excluded; content with no novel is kept (title null).
  `with content as (
     select user_id, date, novel_id, created_at, 1 as words, 0 as characters
     from public.words
     union all
     select user_id, date, novel_id, created_at, 0 as words, 1 as characters
     from public.characters
   ),
   filtered as (
     select c.* from content c
     left join public.novels nv on nv.id = c.novel_id and nv.user_id = c.user_id
     where c.novel_id is null or (nv.id is not null and not ('deleted' = any(nv.tags)))
   ),
   grouped as (
     select user_id, date, novel_id,
            sum(words) as words, sum(characters) as characters,
            max(created_at) as latest
     from filtered
     group by user_id, date, novel_id
   )
   insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select g.user_id,
          'novel-content:' || g.date || '|' || coalesce(g.novel_id, ''),
          'novel_content', g.latest, g.date,
          jsonb_build_object('novelId', nv.id, 'title', nv.title,
                             'words', g.words, 'characters', g.characters)
   from grouped g
   left join public.novels nv on nv.id = g.novel_id and nv.user_id = g.user_id
   where g.words > 0 or g.characters > 0
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // leetcode_solved
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select user_id, 'lc-solved:' || problem_key, 'leetcode_solved',
          coalesce(solved_at, created_at),
          to_char(coalesce(solved_at, created_at), 'YYYY-MM-DD'),
          jsonb_build_object('problemKey', problem_key)
   from public.leetcode_solved
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // leetcode_attempt: one event per recorded attempt.
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select user_id,
          'lc-attempt:' || problem_key || ':' ||
            to_char(attempted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'leetcode_attempt', attempted_at,
          to_char(attempted_at, 'YYYY-MM-DD'),
          jsonb_build_object('problemKey', problem_key)
   from public.leetcode_attempts
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // leetcode_problem_note
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select user_id, 'lc-problem-note:' || problem_key, 'leetcode_problem_note',
          updated_at, to_char(updated_at, 'YYYY-MM-DD'),
          jsonb_build_object('problemKey', problem_key)
   from public.leetcode_problem_notes
   on conflict (user_id, event_key) where event_key is not null do nothing`,

  // leetcode_pattern_note
  `insert into public.activity_events (user_id, event_key, kind, ts, date, metadata)
   select user_id, 'lc-pattern-note:' || pattern_key, 'leetcode_pattern_note',
          updated_at, to_char(updated_at, 'YYYY-MM-DD'),
          jsonb_build_object('patternSlug', pattern_key)
   from public.leetcode_pattern_notes
   on conflict (user_id, event_key) where event_key is not null do nothing`
];

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing from .env.local");

  const { neonConfig, Pool } = require("@neondatabase/serverless");
  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  } else {
    neonConfig.webSocketConstructor = require("ws");
  }

  const pool = new Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    try {
      await client.query("begin");
      let total = 0;
      for (const sql of STATEMENTS) {
        const res = await client.query(sql);
        total += res.rowCount || 0;
      }
      await client.query("commit");
      console.log(`Backfill complete. Inserted ${total} activity event(s).`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

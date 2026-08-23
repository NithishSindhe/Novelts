// Novelts: one-time backfill of missing daily check-ins.
//
// A dedicated /api/checkin endpoint was introduced, but for a few weeks the
// activity endpoints did not call it, so check-in rows were never written for
// days the user was actually active. This reconstructs those check-ins directly
// from the authoritative feature tables:
//
//   notes / words / characters      -> source 'note'
//   leetcode_solved / _attempts     -> source 'leetcode'
//   leetcode_problem/pattern_notes  -> source 'note'  (writing a note counts)
//
// The upsert unions sources on (user_id, date) using the SAME semantics as
// lib/server/trackerRepo.ts:upsertCheckIn, so it is additive (never overwrites
// or deletes existing check-in rows/sources) and safe to re-run.
//
// Usage:  node scripts/backfill-checkins.cjs

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

// Reconstruct one (user_id, date, source) row per unit of activity, group into a
// deduplicated sources array per day, and additively upsert into check_ins.
const BACKFILL_SQL = `
  with activity as (
    select user_id, date, 'note'::text as source
      from public.notes      where date is not null and date <> ''
    union all
    select user_id, date, 'note'
      from public.words      where date is not null and date <> ''
    union all
    select user_id, date, 'note'
      from public.characters where date is not null and date <> ''
    union all
    select user_id, to_char(coalesce(solved_at, created_at), 'YYYY-MM-DD'), 'leetcode'
      from public.leetcode_solved
    union all
    select user_id, to_char(attempted_at, 'YYYY-MM-DD'), 'leetcode'
      from public.leetcode_attempts
    union all
    select user_id, to_char(updated_at, 'YYYY-MM-DD'), 'note'
      from public.leetcode_problem_notes
    union all
    select user_id, to_char(updated_at, 'YYYY-MM-DD'), 'note'
      from public.leetcode_pattern_notes
  )
  insert into public.check_ins (user_id, date, sources)
  select user_id, date, array_agg(distinct source)
  from activity
  where date is not null and date <> ''
  group by user_id, date
  on conflict (user_id, date) do update
  set sources = (
    select array_agg(distinct s)
    from unnest(public.check_ins.sources || excluded.sources) as s
  )
`;

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
      const before = await client.query("select count(*)::int as n from public.check_ins");
      await client.query("begin");
      const res = await client.query(BACKFILL_SQL);
      await client.query("commit");
      const after = await client.query("select count(*)::int as n from public.check_ins");
      console.log(
        `Backfill complete. check_ins rows: ${before.rows[0].n} -> ${after.rows[0].n} ` +
          `(+${after.rows[0].n - before.rows[0].n} new; ${res.rowCount || 0} day(s) processed).`
      );
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

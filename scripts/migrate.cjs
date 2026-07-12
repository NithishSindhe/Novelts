// Migration runner over Neon's HTTPS/WebSocket transport (port 443), used
// because direct TCP :5432 is blocked on this network.
//
// Tracks applied migrations in public.schema_migrations so each file in
// db/migrations runs at most once, in filename order. Each migration and its
// bookkeeping row are applied in a single transaction, so a failure rolls back
// cleanly and the file is NOT recorded as applied.
//
// Backfill: migrations 0001-0004 were applied before this tracker existed. On
// the first run against such a database we seed schema_migrations with the
// already-applied files (detected via a table they created) so only the truly
// pending migrations execute.
//
// Usage:
//   node scripts/migrate.cjs            apply pending migrations
//   node scripts/migrate.cjs --dry-run  list pending migrations, apply nothing

const fs = require("node:fs");
const path = require("node:path");

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

// Files known to predate the migration tracker. If the tracker is empty but the
// database already has their effects, seed these as applied instead of re-running.
const LEGACY_APPLIED = [
  "0001_init.sql",
  "0002_leetcode_solved_at.sql",
  "0003_leetcode_attempts.sql",
  "0004_activity_events.sql",
];

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

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing from .env.local");

  const dryRun = process.argv.includes("--dry-run");

  const { neonConfig, Pool } = require("@neondatabase/serverless");
  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  } else {
    neonConfig.webSocketConstructor = require("ws");
  }

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(`
      create table if not exists public.schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default timezone('utc', now())
      )
    `);

    const appliedRes = await pool.query("select filename from public.schema_migrations");
    const applied = new Set(appliedRes.rows.map((r) => r.filename));

    // First-run backfill: if the tracker is empty but the schema already exists
    // (detected via a table created by a legacy migration), seed the legacy
    // files as applied so we don't re-run non-idempotent statements.
    if (applied.size === 0) {
      const existsRes = await pool.query(`
        select to_regclass('public.leetcode_attempts') is not null as has_legacy
      `);
      if (existsRes.rows[0] && existsRes.rows[0].has_legacy) {
        for (const filename of LEGACY_APPLIED) {
          await pool.query(
            "insert into public.schema_migrations (filename) values ($1) on conflict do nothing",
            [filename]
          );
          applied.add(filename);
        }
        console.log(`Backfilled ${LEGACY_APPLIED.length} pre-tracker migrations as applied.`);
      }
    }

    const pending = listMigrationFiles().filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    if (dryRun) {
      console.log("Pending migrations:");
      for (const f of pending) console.log(`  - ${f}`);
      return;
    }

    for (const filename of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (filename) values ($1)", [filename]);
        await client.query("commit");
        console.log(`Applied: ${filename}`);
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration failed: ${filename}\n${err && err.message ? err.message : err}`);
      } finally {
        client.release();
      }
    }

    console.log(`Done. Applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-off migration runner over Neon's HTTPS/WebSocket transport (port 443),
// used because direct TCP :5432 is blocked on this network.
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

  const sqlFile = process.argv[2];
  if (!sqlFile) throw new Error("Usage: node scripts/apply-migration.cjs <file.sql>");
  const sql = fs.readFileSync(path.join(process.cwd(), sqlFile), "utf8");

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(sql); // simple query protocol supports multiple statements
    console.log(`Applied migration: ${sqlFile}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

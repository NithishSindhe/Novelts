import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Cached Neon HTTP client. The serverless driver talks to Neon over HTTPS,
// which works in every runtime (Node, edge, local dev) and avoids the
// connection-pooling / long-lived-socket concerns of raw TCP Postgres.
let cached: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  cached = neon(url);
  return cached;
}

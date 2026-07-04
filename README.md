# Novelts

Novelts is a local-first novel tracker with authenticated cloud sync.

## Behavior
- If the user is not authenticated, data is stored in browser localStorage.
- If the user is authenticated with Clerk, data is loaded from Neon Postgres and persisted to cloud.
- On sign-in, any anonymous localStorage data is merged into the cloud (union by id), then the local copy is cleared.
- Notes, words, characters, check-ins, and LeetCode progress are all synced while authenticated.

## Routes
- `/` Home dashboard
- `/5` Alias redirect to `/`
- `/novels/[novelId]` Focused novel workspace
- `/leetcode` LeetCode pattern tracker

## Install and run (pnpm)
```bash
pnpm install
pnpm dev
```

## Environment
Create `.env.local` and fill values.

Required for cloud sync (Neon):
- `DATABASE_URL` — Neon Postgres connection string

Required for Clerk auth:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional (local dev only):
- `NEXT_PUBLIC_DEV_CLOUD_USER_ID` — when set (and not signed in via Clerk), the
  app behaves as a signed-in cloud user with this id, so you can exercise cloud
  sync without logging in. Ignored in production builds.

## Database setup (Neon)
1. Create a Neon project and copy its connection string into `.env.local` as `DATABASE_URL`.
2. Apply the schema:
   ```bash
   node scripts/apply-migration.cjs db/migrations/0001_init.sql
   ```
   (Uses the Neon serverless driver over HTTPS, so it works even where direct
   TCP :5432 is blocked. `psql "$DATABASE_URL" -f db/migrations/0001_init.sql`
   also works if you have direct access.)

> Note: the previous Supabase setup files under `supabase/` are kept for
> reference but are no longer used by the app.

## Quality checks (pnpm)
```bash
pnpm lint
pnpm build
```

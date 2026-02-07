# Novelts

Novelts is a local-first novel tracker with authenticated cloud sync.

## Behavior
- If the user is not authenticated, data is stored in browser localStorage.
- If the user is authenticated with Clerk, data is loaded from Supabase and persisted to cloud.
- Notes saved while authenticated are synced to Supabase as part of the user state.

## Routes
- `/` Home dashboard
- `/5` Alias redirect to `/`
- `/novels/[novelId]` Focused novel workspace

## Install and run (pnpm)
```bash
pnpm install
pnpm dev
```

## Environment
Copy `.env.example` to `.env.local` and fill values.

Required for cloud sync:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for Clerk auth:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Supabase setup
1. Create a Supabase project.
2. Create the schema:
   - GUI: open Supabase SQL Editor and run `supabase/schema.sql`
   - CLI: run the migration in `supabase/migrations/20260207234500_tracker_states.sql` with `supabase db push`
3. Add keys to `.env.local`.

## Quality checks (pnpm)
```bash
pnpm lint
pnpm build
```

-- Novelts: generic append-only activity log.
--
-- This table exists so any feature (check-ins, LeetCode attempts/solves, and
-- whatever comes next) can record "something happened on this day" without
-- each feature inventing its own day-indexed query. `date` is the same local
-- YYYY-MM-DD string used by public.check_ins (not a UTC timestamptz cast),
-- so a single `where user_id = ? and date = ?` query reliably answers
-- "what happened on day X" regardless of which feature logged the event.
--
-- Rows are never updated or deleted individually; this is a pure event log.

create table if not exists public.activity_events (
  id         bigint generated always as identity primary key,
  user_id    text not null references public.users(user_id) on delete cascade,
  date       text not null,
  kind       text not null,
  ref_key    text,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists activity_events_user_date_idx
  on public.activity_events(user_id, date);

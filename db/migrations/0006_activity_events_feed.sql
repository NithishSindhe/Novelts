-- Novelts: make activity_events the source of truth for the "Recent activity"
-- feed, materialized at write time from the shared buildActivityFeed derivation.
--
-- Two problems this solves:
--   1. The feed previously re-read the full tracker + LeetCode state (9 queries)
--      and derived events in memory on every load. Now the feed is a single
--      indexed read: `where user_id = ? and event_key is not null order by ts`.
--   2. Whole-state PUT syncs re-send everything repeatedly. A deterministic
--      `event_key` (reused from buildActivityFeed's stable event ids) makes the
--      materialization idempotent, so re-syncs never duplicate feed rows.
--
-- The pre-existing check-in events (written by /api/checkin) predate this and
-- have no event_key. They live in their own `kind` namespace and are left
-- untouched; the feed read filters on `event_key is not null` so they are not
-- mixed in.

-- Stable identity for a derived feed event (e.g. 'novel-added:<id>',
-- 'lc-solved:<key>'). Null for legacy check-in rows.
alter table public.activity_events
  add column if not exists event_key text;

-- Full-precision event timestamp used for ordering/relative display. The
-- existing `date` column is only a YYYY-MM-DD string, which is too coarse for
-- newest-first feed ordering.
alter table public.activity_events
  add column if not exists ts timestamptz;

-- Idempotent upsert target for materialization. Postgres treats nulls as
-- distinct, so legacy check-in rows (event_key null) are unaffected.
create unique index if not exists activity_events_user_event_key_uidx
  on public.activity_events(user_id, event_key)
  where event_key is not null;

-- Serves the feed read: `where user_id = ? order by ts desc limit 20`.
create index if not exists activity_events_user_ts_idx
  on public.activity_events(user_id, ts desc)
  where event_key is not null;

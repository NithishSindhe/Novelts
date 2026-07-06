-- Novelts: record when a LeetCode problem was marked solved.
--
-- The whole-state PUT sync deletes and reinserts leetcode_solved rows on every
-- save, so `created_at` cannot serve as a stable "solved on" time. We add an
-- explicit `solved_at` column that carries the client-captured timestamp.

alter table public.leetcode_solved
  add column if not exists solved_at timestamptz;

-- Backfill historical rows with their (approximate) creation time so existing
-- solves still show a date. New solves carry the exact client timestamp.
update public.leetcode_solved
  set solved_at = created_at
  where solved_at is null;

-- Novelts: record every attempt at a LeetCode problem (append-only history).
--
-- Unlike leetcode_solved, this table tracks attempts regardless of whether the
-- problem has been solved yet, so we can show "how many tries it took" once it
-- is eventually solved. Each row is one recorded attempt timestamp; rows are
-- never updated or deleted individually (the whole-state PUT sync deletes and
-- reinserts all rows for a user on save, but never drops an individual
-- attempt that was already recorded and re-synced).

create table if not exists public.leetcode_attempts (
  user_id      text not null references public.users(user_id) on delete cascade,
  problem_key  text not null,
  attempted_at timestamptz not null,
  created_at   timestamptz not null default timezone('utc', now()),
  primary key (user_id, problem_key, attempted_at)
);

create index if not exists leetcode_attempts_user_problem_idx
  on public.leetcode_attempts(user_id, problem_key);

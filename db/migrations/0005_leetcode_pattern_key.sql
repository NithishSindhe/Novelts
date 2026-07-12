-- Novelts: move LeetCode pattern notes off the fragile order-based integer
-- pattern_id onto an order-independent text pattern_key (the pattern slug).
--
-- Rationale: pattern_id was the pattern's 1-based array position, so reordering
-- patterns silently reattached notes to the wrong pattern. The app now keys all
-- LeetCode data by stable slugs. problem_key columns are already text and hold
-- their (legacy) values fine; the client remaps them to slug keys on next load
-- and the whole-state PUT sync rewrites the rows (lazy migration).
--
-- Here we only change the column TYPE. Existing integer ids are preserved as
-- their text form (e.g. 1 -> '1'); the client then remaps '1' -> its slug on
-- the next load and persists it via the normal sync.

alter table public.leetcode_pattern_notes
  drop constraint if exists leetcode_pattern_notes_pkey;

alter table public.leetcode_pattern_notes
  rename column pattern_id to pattern_key;

alter table public.leetcode_pattern_notes
  alter column pattern_key type text using pattern_key::text;

alter table public.leetcode_pattern_notes
  add primary key (user_id, pattern_key);

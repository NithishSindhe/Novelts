-- Novelts: normalized relational schema (Neon Postgres)
-- Replaces the single-jsonb `tracker_states` table used with Supabase.
--
-- Entity ids are generated client-side (e.g. `novel-<uuid>`), so primary keys
-- are `text`. Soft-delete is expressed via a `deleted` entry in `tags text[]`
-- to match the client logic in lib/useTracker.ts.

-- Shared trigger to keep `updated_at` fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Users (keyed by the Clerk user id, or the dev override id in development)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  user_id    text primary key,
  username   text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Novel tracker
-- ---------------------------------------------------------------------------
create table if not exists public.novels (
  id         text primary key,
  user_id    text not null references public.users(user_id) on delete cascade,
  title      text not null,
  author     text not null default '',
  tags       text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists novels_user_id_idx on public.novels(user_id);

create table if not exists public.notes (
  id                  text primary key,
  user_id             text not null references public.users(user_id) on delete cascade,
  novel_id            text references public.novels(id) on delete cascade,
  content             text not null,
  date                text not null,
  screenshot_data_url text,
  pinned              boolean not null default false,
  tags                text[] not null default '{}',
  created_at          timestamptz not null default timezone('utc', now())
);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_novel_id_idx on public.notes(novel_id);

create table if not exists public.words (
  id         text primary key,
  user_id    text not null references public.users(user_id) on delete cascade,
  novel_id   text references public.novels(id) on delete cascade,
  word       text not null,
  meaning    text not null default '',
  context    text not null default '',
  date       text not null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists words_user_id_idx on public.words(user_id);

create table if not exists public.characters (
  id         text primary key,
  user_id    text not null references public.users(user_id) on delete cascade,
  novel_id   text references public.novels(id) on delete cascade,
  name       text not null,
  role       text not null default '',
  traits     text not null default '',
  date       text not null,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists characters_user_id_idx on public.characters(user_id);

create table if not exists public.check_ins (
  user_id    text not null references public.users(user_id) on delete cascade,
  date       text not null,
  sources    text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, date)
);

-- ---------------------------------------------------------------------------
-- LeetCode tracker (only user progress; the problem catalog lives in code)
-- ---------------------------------------------------------------------------
create table if not exists public.leetcode_solved (
  user_id     text not null references public.users(user_id) on delete cascade,
  problem_key text not null,
  created_at  timestamptz not null default timezone('utc', now()),
  primary key (user_id, problem_key)
);

create table if not exists public.leetcode_problem_notes (
  user_id     text not null references public.users(user_id) on delete cascade,
  problem_key text not null,
  note        text not null,
  updated_at  timestamptz not null default timezone('utc', now()),
  primary key (user_id, problem_key)
);

create table if not exists public.leetcode_pattern_notes (
  user_id    text not null references public.users(user_id) on delete cascade,
  pattern_id integer not null,
  note       text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, pattern_id)
);

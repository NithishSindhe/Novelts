-- Novelts: per-user tracker state snapshot storage

create table if not exists public.tracker_states (
  user_id text primary key,
  username text not null,
  state jsonb not null default '{"novels":[],"notes":[],"words":[],"characters":[],"checkIns":{}}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tracker_states_set_updated_at on public.tracker_states;
create trigger tracker_states_set_updated_at
before update on public.tracker_states
for each row
execute function public.set_updated_at();

alter table public.tracker_states enable row level security;

-- Works when Supabase receives a JWT where `sub` is the Clerk user id.
drop policy if exists "users_can_select_own_state" on public.tracker_states;
create policy "users_can_select_own_state"
on public.tracker_states
for select
using ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "users_can_insert_own_state" on public.tracker_states;
create policy "users_can_insert_own_state"
on public.tracker_states
for insert
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "users_can_update_own_state" on public.tracker_states;
create policy "users_can_update_own_state"
on public.tracker_states
for update
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

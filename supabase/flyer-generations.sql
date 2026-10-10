-- Track AI flyer image generations for per-user daily caps.
-- Run in the Area 18 Supabase SQL Editor.

create table if not exists public.flyer_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists flyer_generations_user_day_idx
  on public.flyer_generations (user_id, created_at desc);

alter table public.flyer_generations enable row level security;

drop policy if exists "Members insert own generations" on public.flyer_generations;
create policy "Members insert own generations"
  on public.flyer_generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Members read own generations" on public.flyer_generations;
create policy "Members read own generations"
  on public.flyer_generations
  for select
  to authenticated
  using (auth.uid() = user_id);

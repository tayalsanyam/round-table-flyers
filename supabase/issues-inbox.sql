-- Admin issues inbox for "Raise a concern" submissions.
-- Run once in the Area 18 Supabase SQL Editor.

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  category text not null check (char_length(category) between 1 and 80),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'open' check (status in ('open', 'done')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  constraint issues_resolved_state check (
    (status = 'open' and resolved_at is null)
    or (status = 'done' and resolved_at is not null)
  )
);

create index if not exists issues_status_created_at
  on public.issues (status, created_at desc);

alter table public.issues enable row level security;

revoke all on public.issues from anon, authenticated;
grant insert (name, email, category, message) on public.issues to anon, authenticated;
grant select, update on public.issues to authenticated;

drop policy if exists issues_public_insert on public.issues;
create policy issues_public_insert on public.issues
  for insert to anon, authenticated
  with check (
    status = 'open'
    and resolved_at is null
    and resolved_by is null
    and admin_note is null
  );

drop policy if exists issues_admin_select on public.issues;
create policy issues_admin_select on public.issues
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists issues_admin_update on public.issues;
create policy issues_admin_update on public.issues
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

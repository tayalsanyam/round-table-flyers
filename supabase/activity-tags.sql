-- Run on an existing Supabase project that predates activity_tags in schema.sql.
-- Safe to re-run: skips existing objects. If migration "activity_tags" is already
-- applied (Supabase dashboard → Database → Migrations), you do not need this file.
create table if not exists public.activity_tags (
  id text primary key default gen_random_uuid()::text,
  label text not null check (char_length(label) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz
);

create unique index if not exists activity_tags_label_active
  on public.activity_tags (lower(label))
  where removed_at is null;

alter table public.activity_tags enable row level security;
revoke all on public.activity_tags from anon, authenticated;
grant select on public.activity_tags to anon, authenticated;
grant insert, update on public.activity_tags to authenticated;

drop policy if exists activity_tag_read on public.activity_tags;
create policy activity_tag_read on public.activity_tags
  for select using (removed_at is null);

drop policy if exists activity_tag_admin_insert on public.activity_tags;
create policy activity_tag_admin_insert on public.activity_tags
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists activity_tag_admin_update on public.activity_tags;
create policy activity_tag_admin_update on public.activity_tags
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.activity_tags (label, sort_order)
select label, sort_order
from (values
  ('LAPD Experience', 1),
  ('Go Go Green', 2),
  ('Community Service Activity', 3),
  ('Business Meet', 4),
  ('Socials', 5),
  ('Fellowship', 6),
  ('JAFFA', 7),
  ('AEX', 8),
  ('NEX', 9),
  ('MTM', 10)
) as seed(label, sort_order)
where not exists (select 1 from public.activity_tags where removed_at is null);

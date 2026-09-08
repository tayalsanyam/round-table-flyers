-- Run once in a NEW Supabase project's SQL Editor, before creating accounts.
-- RLS uses the authenticated user, never user-editable profile metadata, for roles.
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create policy admin_self_read on public.admin_users for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.admin_users where user_id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(display_name) between 1 and 100),
 area integer not null check(area between 1 and 18),
 rt integer not null check(rt between 1 and 400)
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
create policy profile_self_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name,area,rt) values(new.id,trim(new.raw_user_meta_data->>'display_name'),(new.raw_user_meta_data->>'area')::integer,(new.raw_user_meta_data->>'rt')::integer);
 return new;
end;$$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create table public.logos (
 id text primary key default gen_random_uuid()::text,
 name text not null check(char_length(name) between 1 and 100),
 category text not null check(category in ('Official','Area','Table')),
 table_kind text not null default 'standard' check(table_kind in ('standard','chairman')),
 area integer check(area between 1 and 18),
 rt integer check(rt between 1 and 400),
 object_key text unique,
 content_type text check(content_type in ('image/png','image/jpeg','image/webp')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 removed_at timestamptz,
 constraint valid_area check((category='Official' and area is null) or (category<>'Official' and area is not null)),
 constraint valid_table check((category='Table' and rt is not null) or (category<>'Table' and rt is null)),
 constraint valid_table_kind check((category='Table') or (table_kind='standard')),
 constraint valid_asset check((id in ('rti','area18') and object_key is null) or (object_key is not null and content_type is not null))
);
create index logos_area_category on public.logos(area,category) where removed_at is null;
create index logos_created_by on public.logos(created_by);
create index logos_rt on public.logos(rt) where rt is not null and removed_at is null;
alter table public.logos enable row level security;
revoke all on public.logos from anon,authenticated;
grant select on public.logos to anon, authenticated;
grant insert on public.logos to authenticated;
grant update(removed_at) on public.logos to authenticated;
create policy logo_read on public.logos for select to authenticated using(removed_at is null or (select public.is_admin()));
create policy logo_public_read on public.logos for select to anon using(removed_at is null);
create policy logo_member_insert on public.logos for insert to authenticated with check(
 created_by=(select auth.uid()) and removed_at is null and id not in ('rti','area18')
 and object_key like ((select auth.uid())::text || '/%')
 and (category<>'Official' or (select public.is_admin()))
);
create policy logo_admin_remove on public.logos for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
insert into public.logos(id,name,category,area) values('rti','Round Table India','Official',null),('area18','Area 18','Area',18);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('logos','logos',false,10000000,array['image/png','image/jpeg','image/webp']);
create policy logo_file_insert on storage.objects for insert to authenticated with check(
 bucket_id='logos' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy logo_file_read on storage.objects for select to authenticated using(
 bucket_id='logos' and (exists(select 1 from public.logos l where l.object_key=storage.objects.name and l.removed_at is null)
 or ((storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.logos l where l.object_key=storage.objects.name)))
);
grant select on storage.objects to anon;
create policy logo_file_public_read on storage.objects for select to anon using(
 bucket_id='logos' and exists(select 1 from public.logos l where l.object_key=storage.objects.name and l.removed_at is null)
);
-- Members may clean up failed uploads only. They cannot delete a published logo.
create policy logo_file_cleanup on storage.objects for delete to authenticated using(
 bucket_id='logos' and ((select public.is_admin()) or
 ((storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.logos l where l.object_key=storage.objects.name)))
);
-- Soft removal hides a logo from the app. An admin can restore removed_at in SQL.

create table public.activity_tags (
  id text primary key default gen_random_uuid()::text,
  label text not null check (char_length(label) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz
);
create unique index activity_tags_label_active on public.activity_tags (lower(label)) where removed_at is null;
alter table public.activity_tags enable row level security;
revoke all on public.activity_tags from anon, authenticated;
grant select on public.activity_tags to anon, authenticated;
grant insert, update on public.activity_tags to authenticated;
create policy activity_tag_read on public.activity_tags for select using (removed_at is null);
create policy activity_tag_admin_insert on public.activity_tags for insert to authenticated with check ((select public.is_admin()));
create policy activity_tag_admin_update on public.activity_tags for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
insert into public.activity_tags (label, sort_order) values
 ('LAPD Experience', 1),('Go Go Green', 2),('Community Service Activity', 3),('Business Meet', 4),('Socials', 5),
 ('Fellowship', 6),('JAFFA', 7),('AEX', 8),('NEX', 9),('MTM', 10);

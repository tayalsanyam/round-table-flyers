-- Admin member management: list/edit profiles + one-time RT fix.
-- Run once in the Area 18 Supabase SQL Editor (project that powers this app).

create or replace function public.admin_list_members()
returns table (
  id uuid,
  email text,
  display_name text,
  area integer,
  rt integer,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  is_admin boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Administrator access required.';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.area,
    p.rt,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.created_at,
    exists (select 1 from public.admin_users a where a.user_id = p.id) as is_admin
  from public.profiles p
  join auth.users u on u.id = p.id
  order by lower(p.display_name), u.email;
end;
$$;

revoke all on function public.admin_list_members() from public;
grant execute on function public.admin_list_members() to authenticated;

create or replace function public.admin_update_member(
  target_id uuid,
  new_display_name text,
  new_area integer,
  new_rt integer,
  fix_logos boolean default true
)
returns table (
  id uuid,
  email text,
  display_name text,
  area integer,
  rt integer,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  is_admin boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_name text := trim(new_display_name);
  old_area integer;
  old_rt integer;
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Administrator access required.';
  end if;

  if cleaned_name is null or char_length(cleaned_name) < 1 or char_length(cleaned_name) > 100 then
    raise exception 'Display name must be between 1 and 100 characters.';
  end if;
  if new_area is null or new_area < 1 or new_area > 18 then
    raise exception 'Area must be between 1 and 18.';
  end if;
  if new_rt is null or new_rt < 1 or new_rt > 400 then
    raise exception 'Round Table must be between 1 and 400.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_id) then
    raise exception 'Member not found.';
  end if;

  select p.area, p.rt into old_area, old_rt from public.profiles p where p.id = target_id;

  update public.profiles p
  set display_name = cleaned_name,
      area = new_area,
      rt = new_rt
  where p.id = target_id;

  update auth.users u
  set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'display_name', cleaned_name,
      'area', new_area,
      'rt', new_rt
    )
  where u.id = target_id;

  if fix_logos and (old_area is distinct from new_area or old_rt is distinct from new_rt) then
    update public.logos l
    set area = case when l.category = 'Official' then l.area else new_area end,
        rt = case when l.category = 'Table' then new_rt else l.rt end
    where l.created_by = target_id
      and l.removed_at is null
      and (
        (l.category = 'Area' and l.area = old_area)
        or (l.category = 'Table' and l.area = old_area and l.rt = old_rt)
      );
  end if;

  return query
  select *
  from public.admin_list_members() m
  where m.id = target_id;
end;
$$;

revoke all on function public.admin_update_member(uuid, text, integer, integer, boolean) from public;
grant execute on function public.admin_update_member(uuid, text, integer, integer, boolean) to authenticated;

-- One-time correction: Bansal Sanitary HR signed up as Table 18 instead of 294.
update public.profiles
set rt = 294
where id = (
  select u.id from auth.users u
  where lower(u.email) = lower('bansalsanitary.hr@gmail.com')
)
and rt = 18;

update public.logos
set rt = 294
where created_by = (
  select u.id from auth.users u
  where lower(u.email) = lower('bansalsanitary.hr@gmail.com')
)
and category = 'Table'
and rt = 18
and removed_at is null;

update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('rt', 294)
where lower(u.email) = lower('bansalsanitary.hr@gmail.com');

-- Fold Chairman logos into Table with table_kind = 'chairman'.
-- Legacy Chairman rows had no RT; they are soft-removed and should be re-uploaded with Area + RT.

alter table public.logos drop constraint if exists logos_category_check;

alter table public.logos
  add column if not exists table_kind text not null default 'standard';

alter table public.logos drop constraint if exists logos_table_kind_check;
alter table public.logos
  add constraint logos_table_kind_check check (table_kind in ('standard', 'chairman'));

update public.logos
set category = 'Table', table_kind = 'chairman'
where category = 'Chairman' and rt is not null and removed_at is null;

update public.logos
set removed_at = coalesce(removed_at, now())
where category = 'Chairman';

alter table public.logos drop constraint if exists logos_table_kind_scope;
alter table public.logos
  add constraint logos_table_kind_scope check (category = 'Table' or table_kind = 'standard');

alter table public.logos
  add constraint logos_category_check check (category in ('Official', 'Area', 'Table'));

-- Add public read access without changing member upload rules.
-- Safe to re-run.

grant select on public.logos to anon;
grant select on storage.objects to anon;

drop policy if exists logo_public_read on public.logos;
create policy logo_public_read on public.logos
  for select to anon
  using (removed_at is null);

drop policy if exists logo_file_public_read on storage.objects;
create policy logo_file_public_read on storage.objects
  for select to anon using (
    bucket_id = 'logos'
    and exists (select 1 from public.logos l where l.object_key = storage.objects.name and l.removed_at is null)
  );

-- Restore authenticated read if an earlier migration replaced it.
drop policy if exists logo_read on public.logos;
create policy logo_read on public.logos
  for select to authenticated
  using (removed_at is null or (select public.is_admin()));

drop policy if exists logo_file_read on storage.objects;
create policy logo_file_read on storage.objects
  for select to authenticated using (
    bucket_id = 'logos'
    and (
      exists (select 1 from public.logos l where l.object_key = storage.objects.name and l.removed_at is null)
      or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and not exists (select 1 from public.logos l where l.object_key = storage.objects.name)
      )
    )
  );

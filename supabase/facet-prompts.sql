-- Editable facet prompt outlines for AI flyer generation.
-- Run in the Area 18 Supabase SQL Editor.

create table if not exists public.facet_prompts (
  id text primary key,
  label text not null check (char_length(label) between 1 and 80),
  outline text not null check (char_length(outline) between 1 and 2000),
  updated_at timestamptz not null default now()
);

alter table public.facet_prompts enable row level security;

drop policy if exists "Anyone can read facet prompts" on public.facet_prompts;
create policy "Anyone can read facet prompts"
  on public.facet_prompts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins update facet prompts" on public.facet_prompts;
create policy "Admins update facet prompts"
  on public.facet_prompts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins insert facet prompts" on public.facet_prompts;
create policy "Admins insert facet prompts"
  on public.facet_prompts
  for insert
  to authenticated
  with check (public.is_admin());

revoke all on public.facet_prompts from anon, authenticated;
grant select on public.facet_prompts to anon, authenticated;
grant insert, update on public.facet_prompts to authenticated;

insert into public.facet_prompts (id, label, outline) values
  ('fellowship', 'Fellowship', 'Fellowship is a Round Table gathering for camaraderie — dinners, outings, toasts, music, and friendship among Tablers and families. Visual mood: warm hospitality, shared tables, evening glow, celebration of brotherhood. Avoid stiff conference or AGM aesthetics.'),
  ('freedom-drive', 'Freedom Drive', 'Freedom Drive is a patriotic / Independence-themed community engagement — awareness, unity, service, and pride in India. Visual mood: tricolour energy used tastefully (not as a logo), civic spirit, outdoor drive or rally feel, hopeful and respectful. Avoid party-political symbolism.'),
  ('go-go-green', 'Go Go Green', 'Go Go Green is Round Table India’s environment facet — tree plantation, cleanliness drives, recycling, and sustainability education. Visual mood: fresh greens, soil, saplings, community outdoors, hopeful eco action. Avoid industrial pollution shock imagery.'),
  ('food-donation', 'Food donation', 'Food donation is seva through meals — packing, distributing, or serving food to people in need. Visual mood: compassion, shared meals, food packets, community kitchen warmth, dignity for beneficiaries. Avoid wasteful banquet excess or pity tropes.'),
  ('lapd', 'LAPD Experience', 'LAPD Experience is an interactive experience / activity day — stalls, hands-on learning, play zones, and memorable public engagement. Visual mood: lively booths, curious participants, colourful activity energy, daytime outdoor or hall setup. Avoid looking like a music festival ticket poster.'),
  ('twinklers', 'Twinklers event', 'Twinklers events are for Tabler children — playful, colourful, safe, and joyful family-oriented programmes. Visual mood: kids’ celebration, bright soft colours, games, crafts, balloons used sparingly, wholesome fun. Avoid adult nightlife or scary cartoon styles.'),
  ('business-meet', 'Business Meet', 'Business Meet is a professional networking / speaker session for Tablers — ideas, entrepreneurship, and fellowship through business. Visual mood: modern meeting energy, confident typography, clean city or boardroom accents, still warm not cold-corporate. Avoid stock “handshake in suits” clichés if possible.'),
  ('socials', 'Social', 'Socials are casual Round Table get-togethers — parties, outings, sports, or light evening plans. Visual mood: fun, informal, youthful, weekend energy. Lighter than a formal fellowship dinner; avoid black-tie gala styling.')
on conflict (id) do nothing;

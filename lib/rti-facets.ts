export type RtiFacet = {
  id: string;
  label: string;
  outline: string;
};

/** Preconfigured RTI activity outlines for flyer image prompts. */
export const rtiFacets: RtiFacet[] = [
  {
    id: 'fellowship',
    label: 'Fellowship',
    outline:
      'Fellowship is a Round Table gathering for camaraderie — dinners, outings, toasts, music, and friendship among Tablers and families. Visual mood: warm hospitality, shared tables, evening glow, celebration of brotherhood. Avoid stiff conference or AGM aesthetics.',
  },
  {
    id: 'freedom-drive',
    label: 'Freedom Drive',
    outline:
      'Freedom Drive is a patriotic / Independence-themed community engagement — awareness, unity, service, and pride in India. Visual mood: tricolour energy used tastefully (not as a logo), civic spirit, outdoor drive or rally feel, hopeful and respectful. Avoid party-political symbolism.',
  },
  {
    id: 'go-go-green',
    label: 'Go Go Green',
    outline:
      'Go Go Green is Round Table India’s environment facet — tree plantation, cleanliness drives, recycling, and sustainability education. Visual mood: fresh greens, soil, saplings, community outdoors, hopeful eco action. Avoid industrial pollution shock imagery.',
  },
  {
    id: 'food-donation',
    label: 'Food donation',
    outline:
      'Food donation is seva through meals — packing, distributing, or serving food to people in need. Visual mood: compassion, shared meals, food packets, community kitchen warmth, dignity for beneficiaries. Avoid wasteful banquet excess or pity tropes.',
  },
  {
    id: 'lapd',
    label: 'LAPD Experience',
    outline:
      'LAPD Experience is an interactive experience / activity day — stalls, hands-on learning, play zones, and memorable public engagement. Visual mood: lively booths, curious participants, colourful activity energy, daytime outdoor or hall setup. Avoid looking like a music festival ticket poster.',
  },
  {
    id: 'twinklers',
    label: 'Twinklers event',
    outline:
      'Twinklers events are for Tabler children — playful, colourful, safe, and joyful family-oriented programmes. Visual mood: kids’ celebration, bright soft colours, games, crafts, balloons used sparingly, wholesome fun. Avoid adult nightlife or scary cartoon styles.',
  },
  {
    id: 'business-meet',
    label: 'Business Meet',
    outline:
      'Business Meet is a professional networking / speaker session for Tablers — ideas, entrepreneurship, and fellowship through business. Visual mood: modern meeting energy, confident typography, clean city or boardroom accents, still warm not cold-corporate. Avoid stock “handshake in suits” clichés if possible.',
  },
  {
    id: 'socials',
    label: 'Social',
    outline:
      'Socials are casual Round Table get-togethers — parties, outings, sports, or light evening plans. Visual mood: fun, informal, youthful, weekend energy. Lighter than a formal fellowship dinner; avoid black-tie gala styling.',
  },
];

export function facetByLabel(label: string) {
  const needle = label.trim().toLowerCase();
  return rtiFacets.find(facet => facet.label.toLowerCase() === needle)
    ?? rtiFacets.find(facet => facet.id === needle.replace(/\s+/g, '-'));
}

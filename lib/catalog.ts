export type TableLogoKind = 'standard' | 'chairman';
export type Logo = {
  id: string;
  name: string;
  category: string;
  area: number | null;
  rt: number | null;
  url: string;
  tableKind?: TableLogoKind;
  builtin?: boolean;
  sourceRect?: [number, number, number, number];
};
export const originals: Logo[] = [
  { id: 'rti', name: 'Round Table India', category: 'Official', area: null, rt: null, url: '/logos/rti.png', builtin: true, sourceRect: [216, 336, 792, 864] },
  { id: 'area18', name: 'Area 18', category: 'Area', area: 18, rt: null, url: '/logos/area18.png', builtin: true, sourceRect: [175, 335, 873, 866] },
];

export function logoTableKind(logo: Pick<Logo, 'category' | 'tableKind'>): TableLogoKind {
  if (logo.category === 'Chairman') return 'chairman';
  return logo.tableKind === 'chairman' ? 'chairman' : 'standard';
}

export function matchesLogo(logo: Logo, area: string, rt: string, category: string) {
  const tableKind = logoTableKind(logo);
  const logoCategory = logo.category === 'Chairman' ? 'Table' : logo.category;
  const areaOk = area === 'All' || logo.area === null || logo.area === Number(area);
  const rtOk = rt === 'All' || logo.rt === null || logo.rt === Number(rt);
  if (tableKind === 'chairman' && rt === 'All') return false;
  const categoryOk = category === 'All' || logoCategory === category;
  return areaOk && rtOk && categoryOk;
}

export function logoScope(logo: Pick<Logo, 'category' | 'area' | 'rt' | 'tableKind'>) {
  const tableKind = logoTableKind(logo);
  const logoCategory = logo.category === 'Chairman' ? 'Table' : logo.category;
  const parts = [tableKind === 'chairman' ? 'Table · Chairman theme' : logoCategory];
  if (logo.area) parts.push('Area ' + logo.area);
  if (logo.rt) parts.push('RT ' + logo.rt);
  return parts.join(' · ');
}

export function groupedLogos(logos: Logo[]) {
  return (['Official', 'Area', 'Table'] as const)
    .map(category => ({
      category,
      items: logos
        .filter(l => (l.category === category || (category === 'Table' && l.category === 'Chairman')))
        .slice()
        .sort((a, b) =>
          (logoTableKind(a) === 'chairman' ? 1 : 0) - (logoTableKind(b) === 'chairman' ? 1 : 0)
          || (a.area ?? 0) - (b.area ?? 0)
          || (a.rt ?? 0) - (b.rt ?? 0)
          || a.name.localeCompare(b.name),
        ),
    }))
    .filter(group => group.items.length);
}

import { rtiFacets, type RtiFacet } from './rti-facets';

export type { RtiFacet };

export function mergeFacets(rows: Partial<RtiFacet>[] | null | undefined): RtiFacet[] {
  const byId = new Map(rtiFacets.map(facet => [facet.id, { ...facet }]));
  for (const row of rows ?? []) {
    if (!row?.id) continue;
    const current = byId.get(row.id);
    byId.set(row.id, {
      id: row.id,
      label: (row.label || current?.label || row.id).trim(),
      outline: (row.outline || current?.outline || '').trim(),
    });
  }
  return [...byId.values()];
}

export function facetOutlineLimit(value: string) {
  const outline = value.trim().replace(/\s+/g, ' ');
  if (!outline || outline.length > 2000) {
    throw new Error('Enter a prompt outline up to 2,000 characters.');
  }
  return outline;
}

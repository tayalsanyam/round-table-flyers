import type { SupabaseClient } from '@supabase/supabase-js';
import { originals } from '@/lib/catalog';
import { withLogoVersion } from '@/lib/logo-url';

export function mapLogoRow(row: Record<string, unknown>) {
  const id = String(row.id);
  const original = originals.find(item => item.id === id);
  const version = String(row.created_at ?? id);
  const baseUrl = original?.url ?? `/api/logos/${id}`;
  return {
    id,
    name: String(row.name),
    category: String(row.category),
    area: row.area == null ? null : Number(row.area),
    rt: row.rt == null ? null : Number(row.rt),
    url: withLogoVersion(baseUrl, version),
    builtin: !!original,
    sourceRect: original?.sourceRect,
  };
}

export async function listCatalogLogos(supabase: SupabaseClient) {
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('logos')
      .select('*')
      .is('removed_at', null)
      .order('created_at')
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows.map(mapLogoRow);
}

export function fallbackCatalogLogos() {
  return originals.map(logo => ({
    ...logo,
    url: withLogoVersion(logo.url, logo.id),
  }));
}

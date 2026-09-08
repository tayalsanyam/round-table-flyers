import { originals } from '@/lib/catalog';
import { withLogoVersion } from '@/lib/logo-url';
import { context, failure } from '@/lib/server';
import { configured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const catalogHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

function mapLogoRow(row: Record<string, unknown>) {
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

function unsignedCatalog() {
  return Response.json(
    {
      logos: originals.map(logo => ({
        ...logo,
        url: withLogoVersion(logo.url, logo.id),
      })),
      admin: false,
      signedIn: false,
      configured: configured(),
    },
    { headers: catalogHeaders },
  );
}

export async function GET() {
  try {
    if (!configured()) return unsignedCatalog();

    const { supabase, user, admin } = await context();
    if (!user) return unsignedCatalog();

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

    const logos = rows.map(mapLogoRow);
    const { data: profile } = await supabase
      .from('profiles')
      .select('area,rt')
      .eq('id', user.id)
      .maybeSingle();

    return Response.json(
      { logos, admin, signedIn: true, configured: true, email: user.email, profile },
      { headers: catalogHeaders },
    );
  } catch (error) {
    return failure(error);
  }
}

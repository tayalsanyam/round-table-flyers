import { facetOutlineLimit, mergeFacets } from '@/lib/facets';
import { rtiFacets } from '@/lib/rti-facets';
import { context, failure, sameOrigin } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
    }

    const { id } = await params;
    const fallback = rtiFacets.find(facet => facet.id === id);
    if (!fallback) {
      return Response.json({ error: 'Unknown facet.' }, { status: 404 });
    }

    const { supabase, user, admin } = await context();
    if (!user || !admin) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const body = await request.json() as { outline?: string; label?: string };
    const outline = facetOutlineLimit(body.outline ?? '');
    const label = (body.label?.trim() || fallback.label).slice(0, 80);

    const { data, error } = await supabase
      .from('facet_prompts')
      .upsert({
        id,
        label,
        outline,
        updated_at: new Date().toISOString(),
      })
      .select('id,label,outline')
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || /facet_prompts/i.test(error.message)) {
        return Response.json({
          error: 'Facet prompts are not installed yet. Run supabase/facet-prompts.sql in the Supabase SQL Editor.',
        }, { status: 503 });
      }
      throw error;
    }

    return Response.json({ facet: mergeFacets([data])[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('2,000 characters') || message.includes('outline')) {
      return Response.json({ error: message }, { status: 400 });
    }
    return failure(error);
  }
}

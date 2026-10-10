import { mergeFacets } from '@/lib/facets';
import { rtiFacets } from '@/lib/rti-facets';
import { context, failure } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase } = await context();
    const { data, error } = await supabase
      .from('facet_prompts')
      .select('id,label,outline')
      .order('label');

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || /facet_prompts/i.test(error.message)) {
        return Response.json({ facets: rtiFacets, source: 'defaults' });
      }
      throw error;
    }

    return Response.json({ facets: mergeFacets(data), source: 'database' });
  } catch (error) {
    return failure(error);
  }
}

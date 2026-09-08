import { context, failure, sameOrigin } from '@/lib/server';
import { supabaseServer } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const supabase = await supabaseServer();
    const { id } = await ctx.params;
    const { data: row, error } = await supabase
      .from('logos')
      .select('object_key,content_type')
      .eq('id', id)
      .is('removed_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!row?.object_key) return new Response('Not found', { status: 404 });
    const { data, error: downloadError } = await supabase.storage.from('logos').download(row.object_key);
    if (downloadError) throw downloadError;
    return new Response(data, {
      headers: {
        'Content-Type': row.content_type,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    const { supabase, user, admin } = await context();
    if (!user || !admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const { id } = await ctx.params;
    const { error } = await supabase.from('logos').update({ removed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

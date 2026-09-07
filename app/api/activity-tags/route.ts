import { context, failure, sameOrigin } from '@/lib/server';
import { configured, supabaseServer } from '@/lib/supabase/server';
import { createActivityTag, listActivityTags } from '@/lib/activity-tags-server';
import { fallbackActivityTags } from '@/lib/tags';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!configured()) {
      return Response.json({ tags: fallbackActivityTags() }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const supabase = await supabaseServer();
    const tags = await listActivityTags(supabase);
    return Response.json({ tags }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    const { supabase, user, admin } = await context();
    if (!user || !admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const body = await request.json() as { label?: string };
    const tag = await createActivityTag(supabase, body.label ?? '');
    return Response.json({ tag });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('tag')) return Response.json({ error: message }, { status: 400 });
    return failure(e);
  }
}

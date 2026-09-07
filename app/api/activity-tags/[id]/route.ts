import { context, failure, sameOrigin } from '@/lib/server';
import { removeActivityTag, updateActivityTag } from '@/lib/activity-tags-server';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    const { supabase, user, admin } = await context();
    if (!user || !admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const { id } = await ctx.params;
    const body = await request.json() as { label?: string };
    const tag = await updateActivityTag(supabase, id, body.label ?? '');
    return Response.json({ tag });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('tag')) return Response.json({ error: message }, { status: 400 });
    return failure(e);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
    const { supabase, user, admin } = await context();
    if (!user || !admin) return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    const { id } = await ctx.params;
    await removeActivityTag(supabase, id);
    return Response.json({ ok: true });
  } catch (e) {
    const message = (e as Error).message;
    if (message.includes('tag')) return Response.json({ error: message }, { status: 400 });
    return failure(e);
  }
}

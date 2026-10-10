import { context, failure, sameOrigin } from '@/lib/server';
import type { Issue, IssueStatus } from '@/lib/issues';

export const dynamic = 'force-dynamic';

type Body = {
  status?: IssueStatus;
  admin_note?: string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!sameOrigin(request)) {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
    }

    const { supabase, user, admin } = await context();
    if (!user || !admin) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return Response.json({ error: 'Issue id is required.' }, { status: 400 });

    const body = await request.json() as Body;
    const updates: Record<string, unknown> = {};

    if (body.status === 'open') {
      updates.status = 'open';
      updates.resolved_at = null;
      updates.resolved_by = null;
    } else if (body.status === 'done') {
      updates.status = 'done';
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user.id;
    } else if (body.status !== undefined) {
      return Response.json({ error: 'Status must be open or done.' }, { status: 400 });
    }

    if (body.admin_note !== undefined) {
      const note = String(body.admin_note ?? '').trim().slice(0, 2000);
      updates.admin_note = note || null;
    }

    if (!Object.keys(updates).length) {
      return Response.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select('id,name,email,category,message,status,admin_note,created_at,resolved_at,resolved_by')
      .maybeSingle();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('issues')) {
        return Response.json({
          error: 'Issues inbox is not installed yet. Run supabase/issues-inbox.sql in the Supabase SQL Editor.',
        }, { status: 503 });
      }
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (!data) return Response.json({ error: 'Issue not found.' }, { status: 404 });

    return Response.json({ issue: data as Issue });
  } catch (error) {
    return failure(error);
  }
}

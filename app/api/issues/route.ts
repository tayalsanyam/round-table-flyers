import { context, failure } from '@/lib/server';
import type { Issue } from '@/lib/issues';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { supabase, user, admin } = await context();
    if (!user || !admin) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const status = new URL(request.url).searchParams.get('status');
    let query = supabase
      .from('issues')
      .select('id,name,email,category,message,status,admin_note,created_at,resolved_at,resolved_by')
      .order('created_at', { ascending: false });

    if (status === 'open' || status === 'done') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('issues')) {
        return Response.json({
          error: 'Issues inbox is not installed yet. Run supabase/issues-inbox.sql in the Supabase SQL Editor.',
        }, { status: 503 });
      }
      throw error;
    }

    return Response.json({ issues: (data ?? []) as Issue[] });
  } catch (error) {
    return failure(error);
  }
}

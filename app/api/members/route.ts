import { context, failure } from '@/lib/server';
import type { Member } from '@/lib/members';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { supabase, user, admin } = await context();
    if (!user || !admin) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('admin_list_members');
    if (error) {
      if (error.message?.includes('admin_list_members') || error.code === 'PGRST202') {
        return Response.json({
          error: 'Member management is not installed yet. Run supabase/admin-members.sql in the Supabase SQL Editor.',
        }, { status: 503 });
      }
      throw error;
    }

    return Response.json({ members: (data ?? []) as Member[] });
  } catch (error) {
    return failure(error);
  }
}

import { context, failure, sameOrigin } from '@/lib/server';
import { cleanMemberFields, type Member } from '@/lib/members';

export const dynamic = 'force-dynamic';

type Body = {
  display_name?: string;
  area?: number;
  rt?: number;
  fix_logos?: boolean;
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
    if (!id) return Response.json({ error: 'Member id is required.' }, { status: 400 });

    const body = await request.json() as Body;
    let fields: ReturnType<typeof cleanMemberFields>;
    try {
      fields = cleanMemberFields(body);
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('admin_update_member', {
      target_id: id,
      new_display_name: fields.display_name,
      new_area: fields.area,
      new_rt: fields.rt,
      fix_logos: body.fix_logos !== false,
    });

    if (error) {
      if (error.message?.includes('admin_update_member') || error.code === 'PGRST202') {
        return Response.json({
          error: 'Member management is not installed yet. Run supabase/admin-members.sql in the Supabase SQL Editor.',
        }, { status: 503 });
      }
      return Response.json({ error: error.message }, { status: 400 });
    }

    const member = (Array.isArray(data) ? data[0] : data) as Member | undefined;
    if (!member) return Response.json({ error: 'Member not found.' }, { status: 404 });
    return Response.json({ member });
  } catch (error) {
    return failure(error);
  }
}

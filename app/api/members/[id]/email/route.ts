import { context, failure, sameOrigin } from '@/lib/server';

export const dynamic = 'force-dynamic';

type Body = {
  subject?: string;
  message?: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const subject = clean(body.subject, 160);
    const message = clean(body.message, 4000);
    if (!subject || !message) {
      return Response.json({ error: 'Enter a subject and message.' }, { status: 400 });
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

    const members = (data ?? []) as Array<{ id: string; email: string; display_name: string }>;
    const member = members.find((row) => row.id === id);
    if (!member?.email) {
      return Response.json({ error: 'Member not found.' }, { status: 404 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONCERN_FROM_EMAIL ?? 'Round Table Flyer Finisher <RoundtableIndiaA18Flyers@aaibuilt.com>';
    if (!apiKey) {
      return Response.json({ error: 'Email sending is not configured (RESEND_API_KEY).' }, { status: 503 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [member.email],
        reply_to: user.email ?? undefined,
        subject,
        html: `
          <p>Hello ${escapeHtml(member.display_name)},</p>
          <p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>
          <p>— Round Table Flyer Finisher</p>
        `,
        text: `Hello ${member.display_name},\n\n${message}\n\n— Round Table Flyer Finisher`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Resend member email error', detail);
      return Response.json({ error: 'Could not send the email right now.' }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

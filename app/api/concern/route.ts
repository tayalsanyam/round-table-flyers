import { NextResponse } from 'next/server';

type Body = {
  name?: string;
  email?: string;
  category?: string;
  message?: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Body;
    const name = clean(body.name, 100);
    const email = clean(body.email, 200);
    const category = clean(body.category, 80);
    const message = clean(body.message, 2000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Enter your name, email and message.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONCERN_TO_EMAIL ?? 'tayalsanyam@gmail.com';
    const from = process.env.CONCERN_FROM_EMAIL ?? 'Round Table Flyers <onboarding@resend.dev>';

    if (!apiKey) {
      return NextResponse.json({ error: 'Concern email is not configured yet. Please call +91-7009191914.' }, { status: 503 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Flyer Finisher concern: ${category}`,
        html: `
          <h2>Raise a concern</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Topic:</strong> ${category}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Resend error', detail);
      return NextResponse.json({ error: 'Could not send your message right now. Please try again or call +91-7009191914.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Concern form failed', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

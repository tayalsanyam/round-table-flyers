import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/validation';
import { supabaseRouteClient } from '@/lib/supabase/route';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=expired', url.origin));
  }

  const next = safeNext(url.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabase = supabaseRouteClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=expired', url.origin));
  }

  return response;
}

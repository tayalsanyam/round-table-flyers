import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/validation';
import { supabaseRouteClient } from '@/lib/supabase/route';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (!tokenHash || (type !== 'email' && type !== 'recovery')) {
    return NextResponse.redirect(new URL('/login?error=expired', url.origin));
  }

  const destination = type === 'recovery' ? '/reset-password' : safeNext(url.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(destination, url.origin));
  const supabase = supabaseRouteClient(request, response);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(new URL('/login?error=expired', url.origin));
  }

  return response;
}

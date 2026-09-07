import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sameOrigin } from '@/lib/server';
export async function POST(request:Request){if(!sameOrigin(request))return new Response('Forbidden',{status:403});const supabase=await supabaseServer();await supabase.auth.signOut();return NextResponse.redirect(new URL('/login',request.url),303);}

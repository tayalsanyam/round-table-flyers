import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
export async function GET(request:Request){const url=new URL(request.url),token_hash=url.searchParams.get('token_hash'),type=url.searchParams.get('type');if(token_hash&&(type==='email'||type==='recovery')){const supabase=await supabaseServer();const {error}=await supabase.auth.verifyOtp({token_hash,type});if(!error)return NextResponse.redirect(new URL(type==='recovery'?'/reset-password':'/',url.origin));}return NextResponse.redirect(new URL('/login?error=expired',url.origin));}

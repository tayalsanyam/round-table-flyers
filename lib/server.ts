import { supabaseServer } from './supabase/server';
export async function context(){const supabase=await supabaseServer();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return {supabase,user:null,admin:false};const {data:admin,error:roleError}=await supabase.rpc('is_admin');if(roleError)throw roleError;return {supabase,user,admin:!!admin};}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export function failure(error:unknown){console.error('Request failed',error);return Response.json({error:'The collection is unavailable. Please try again or contact the administrator.'},{status:503});}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function configured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
export async function supabaseServer() {
  if (!configured()) throw new Error('Set the two Supabase environment variables to connect this app.');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: items => {
        try { items.forEach(({name,value,options}) => jar.set(name,value,options)); }
        catch { /* Server Components rely on proxy.ts for refreshed cookies. */ }
      },
    },
  });
}

import { createClient } from '@supabase/supabase-js';
import { configured } from './server';

/** Cookie-less client for public inserts (e.g. concern form). */
export function supabasePublic() {
  if (!configured()) throw new Error('Set the two Supabase environment variables to connect this app.');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

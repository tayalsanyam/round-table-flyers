import { createBrowserClient } from '@supabase/ssr';
export function supabaseBrowser(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Account services have not been connected yet. Please contact the administrator.');return createBrowserClient(url,key);}

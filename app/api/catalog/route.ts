import { fallbackCatalogLogos, listCatalogLogos } from '@/lib/catalog-server';
import { failure } from '@/lib/server';
import { configured, supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const catalogHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

export async function GET() {
  try {
    if (!configured()) {
      return Response.json(
        { logos: fallbackCatalogLogos(), admin: false, signedIn: false, configured: false },
        { headers: catalogHeaders },
      );
    }

    const supabase = await supabaseServer();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const logos = await listCatalogLogos(supabase);
    let admin = false;
    let profile: { area: number; rt: number } | undefined;

    if (user) {
      const { data: adminFlag, error: roleError } = await supabase.rpc('is_admin');
      if (roleError) throw roleError;
      admin = !!adminFlag;

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('area,rt')
        .eq('id', user.id)
        .maybeSingle();
      if (profileRow) profile = profileRow;
    }

    return Response.json(
      {
        logos,
        admin,
        signedIn: !!user,
        configured: true,
        email: user?.email,
        profile,
      },
      { headers: catalogHeaders },
    );
  } catch (error) {
    return failure(error);
  }
}

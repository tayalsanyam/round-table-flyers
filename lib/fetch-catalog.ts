import type { Logo } from './catalog';

export type CatalogResponse = {
  error?: string;
  logos: Logo[];
  admin: boolean;
  signedIn: boolean;
  configured: boolean;
  email?: string;
  profile?: { area: number; rt: number };
};

export async function fetchCatalog(): Promise<CatalogResponse> {
  const response = await fetch(`/api/catalog?_=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  const data = await response.json() as CatalogResponse;
  if (!response.ok) throw new Error(data.error || 'Could not load the logo collection.');
  return data;
}

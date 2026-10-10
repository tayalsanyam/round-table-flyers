'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole, Save, Sparkles } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { fetchCatalog } from '@/lib/fetch-catalog';
import { rtiFacets, type RtiFacet } from '@/lib/rti-facets';
import AppHeader from '../app-header';

export default function PromptsAdmin() {
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<RtiFacet[]>(rtiFacets);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState('');
  const [source, setSource] = useState('defaults');

  async function refreshFacets() {
    const response = await fetch('/api/facets', { cache: 'no-store' });
    const data = await response.json() as { facets?: RtiFacet[]; source?: string; error?: string };
    if (!response.ok) throw new Error(data.error || 'Could not load facet prompts.');
    const next = data.facets?.length ? data.facets : rtiFacets;
    setFacets(next);
    setDrafts(Object.fromEntries(next.map(facet => [facet.id, facet.outline])));
    setSource(data.source || 'defaults');
  }

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await fetchCatalog();
        setSignedIn(catalog.signedIn);
        setAdmin(catalog.admin);
        if (catalog.admin) await refreshFacets();
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveFacet(facet: RtiFacet) {
    setSavingId(facet.id);
    try {
      const response = await fetch(`/api/facets/${facet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: facet.label,
          outline: drafts[facet.id] ?? facet.outline,
        }),
      });
      const data = await response.json() as { facet?: RtiFacet; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save prompt.');
      if (data.facet) {
        setFacets(current => current.map(item => item.id === facet.id ? data.facet! : item));
        setDrafts(current => ({ ...current, [facet.id]: data.facet!.outline }));
        setSource('database');
      }
      toast.success(`${facet.label} prompt saved.`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingId('');
    }
  }

  return (
    <>
      <Toaster richColors />
      <AppHeader signedIn={signedIn} admin={admin} page="prompts" />
      <main className="admin-page">
        <section className="intro">
          <div>
            <p className="eyebrow">ADMIN · AI PROMPTS</p>
            <h1>Edit facet outlines</h1>
            <p>These outlines feed Generate. Change the wording here and new flyer prompts will follow.</p>
          </div>
        </section>

        {loading ? (
          <p className="muted" role="status">Loading…</p>
        ) : !signedIn || !admin ? (
          <section className="panel access-panel">
            <LockKeyhole size={30} />
            <h2>Administrator access required</h2>
            <p>Sign in with an admin account to edit Generate facet prompts.</p>
            <a className="secondary" href="/login?next=/prompts">Sign in</a>
          </section>
        ) : (
          <div className="prompts-list">
            <p className="hint">Source: {source === 'database' ? 'Supabase facet_prompts' : 'built-in defaults until SQL is run'}.</p>
            {facets.map(facet => (
              <section className="panel" key={facet.id}>
                <div className="section-line">
                  <h2><Sparkles size={18} /> {facet.label}</h2>
                  <button
                    type="button"
                    className="primary"
                    disabled={savingId === facet.id || (drafts[facet.id] ?? '') === facet.outline}
                    onClick={() => void saveFacet(facet)}
                  >
                    <Save size={16} />
                    {savingId === facet.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <label className="field">
                  Prompt outline
                  <textarea
                    rows={5}
                    value={drafts[facet.id] ?? facet.outline}
                    onChange={e => setDrafts(current => ({ ...current, [facet.id]: e.target.value }))}
                    maxLength={2000}
                  />
                </label>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

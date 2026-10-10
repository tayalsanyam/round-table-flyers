'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Download, ImagePlus, LockKeyhole, Pencil, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { fetchCatalog } from '@/lib/fetch-catalog';
import { tableDisplayName } from '@/lib/generate-prompt';
import { savePendingFlyer } from '@/lib/pending-flyer';
import { facetByLabel, rtiFacets, type RtiFacet } from '@/lib/rti-facets';
import AppHeader from '../app-header';
import Pick from '../picker';
import RtiLoader from '../rti-loader';
import WelcomeGuide from '../welcome-guide';

type GenerateMode = 'prompt' | 'image' | 'edit';

type GenerateResponse = {
  error?: string;
  capped?: boolean;
  mode?: GenerateMode;
  prompt?: string;
  model?: string;
  imageDataUrl?: string;
  imageUrl?: string;
};

type ReferenceItem = {
  id: string;
  file: File;
  preview: string;
};

export default function GenerateStudio() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const referencesRef = useRef<ReferenceItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [facets, setFacets] = useState<RtiFacet[]>(rtiFacets);
  const [activity, setActivity] = useState(rtiFacets[0].label);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [showTime, setShowTime] = useState(false);
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [area, setArea] = useState('');
  const [showArea, setShowArea] = useState(false);
  const [rt, setRt] = useState('');
  const [rtPrefix, setRtPrefix] = useState('');
  const [details, setDetails] = useState('');
  const [style, setStyle] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [busy, setBusy] = useState<GenerateMode | null>(null);
  const [prompt, setPrompt] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [model, setModel] = useState('');
  const [capped, setCapped] = useState(false);
  const [capMessage, setCapMessage] = useState('');

  const facet = useMemo(
    () => facets.find(item => item.label.toLowerCase() === activity.trim().toLowerCase()) ?? facetByLabel(activity),
    [activity, facets],
  );
  const tableLabel = useMemo(() => tableDisplayName(rt, rtPrefix), [rt, rtPrefix]);
  referencesRef.current = references;

  useEffect(() => {
    void Promise.all([
      fetchCatalog(),
      fetch('/api/facets', { cache: 'no-store' }).then(r => r.json() as Promise<{ facets?: RtiFacet[] }>),
    ])
      .then(([d, facetData]) => {
        setSignedIn(d.signedIn);
        setAdmin(d.admin);
        if (d.profile) {
          setArea(String(d.profile.area));
          setRt(String(d.profile.rt));
        }
        if (facetData.facets?.length) {
          setFacets(facetData.facets);
          if (!facetData.facets.some(item => item.label === activity)) {
            setActivity(facetData.facets[0].label);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setLoadingAuth(false));
  }, []);

  useEffect(() => () => {
    referencesRef.current.forEach(item => URL.revokeObjectURL(item.preview));
  }, []);

  function addReferences(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList);
    const room = 2 - references.length;
    if (room <= 0) {
      toast.error('You can upload up to 2 reference images.');
      return;
    }

    const next: ReferenceItem[] = [];
    for (const file of incoming.slice(0, room)) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast.error('Reference images must be PNG, JPG or WebP.');
        continue;
      }
      if (file.size > 10_000_000) {
        toast.error('Each reference image must be under 10 MB.');
        continue;
      }
      next.push({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, preview: URL.createObjectURL(file) });
    }
    if (next.length) setReferences(current => [...current, ...next]);
    if (fileInput.current) fileInput.current.value = '';
  }

  function removeReference(id: string) {
    setReferences(current => {
      const target = current.find(item => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter(item => item.id !== id);
    });
  }

  async function dataUrlToFile(dataUrl: string, name: string) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], name, { type: blob.type || 'image/png' });
  }

  async function run(mode: GenerateMode) {
    if (!signedIn) return;
    if (mode === 'edit' && !imageSrc) {
      toast.error('Generate a picture first, then edit it.');
      return;
    }
    if (mode === 'edit' && !editInstruction.trim()) {
      toast.error('Describe what to change in the generated image.');
      return;
    }

    setBusy(mode);
    try {
      const form = new FormData();
      form.set('mode', mode);
      form.set('activity', activity);
      form.set('title', title);
      form.set('date', date);
      form.set('showTime', showTime ? '1' : '0');
      form.set('time', time);
      form.set('venue', venue);
      form.set('area', area);
      form.set('showArea', showArea ? '1' : '0');
      form.set('rt', rt);
      form.set('rtPrefix', rtPrefix);
      form.set('details', details);
      form.set('style', style);
      form.set('editInstruction', editInstruction);
      references.forEach(item => form.append('references', item.file, item.file.name));

      if (mode === 'edit' && imageSrc) {
        form.append('source', await dataUrlToFile(imageSrc, 'current-flyer.png'));
      }

      const response = await fetch('/api/generate', { method: 'POST', body: form });
      const data = await response.json() as GenerateResponse;
      if (!response.ok) {
        if (data.capped || response.status === 429) {
          setCapped(true);
          setCapMessage(data.error || 'Generation capped at 5 Per Day, Lets try again tomorrow.');
        }
        throw new Error(data.error || 'Generation failed.');
      }

      if (data.prompt) setPrompt(data.prompt);
      if (data.model) setModel(data.model);

      if (mode === 'image' || mode === 'edit') {
        const src = data.imageDataUrl || data.imageUrl || '';
        if (!src) throw new Error('No image came back from OpenAI.');
        setImageSrc(src);
        if (mode === 'edit') {
          setEditInstruction('');
          toast.success('Edit applied — review, edit again, or continue to logos.');
        } else {
          toast.success('Artwork ready — edit it, or continue to Studio for logos.');
        }
      } else {
        toast.success('Prompt ready. Generate the image when you like.');
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied.');
    } catch {
      toast.error('Could not copy the prompt.');
    }
  }

  function downloadImage() {
    if (!imageSrc) return;
    const anchor = document.createElement('a');
    anchor.href = imageSrc;
    anchor.download = 'rti-flyer-artwork.png';
    anchor.click();
  }

  async function continueToLogos() {
    if (!imageSrc) return;
    try {
      const image = new Image();
      const ready = new Promise<HTMLImageElement>((resolve, reject) => {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not prepare artwork for Studio.'));
      });
      image.src = imageSrc;
      const loaded = await ready;
      const canvas = document.createElement('canvas');
      canvas.width = loaded.naturalWidth;
      canvas.height = loaded.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not prepare artwork for Studio.');
      ctx.drawImage(loaded, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const name = `${title.trim().replace(/\s+/g, '-').slice(0, 40) || 'rti-flyer'}-artwork.jpg`;
      savePendingFlyer({ dataUrl, name });
      router.push('/?step=2');
    } catch (error) {
      toast.error((error as Error).message || 'Could not hand off this image. Download it, then upload in Studio.');
    }
  }

  return (
    <>
      <Toaster richColors />
      <AppHeader signedIn={signedIn} admin={admin} page="generate" />
      <WelcomeGuide />
      <RtiLoader
        active={busy === 'image' || busy === 'edit'}
        label={busy === 'edit' ? 'Editing artwork…' : 'Generating artwork…'}
      />
      <main className="admin-page generate-page">
        <section className="intro">
          <div>
            <p className="eyebrow">EXPERIMENT · AI ARTWORK</p>
            <h1 className="generate-title">
              Generate the flyer. Brand it after.
              <span className="beta-badge">Beta</span>
            </h1>
            <p>Pick a Round Table facet, optionally drop up to 2 reference photos, generate no-logo artwork, then continue to Studio for crests.</p>
          </div>
        </section>

        {loadingAuth ? (
          <p className="muted" role="status">Checking your account…</p>
        ) : !signedIn ? (
          <section className="panel access-panel">
            <LockKeyhole size={30} />
            <h2>Sign up to generate flyer artwork</h2>
            <p>This experimental tab uses your OpenAI key on the server. Create an account to try prompt writing and image generation.</p>
            <a className="secondary" href="/login?next=/generate">Sign in</a>
            <a className="text-link" href="/signup?next=/generate">Create an account</a>
          </section>
        ) : (
          <div className="generate-grid">
            <section className="panel">
              <h2><Wand2 size={18} /> Event brief</h2>
              <p className="hint">Facet sets the theme. Attached photos drive the look. Table text uses your prefix (e.g. CURT 270).</p>

              <label className="field">Activity / facet
                <Pick
                  label="Activity / facet"
                  value={activity}
                  onChange={setActivity}
                  items={facets.map(item => [item.label, item.label])}
                />
              </label>
              {facet && <p className="facet-outline">{facet.outline}</p>}

              <label className="field">Flyer title
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Blood donation drive" maxLength={120} />
              </label>
              <label className="field">Date
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </label>
              <label className="field band-toggle">
                <span>Include time on the flyer</span>
                <Checkbox checked={showTime} onCheckedChange={checked => setShowTime(!!checked)} />
              </label>
              {showTime && (
                <label className="field">Time
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </label>
              )}
              <label className="field">Venue
                <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="City hospital lawn" />
              </label>
              <div className="filter-grid">
                <label className="field">Table prefix
                  <input value={rtPrefix} onChange={e => setRtPrefix(e.target.value.toUpperCase())} placeholder="CURT" maxLength={12} />
                </label>
                <label className="field">RT number
                  <input value={rt} onChange={e => setRt(e.target.value)} placeholder="270" inputMode="numeric" />
                </label>
              </div>
              {tableLabel && <p className="hint">Shows on flyer as plain text: <strong>{tableLabel}</strong></p>}
              <label className="field band-toggle">
                <span>Also show Area number on the flyer</span>
                <Checkbox checked={showArea} onCheckedChange={checked => setShowArea(!!checked)} />
              </label>
              {showArea && (
                <label className="field">Area
                  <input value={area} onChange={e => setArea(e.target.value)} placeholder="18" inputMode="numeric" />
                </label>
              )}
              <label className="field">Extra details
                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="Who it is for, dress code, registration note..." />
              </label>
              <p className="hint">Add anything that should appear in the picture — guest of honour, age group, dress code, registration link text, slogan, or a short call to action.</p>
              <label className="field">Visual direction (optional)
                <input value={style} onChange={e => setStyle(e.target.value)} placeholder="Warm daylight, bold sans title, festive but clean" />
              </label>

              <div className="reference-block">
                <div className="section-line">
                  <strong>Inspiration photos</strong>
                  <span className="count">{references.length}/2</span>
                </div>
                <p className="hint">Up to 2 photos. The flyer should take its look from these — facet only sets the event meaning. Logos in photos are ignored.</p>
                <input
                  ref={fileInput}
                  id="generate-references"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  multiple
                  onChange={e => addReferences(e.target.files)}
                />
                <label htmlFor="generate-references" className="upload reference-upload">
                  <ImagePlus size={22} />
                  <strong>{references.length ? 'Add another photo' : 'Upload up to 2 photos'}</strong>
                  <span>PNG, JPG or WebP · 10 MB each</span>
                </label>
                {references.length > 0 && (
                  <ul className="reference-list">
                    {references.map(item => (
                      <li key={item.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.preview} alt="" />
                        <span>{item.file.name}</span>
                        <button type="button" className="quiet" aria-label={`Remove ${item.file.name}`} onClick={() => removeReference(item.id)}>
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {references.length > 0 && (
                  <button type="button" className="text-link" onClick={() => {
                    references.forEach(item => URL.revokeObjectURL(item.preview));
                    setReferences([]);
                  }}>
                    <Trash2 size={14} /> Clear references
                  </button>
                )}
              </div>

              {capped && (
                <div className="generation-cap" role="alert">
                  <strong>Generation capped at 5 Per Day</strong>
                  <p>{capMessage || 'Lets try again tomorrow.'}</p>
                </div>
              )}

              <div className="export-actions">
                <button type="button" className="primary" disabled={!!busy || capped || !title.trim()} onClick={() => void run('image')}>
                  <Sparkles size={18} />
                  {busy === 'image' ? 'Generating picture…' : capped ? 'Daily limit reached' : 'Generate picture'}
                </button>
                <button type="button" className="secondary" disabled={!!busy || !title.trim()} onClick={() => void run('prompt')}>
                  <ImagePlus size={18} />
                  {busy === 'prompt' ? 'Building prompt…' : 'Preview prompt only'}
                </button>
              </div>
              <p className="hint">Image generation is capped at 5 per member per day.</p>
            </section>

            <section className="panel generate-result">
              <div className="section-line">
                <h2>Result</h2>
                {model && <span className="count">{model}</span>}
              </div>

              {imageSrc ? (
                <div className="generate-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt="Generated flyer artwork without logos" />
                  <label className="field">
                    Edit this picture
                    <textarea
                      value={editInstruction}
                      onChange={e => setEditInstruction(e.target.value)}
                      rows={3}
                      placeholder="e.g. Make the sky more dramatic, move the title higher, warmer lighting..."
                    />
                  </label>
                  <div className="export-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={!!busy || capped || !editInstruction.trim()}
                      onClick={() => void run('edit')}
                    >
                      <Pencil size={16} />
                      {busy === 'edit' ? 'Editing…' : 'Apply edit'}
                    </button>
                    <button type="button" className="primary" onClick={() => void continueToLogos()}>
                      Continue to add logos
                    </button>
                    <button type="button" className="secondary" onClick={downloadImage}>
                      <Download size={16} /> Download artwork
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">Your no-logo artwork will appear here after Generate picture.</p>
              )}

              {prompt && (
                <div className="generate-prompt-box">
                  <div className="section-line">
                    <strong>Prompt we sent</strong>
                    <button type="button" className="quiet" onClick={() => void copyPrompt()}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <pre>{prompt}</pre>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

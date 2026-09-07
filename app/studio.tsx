'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, Download, ShieldCheck, Plus, ImageIcon, Check, Copy, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { originals, matchesLogo, logoScope, type Logo } from '@/lib/catalog';
import { compose, loadImage, defaultLogoLayout, activityTags, type BandPlacement, type Design, type Layout } from '@/lib/composite';
import { canvasToJpegBlob, downloadBlob, flyerExportName } from '@/lib/export-flyer';
import { shareFlyerOnWhatsApp } from '@/lib/share-flyer';
import DesignControls from './design-controls';
import PreviewEditor from './preview-editor';
import AppHeader from './app-header';
import WhatsAppIcon from './whatsapp-icon';
import Pick from './picker';

const prompt = 'Create the flyer without organisation logos, emblems or imitation logos. Keep all text and artwork inside the flyer. I will add an official branding strip separately after generation.';

const initialDesign: Design = {
  background: '#000000',
  bandEnabled: false,
  bandPlacement: 'header',
  tags: [],
  textLayers: [],
  logoLayouts: [],
};

export default function Studio() {
  const [areaFilter, setAreaFilter] = useState('18');
  const [rtFilter, setRtFilter] = useState('All');
  const [signedIn, setSignedIn] = useState(false);
  const [design, setDesign] = useState<Design>(initialDesign);
  const [logos, setLogos] = useState<Logo[]>(originals);
  const [selected, setSelected] = useState(['rti', 'area18']);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [flyer, setFlyer] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [dimensions, setDimensions] = useState('');
  const [filter, setFilter] = useState('All');
  const [showHandles, setShowHandles] = useState(true);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [activityTagOptions, setActivityTagOptions] = useState<string[]>(activityTags);
  const appliedProfile = useRef(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const renderId = useRef(0);
  const uploadId = useRef(0);
  const draggingRef = useRef(false);
  const hasRendered = useRef(false);
  const composeFrame = useRef(0);

  const chosen = logos.filter(l => selected.includes(l.id));

  async function refreshTags() {
    try {
      const r = await fetch('/api/activity-tags', { cache: 'no-store' });
      const d = await r.json() as { tags: { label: string }[] };
      if (r.ok && d.tags?.length) setActivityTagOptions(d.tags.map(tag => tag.label));
    } catch {
      setActivityTagOptions(activityTags);
    }
  }

  async function refresh() {
    setLoading(true);
    setCatalogError('');
    try {
      const r = await fetch('/api/catalog', { cache: 'no-store' });
      const d = await r.json() as { error: string; logos: Logo[]; signedIn: boolean; configured: boolean; profile?: { area: number } };
      if (!r.ok) throw new Error(d.error);
      setLogos(d.logos);
      setSelected(s => s.filter(id => d.logos.some((l: Logo) => l.id === id)));
      setSignedIn(d.signedIn);
      setConfigured(d.configured);
      if (d.profile && !appliedProfile.current) {
        setAreaFilter(String(d.profile.area));
        appliedProfile.current = true;
      }
    } catch (e) {
      setCatalogError((e as Error).message || 'Could not load the logo collection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); void refreshTags(); }, []);

  useEffect(() => {
    setDesign(current => ({
      ...current,
      logoLayouts: selected.map((id, index) => {
        const existing = current.logoLayouts.find(item => item.id === id);
        return existing ?? defaultLogoLayout(id, index, selected.length);
      }),
    }));
  }, [selected]);

  useEffect(() => {
    logos.forEach(logo => { void loadImage(logo.url).catch(() => undefined); });
  }, [logos]);

  useEffect(() => {
    if (!flyer) return;
    cancelAnimationFrame(composeFrame.current);
    composeFrame.current = requestAnimationFrame(() => {
      if (draggingRef.current) return;
      const id = ++renderId.current;
      if (!hasRendered.current) setReady(false);
      const scratch = document.createElement('canvas');
      void compose(scratch, flyer, chosen, design)
        .then(result => {
          if (id !== renderId.current || !canvas.current) return;
          const target = canvas.current;
          target.width = scratch.width;
          target.height = scratch.height;
          target.getContext('2d')!.drawImage(scratch, 0, 0);
          setDimensions(`${scratch.width} × ${result.outputHeight} px`);
          setLayout(result);
          setPreviewCanvas(target);
          setReady(true);
          hasRendered.current = true;
        })
        .catch(e => {
          if (id === renderId.current) setRenderError(e.message);
        });
    });
    return () => cancelAnimationFrame(composeFrame.current);
  }, [flyer, chosen, design]);

  async function upload(file?: File) {
    if (!file) return;
    const id = ++uploadId.current;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20_000_000) {
        throw new Error('Choose a PNG, JPG or WebP flyer smaller than 20 MB.');
      }
      const url = URL.createObjectURL(file);
      let image: HTMLImageElement;
      try {
        image = await loadImage(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (image.naturalWidth * image.naturalHeight > 20_000_000 || image.naturalWidth > 8000 || image.naturalHeight > 9000) {
        throw new Error('Choose a flyer below 20 megapixels and 8,000 × 9,000 pixels.');
      }
      if (id !== uploadId.current) return;
      setFlyer(image);
      setFileName(file.name);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function toggle(id: string) {
    setSelected(s => s.includes(id)
      ? s.filter(x => x !== id)
      : s.length >= 12
        ? (toast.error('Choose up to 12 logos per flyer.'), s)
        : [...s, id]);
  }

  async function exportFlyer() {
    if (!ready || !canvas.current) throw new Error('Your flyer is not ready yet.');
    const blob = await canvasToJpegBlob(canvas.current);
    return { blob, name: flyerExportName(fileName) };
  }

  async function download() {
    if (!ready || !canvas.current) return;
    setExporting(true);
    try {
      const { blob, name } = await exportFlyer();
      downloadBlob(blob, name);
      toast.success('Your flyer is ready to save.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function shareWhatsApp() {
    if (!ready || !canvas.current) return;
    setExporting(true);
    try {
      const { blob, name } = await exportFlyer();
      const result = await shareFlyerOnWhatsApp(blob, name);
      if (result === 'shared') toast.success('Choose WhatsApp in the share menu to send your flyer.');
      else toast.info('Your flyer was saved — attach the JPEG in WhatsApp.');
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Toaster richColors />
      <AppHeader signedIn={signedIn} page="studio" />
      <main className="workspace">
        <section className="intro">
          <div>
            <p className="eyebrow">THE FINAL TOUCH</p>
            <h1>Your flyer. With the right branding.</h1>
            <p>Create in any AI app. Drag logos, tags and text into place on the preview.</p>
          </div>
          <span className="seal"><ShieldCheck size={19} /> Original artwork preserved</span>
        </section>

        <div className="studio-grid">
          <aside className="controls">
            <section className="panel">
              <h2><span className="step">1</span> Add your flyer</h2>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload flyer" onChange={e => upload(e.target.files?.[0])} />
              <button className="upload" onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files[0]); }}>
                <Upload size={23} />
                <strong>{flyer ? 'Change flyer' : 'Choose or drop a flyer'}</strong>
                <span>{fileName || 'PNG, JPG or WebP · up to 20 MB'}</span>
              </button>
              <button className="text-link" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  toast.success('Prompt instruction copied.');
                } catch {
                  toast.error('Copy this instruction: ' + prompt);
                }
              }}>
                <Copy size={14} /> Copy instruction for your AI app
              </button>
            </section>

            <section className="panel">
              <div className="section-line">
                <h2><span className="step">2</span> Choose logos</h2>
                <span className="count">{chosen.length} selected</span>
              </div>
              <a className="secondary collection-cta" href="/collection">{signedIn ? 'Upload and manage logos' : 'Sign in to upload logos'}</a>
              <p className="hint">Logos with black or white boxes? Open Logo collection, upload the file, and use Remove background before saving.</p>
              <div className="selected-logos" aria-label="Logos selected for export">
                <small>Selected for export</small>
                <div>{chosen.map(l => <button key={l.id} onClick={() => toggle(l.id)} aria-label={`Remove ${l.name} from flyer`}>{l.name} ×</button>)}</div>
              </div>
              <div className="filter-grid">
                <Pick label="Filter by area" value={areaFilter} onChange={setAreaFilter} items={[['All', 'All areas'], ...Array.from({ length: 18 }, (_, i) => [String(i + 1), `Area ${i + 1}`])]} />
                <Pick label="Filter by round table" value={rtFilter} onChange={setRtFilter} items={[['All', 'All RTs'], ...Array.from({ length: 400 }, (_, i) => [String(i + 1), `RT ${i + 1}`])]} />
              </div>
              <Pick label="Filter logos" value={filter} onChange={setFilter} items={['All', 'Official', 'Area', 'Table', 'Chairman'].map(x => [x, x === 'All' ? 'All logo types' : `${x} logos`])} />
              {!configured && <p className="error">Account services are not connected yet. See SETUP.md in the project package.</p>}
              {loading && <p role="status" className="muted">Loading the shared collection…</p>}
              {catalogError && <div className="error" role="alert">{catalogError}<button onClick={refresh}>Try again</button></div>}
              <div className="logo-list">
                {logos.filter(l => matchesLogo(l, areaFilter, rtFilter, filter)).map(l => (
                  <label className={`logo-option ${selected.includes(l.id) ? 'selected' : ''}`} key={l.id}>
                    <span className="logo-thumb"><img src={l.url} alt="" /></span>
                    <span className="logo-name"><strong>{l.name}</strong><small>{logoScope(l)}</small></span>
                    <Checkbox aria-label={`Select ${l.name}`} checked={selected.includes(l.id)} onCheckedChange={() => toggle(l.id)} />
                  </label>
                ))}
              </div>
              {!loading && !logos.filter(l => matchesLogo(l, areaFilter, rtFilter, filter)).length && (
                <p className="muted">No logos here yet. Open Logo collection to upload one for this Area or RT.</p>
              )}
            </section>

            <DesignControls design={design} setDesign={setDesign} activityTagOptions={activityTagOptions} />

            <section className="panel">
              <h2><span className="step">5</span> Logo band, download & share</h2>
              <label className="field band-toggle">
                <span>Add black logo band</span>
                <Checkbox checked={design.bandEnabled} onCheckedChange={checked => setDesign({ ...design, bandEnabled: !!checked })} />
              </label>
              {!design.bandEnabled && chosen.length > 0 && (
                <div className="logo-scale-list">
                  {design.logoLayouts.filter(item => selected.includes(item.id)).map(item => {
                    const logo = chosen.find(l => l.id === item.id);
                    return (
                      <label key={item.id} className="range-field">
                        <span>{logo?.name ?? 'Logo'} size<small>{Math.round(item.scale * 100)}%</small></span>
                        <Slider aria-label={`${logo?.name ?? 'Logo'} size`} value={[Math.round(item.scale * 100)]} min={40} max={180} step={5} onValueChange={v => setDesign({
                          ...design,
                          logoLayouts: design.logoLayouts.map(layoutItem => layoutItem.id === item.id ? { ...layoutItem, scale: v[0] / 100 } : layoutItem),
                        })} />
                      </label>
                    );
                  })}
                </div>
              )}
              {design.bandEnabled && (
                <>
                  <Pick label="Band placement" value={design.bandPlacement} onChange={v => setDesign({ ...design, bandPlacement: v as BandPlacement })} items={[
                    ['header', 'Add a header · recommended'],
                    ['footer', 'Add a footer'],
                    ['reserved-top', 'Use reserved space at top'],
                    ['reserved-bottom', 'Use reserved space at bottom'],
                  ]} />
                  <label className="colour-field strip-colour">Band colour<input type="color" value={design.background} onChange={e => setDesign({ ...design, background: e.target.value })} /></label>
                </>
              )}
              <p className="hint">Transparent PNG logos blend best on coloured bands. Remove solid backgrounds when uploading in Logo collection.</p>
              <div className="export-actions">
                <button className="primary download" disabled={!ready || exporting || loading || !!catalogError} onClick={download}>
                  <Download size={18} />{exporting ? 'Preparing JPEG…' : 'Download JPEG'}
                </button>
                <button className="whatsapp" disabled={!ready || exporting || loading || !!catalogError} onClick={shareWhatsApp}>
                  <WhatsAppIcon size={18} />{exporting ? 'Preparing JPEG…' : 'Share on WhatsApp'}
                </button>
              </div>
              <p className="hint">On your phone, Share opens WhatsApp with the finished flyer attached. On desktop, we save the JPEG and open WhatsApp Web so you can attach it.</p>
            </section>
          </aside>

          <section className="preview-panel">
            <div className="preview-toolbar">
              <span><Layers size={17} /> Flyer preview</span>
              <div className="preview-toolbar-actions">
                {flyer && layout && (
                  <button type="button" className="quiet preview-toggle" onClick={() => setShowHandles(v => !v)}>
                    {showHandles ? 'Hide guides' : 'Show guides'}
                  </button>
                )}
                <small>{flyer && ready ? dimensions : 'Your artwork appears here'}</small>
              </div>
            </div>
            <div className={`preview-stage ${flyer ? 'has-flyer' : ''}`}>
              {!flyer ? (
                <div className="empty-preview">
                  <div className="empty-icon"><ImageIcon size={35} /></div>
                  <h2>Ready for your flyer</h2>
                  <p>Upload your design to see the final composition.</p>
                  <button className="secondary" onClick={() => fileInput.current?.click()}><Plus size={17} /> Choose flyer</button>
                  <div className="originals-preview">{originals.map(l => <img key={l.id} src={l.url} alt={l.name} />)}</div>
                  <small>Your two official logos are selected to begin.</small>
                </div>
              ) : (
                <div className="preview-canvas-wrap">
                  <canvas ref={canvas} className={ready ? '' : 'canvas-pending'} aria-label="Finished flyer preview" />
                  {layout && <PreviewEditor canvas={previewCanvas ?? canvas.current} layout={layout} design={design} selectedLogoIds={selected} visible={showHandles} onDesignChange={setDesign} onDraggingChange={dragging => { draggingRef.current = dragging; }} />}
                  {!ready && !renderError && <p className="preview-status" role="status">Preparing your preview…</p>}
                  {renderError && <div className="preview-status error" role="alert">{renderError}</div>}
                </div>
              )}
            </div>
            <div className="preview-foot"><Check size={16} /><span>{showHandles ? 'Drag logos to align — guides snap to rows, columns, other logos, and equal spacing.' : 'Guides hidden — this is your clean preview.'}</span></div>
          </section>
        </div>

        <p className="bottom-note">Finish all AI edits before adding logos. Flyer images are processed on your device.</p>
      </main>
    </>
  );
}

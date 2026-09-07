'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { activityTags, fonts, defaultTagLayer, defaultTextLayer, type Design, type TextLayer } from '@/lib/composite';

function Choice({ label, value, items, onChange }: { label: string; value: string; items: string[][]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="picker" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{items.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="range-field">
      <span>{label}<small>{value}%</small></span>
      <Slider aria-label={label} value={[value]} min={min} max={max} step={1} onValueChange={v => onChange(v[0])} />
    </label>
  );
}

export default function DesignControls({ design, setDesign }: { design: Design; setDesign: (d: Design) => void }) {
  function patchText(id: string, patch: Partial<TextLayer>) {
    setDesign({ ...design, textLayers: design.textLayers.map(layer => layer.id === id ? { ...layer, ...patch } : layer) });
  }

  function toggleTag(tag: string, checked: boolean) {
    if (checked) {
      setDesign({ ...design, tags: [...design.tags, defaultTagLayer(tag, design.tags.length)] });
      return;
    }
    setDesign({ ...design, tags: design.tags.filter(item => item.text !== tag) });
  }

  function patchTag(text: string, patch: Partial<Design['tags'][number]>) {
    setDesign({ ...design, tags: design.tags.map(item => item.text === text ? { ...item, ...patch } : item) });
  }

  return (
    <>
      <section className="panel">
        <h2><span className="step">3</span> Activity tags</h2>
        <p className="hint">Choose tags, then drag them on the preview. Adjust size and font below.</p>
        <div className="tag-choices">
          {activityTags.map(tag => (
            <label key={tag} className={`tag-choice ${design.tags.some(item => item.text === tag) ? 'active' : ''}`}>
              <Checkbox checked={design.tags.some(item => item.text === tag)} onCheckedChange={checked => toggleTag(tag, !!checked)} />
              {tag}
            </label>
          ))}
        </div>
        {design.tags.map((tag, index) => (
          <div key={tag.text} className="text-layer">
            <div className="section-line"><strong>{tag.text}</strong></div>
            <label className="field">Font<Choice label={`Font for ${tag.text}`} value={tag.font} items={fonts} onChange={font => patchTag(tag.text, { font })} /></label>
            <Range label="Tag size" min={1} max={6} value={tag.size} onChange={size => patchTag(tag.text, { size })} />
            <label className="field">Colour<input type="color" value={tag.color} onChange={e => patchTag(tag.text, { color: e.target.value })} /></label>
            <Range label="Horizontal position" min={5} max={95} value={tag.x} onChange={x => patchTag(tag.text, { x })} />
            <Range label="Vertical position" min={2} max={98} value={tag.y} onChange={y => patchTag(tag.text, { y })} />
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="section-line">
          <h2><span className="step">4</span> Add text</h2>
          <span className="count">{design.textLayers.length}/6</span>
        </div>
        <p className="hint">Text sits on the flyer artwork. Drag it on the preview or use the sliders.</p>
        {design.textLayers.map((layer, index) => (
          <div key={layer.id} className="text-layer">
            <div className="section-line">
              <strong>Text {index + 1}</strong>
              <button className="delete" aria-label={`Remove text ${index + 1}`} onClick={() => setDesign({ ...design, textLayers: design.textLayers.filter(item => item.id !== layer.id) })}>
                <Trash2 size={16} />
              </button>
            </div>
            <label className="field">Your text<textarea maxLength={500} rows={3} value={layer.text} onChange={e => patchText(layer.id, { text: e.target.value })} placeholder="Event title, date, venue…" /></label>
            <label className="field">Font<Choice label={`Font for text ${index + 1}`} value={layer.font} items={fonts} onChange={font => patchText(layer.id, { font })} /></label>
            <p className="font-sample" style={{ fontFamily: layer.font }}>{layer.text.split('\n')[0] || 'Celebrate together'}</p>
            <div className="text-tools">
              <label className="colour-field">Colour<input type="color" value={layer.color} onChange={e => patchText(layer.id, { color: e.target.value })} /></label>
              <Choice label={`Alignment for text ${index + 1}`} value={layer.align} items={['left', 'center', 'right'].map(v => [v, v[0].toUpperCase() + v.slice(1)])} onChange={align => patchText(layer.id, { align: align as TextLayer['align'] })} />
            </div>
            <Range label="Text size" min={1} max={15} value={layer.size} onChange={size => patchText(layer.id, { size })} />
            <Range label="Horizontal position" min={5} max={95} value={layer.x} onChange={x => patchText(layer.id, { x })} />
            <Range label="Vertical position" min={2} max={98} value={layer.y} onChange={y => patchText(layer.id, { y })} />
          </div>
        ))}
        <button className="secondary" disabled={design.textLayers.length >= 6} onClick={() => setDesign({ ...design, textLayers: [...design.textLayers, defaultTextLayer()] })}>
          <Plus size={16} /> Add text block
        </button>
      </section>
    </>
  );
}

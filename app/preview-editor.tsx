'use client';
import { useRef, useState } from 'react';
import type { Design, Layout, LogoLayout, TagLayer, TextLayer } from '@/lib/composite';

type DragTarget =
  | { kind: 'text'; id: string }
  | { kind: 'tag'; text: string }
  | { kind: 'logo'; id: string };

type Props = {
  canvas: HTMLCanvasElement | null;
  layout: Layout | null;
  design: Design;
  selectedLogoIds: string[];
  onDesignChange: (design: Design) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function PreviewEditor({ canvas, layout, design, selectedLogoIds, onDesignChange }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragTarget | null>(null);

  if (!canvas || !layout) return null;

  function pointToFlyer(clientX: number, clientY: number) {
    if (!canvas || !layout) return { flyerX: 50, flyerY: 50 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = layout.width / rect.width;
    const scaleY = layout.outputHeight / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const flyerX = clamp((x / layout.width) * 100, 2, 98);
    const flyerY = clamp(((y - layout.flyerY) / layout.height) * 100, 2, 98);
    return { flyerX, flyerY };
  }

  function patchText(id: string, patch: Partial<TextLayer>) {
    onDesignChange({
      ...design,
      textLayers: design.textLayers.map(layer => layer.id === id ? { ...layer, ...patch } : layer),
    });
  }

  function patchTag(text: string, patch: Partial<TagLayer>) {
    onDesignChange({
      ...design,
      tags: design.tags.map(tag => tag.text === text ? { ...tag, ...patch } : tag),
    });
  }

  function patchLogo(id: string, patch: Partial<LogoLayout>) {
    onDesignChange({
      ...design,
      logoLayouts: design.logoLayouts.map(item => item.id === id ? { ...item, ...patch } : item),
    });
  }

  function onPointerDown(target: DragTarget, event: React.PointerEvent) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(target);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const { flyerX, flyerY } = pointToFlyer(event.clientX, event.clientY);
    if (drag.kind === 'text') patchText(drag.id, { x: flyerX, y: flyerY });
    if (drag.kind === 'tag') patchTag(drag.text, { x: flyerX, y: flyerY });
    if (drag.kind === 'logo') patchLogo(drag.id, { x: flyerX, y: flyerY });
  }

  function onPointerUp() {
    setDrag(null);
  }

  const handles = [
    ...design.textLayers.filter(layer => layer.text.trim()).map(layer => ({
      key: `text-${layer.id}`,
      label: 'Text',
      target: { kind: 'text' as const, id: layer.id },
      x: layer.x,
      y: layer.y,
    })),
    ...design.tags.map(tag => ({
      key: `tag-${tag.text}`,
      label: tag.text,
      target: { kind: 'tag' as const, text: tag.text },
      x: tag.x,
      y: tag.y,
    })),
    ...(!design.bandEnabled
      ? design.logoLayouts
          .filter(item => selectedLogoIds.includes(item.id))
          .map(item => ({
            key: `logo-${item.id}`,
            label: 'Logo',
            target: { kind: 'logo' as const, id: item.id },
            x: item.x,
            y: item.y,
          }))
      : []),
  ];

  return (
    <div
      ref={overlayRef}
      className={`preview-overlay${drag ? ' dragging' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {handles.map(handle => (
        <button
          key={handle.key}
          type="button"
          className="drag-handle"
          style={{
            left: `${handle.x}%`,
            top: `${((layout.flyerY + layout.height * handle.y / 100) / layout.outputHeight) * 100}%`,
          }}
          onPointerDown={event => onPointerDown(handle.target, event)}
          aria-label={`Drag ${handle.label}`}
        >
          {handle.label}
        </button>
      ))}
      <p className="preview-overlay-hint">Drag text, tags and logos on the preview.</p>
    </div>
  );
}

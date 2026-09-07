'use client';
import { useEffect, useRef, useState } from 'react';
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
  onDraggingChange?: (dragging: boolean) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isActive(target: DragTarget, handle: DragTarget) {
    if (target.kind !== handle.kind) return false;
    if (target.kind === 'text' && handle.kind === 'text') return target.id === handle.id;
    if (target.kind === 'tag' && handle.kind === 'tag') return target.text === handle.text;
    if (target.kind === 'logo' && handle.kind === 'logo') return target.id === handle.id;
    return false;
  }

function applyPatch(design: Design, target: DragTarget, x: number, y: number): Design {
  if (target.kind === 'text') {
    return {
      ...design,
      textLayers: design.textLayers.map(layer => layer.id === target.id ? { ...layer, x, y } : layer),
    };
  }
  if (target.kind === 'tag') {
    return {
      ...design,
      tags: design.tags.map(tag => tag.text === target.text ? { ...tag, x, y } : tag),
    };
  }
  return {
    ...design,
    logoLayouts: design.logoLayouts.map(item => item.id === target.id ? { ...item, x, y } : item),
  };
}

export default function PreviewEditor({ canvas, layout, design, selectedLogoIds, onDesignChange, onDraggingChange }: Props) {
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const [draft, setDraft] = useState<Design | null>(null);
  const canvasRef = useRef(canvas);
  const layoutRef = useRef(layout);
  canvasRef.current = canvas;
  layoutRef.current = layout;

  const active = draft ?? design;

  function pointToFlyer(clientX: number, clientY: number) {
    const currentCanvas = canvasRef.current;
    const currentLayout = layoutRef.current;
    if (!currentCanvas || !currentLayout) return { flyerX: 50, flyerY: 50 };
    const rect = currentCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (currentLayout.width / rect.width);
    const y = (clientY - rect.top) * (currentLayout.outputHeight / rect.height);
    return {
      flyerX: clamp((x / currentLayout.width) * 100, 2, 98),
      flyerY: clamp(((y - currentLayout.flyerY) / currentLayout.height) * 100, 2, 98),
    };
  }

  useEffect(() => {
    if (!drag) return;
    onDraggingChange?.(true);

    function onMove(event: PointerEvent) {
      const { flyerX, flyerY } = pointToFlyer(event.clientX, event.clientY);
      setDraft(current => applyPatch(current ?? design, drag!, flyerX, flyerY));
    }

    function onUp() {
      setDraft(current => {
        onDraggingChange?.(false);
        if (current) onDesignChange(current);
        return null;
      });
      setDrag(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, onDesignChange, onDraggingChange]);

  if (!canvas || !layout) return null;

  const handles = [
    ...active.textLayers.filter(layer => layer.text.trim()).map(layer => ({
      key: `text-${layer.id}`,
      label: 'Text',
      target: { kind: 'text' as const, id: layer.id },
      x: layer.x,
      y: layer.y,
    })),
    ...active.tags.map(tag => ({
      key: `tag-${tag.text}`,
      label: tag.text,
      target: { kind: 'tag' as const, text: tag.text },
      x: tag.x,
      y: tag.y,
    })),
    ...(!active.bandEnabled
      ? active.logoLayouts
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
    <div className="preview-overlay" aria-hidden={handles.length === 0}>
      {handles.map(handle => (
        <button
          key={handle.key}
          type="button"
          className={`drag-handle${drag && isActive(drag, handle.target) ? ' active' : ''}`}
          style={{
            left: `${handle.x}%`,
            top: `${((layout.flyerY + layout.height * handle.y / 100) / layout.outputHeight) * 100}%`,
          }}
          onPointerDown={event => {
            event.preventDefault();
            event.stopPropagation();
            setDraft(design);
            setDrag(handle.target);
          }}
          aria-label={`Drag ${handle.label}`}
        >
          <span className="drag-handle-dot" />
          <span className="drag-handle-label">{handle.label}</span>
        </button>
      ))}
      {handles.length > 0 && <p className="preview-overlay-hint">Drag the handles with your mouse or finger.</p>}
    </div>
  );
}

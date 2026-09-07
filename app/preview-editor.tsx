'use client';
import { useEffect, useRef, useState } from 'react';
import type { Design, Layout } from '@/lib/composite';

type DragTarget =
  | { kind: 'text'; id: string }
  | { kind: 'tag'; text: string }
  | { kind: 'logo'; id: string };

type Props = {
  canvas: HTMLCanvasElement | null;
  layout: Layout | null;
  design: Design;
  selectedLogoIds: string[];
  visible: boolean;
  onDesignChange: (design: Design) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

const GRID_SNAPS = [20, 33.333, 50, 66.666, 80];
const SNAP_THRESHOLD = 3.2;

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

function nearestSnap(value: number, candidates: number[]) {
  let best = value;
  let matched: number | null = null;
  for (const point of candidates) {
    const distance = Math.abs(value - point);
    if (distance <= SNAP_THRESHOLD) {
      best = point;
      matched = point;
      break;
    }
  }
  return { value: best, guide: matched };
}

function snapTargets(target: DragTarget, design: Design, selectedLogoIds: string[]) {
  const x = [...GRID_SNAPS, 50];
  const y = [...GRID_SNAPS, 50];

  const logoPeers = design.logoLayouts.filter(item => selectedLogoIds.includes(item.id));
  const otherLogos = target.kind === 'logo'
    ? logoPeers.filter(item => item.id !== target.id)
    : logoPeers;

  for (const item of otherLogos) {
    x.push(item.x);
    y.push(item.y);
  }

  const sorted = [...otherLogos].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      x.push((sorted[i].x + sorted[j].x) / 2);
    }
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].x - sorted[i].x;
    x.push(sorted[i].x - gap, sorted[i + 1].x + gap);
    if (i + 2 < sorted.length) {
      x.push(sorted[i].x + gap, sorted[i + 1].x - gap);
    }
  }

  for (const tag of design.tags) {
    x.push(tag.x);
    y.push(tag.y);
  }
  for (const layer of design.textLayers) {
    if (!layer.text.trim()) continue;
    x.push(layer.x);
    y.push(layer.y);
  }

  return { x, y };
}

function snapPosition(
  rawX: number,
  rawY: number,
  target: DragTarget,
  design: Design,
  selectedLogoIds: string[],
) {
  const candidates = snapTargets(target, design, selectedLogoIds);
  const snappedX = nearestSnap(rawX, candidates.x);
  const snappedY = nearestSnap(rawY, candidates.y);
  return {
    x: snappedX.value,
    y: snappedY.value,
    guideX: snappedX.guide,
    guideY: snappedY.guide,
  };
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

export default function PreviewEditor({ canvas, layout, design, selectedLogoIds, visible, onDesignChange, onDraggingChange }: Props) {
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const [draft, setDraft] = useState<Design | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const canvasRef = useRef(canvas);
  const layoutRef = useRef(layout);
  const designRef = useRef(design);
  const selectedRef = useRef(selectedLogoIds);
  canvasRef.current = canvas;
  layoutRef.current = layout;
  designRef.current = design;
  selectedRef.current = selectedLogoIds;

  const active = draft ?? design;

  function pointToFlyer(clientX: number, clientY: number, target: DragTarget, currentDesign: Design) {
    const currentCanvas = canvasRef.current;
    const currentLayout = layoutRef.current;
    if (!currentCanvas || !currentLayout) return { x: 50, y: 50 };
    const rect = currentCanvas.getBoundingClientRect();
    const flyerTopPx = rect.top + rect.height * (currentLayout.flyerY / currentLayout.outputHeight);
    const flyerHeightPx = rect.height * (currentLayout.height / currentLayout.outputHeight);
    const rawX = clamp(((clientX - rect.left) / rect.width) * 100, 2, 98);
    const rawY = clamp(((clientY - flyerTopPx) / flyerHeightPx) * 100, 2, 98);
    const snapped = snapPosition(rawX, rawY, target, currentDesign, selectedRef.current);
    setGuides({ x: snapped.guideX, y: snapped.guideY });
    return { x: snapped.x, y: snapped.y };
  }

  useEffect(() => {
    if (!drag) return;
    onDraggingChange?.(true);

    function onMove(event: PointerEvent) {
      const currentDesign = designRef.current;
      setDraft(current => {
        const base = current ?? currentDesign;
        const { x, y } = pointToFlyer(event.clientX, event.clientY, drag!, base);
        return applyPatch(base, drag!, x, y);
      });
    }

    function onUp() {
      setGuides({ x: null, y: null });
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

  if (!canvas || !layout || !visible) return null;

  const flyerTop = (layout.flyerY / layout.outputHeight) * 100;
  const flyerHeight = (layout.height / layout.outputHeight) * 100;

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
      <div className="flyer-bounds" style={{ top: `${flyerTop}%`, height: `${flyerHeight}%` }}>
        {guides.x !== null && <div className="align-guide vertical" style={{ left: `${guides.x}%` }} />}
        {guides.y !== null && <div className="align-guide horizontal" style={{ top: `${guides.y}%` }} />}
        {GRID_SNAPS.map(point => (
          <div key={`v-${point}`} className="align-guide faint vertical" style={{ left: `${point}%` }} />
        ))}
        {GRID_SNAPS.map(point => (
          <div key={`h-${point}`} className="align-guide faint horizontal" style={{ top: `${point}%` }} />
        ))}
        {handles.map(handle => (
          <button
            key={handle.key}
            type="button"
            className={`drag-handle${drag && isActive(drag, handle.target) ? ' active' : ''}`}
            style={{ left: `${handle.x}%`, top: `${handle.y}%` }}
            title={handle.label}
            onPointerDown={event => {
              event.preventDefault();
              event.stopPropagation();
              setDraft(designRef.current);
              setDrag(handle.target);
            }}
            aria-label={`Drag ${handle.label}`}
          />
        ))}
      </div>
    </div>
  );
}

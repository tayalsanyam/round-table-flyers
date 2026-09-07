import type { Logo } from './catalog';

export type BandPlacement = 'header' | 'footer' | 'reserved-top' | 'reserved-bottom';
export type Placement = BandPlacement | 'overlay';
export const activityTags = ['LAPD Experience', 'Go Go Green', 'Community Service Activity', 'Business Meet', 'Socials', 'Fellowship', 'JAFFA', 'AEX', 'NEX', 'MTM'];
export const fonts: string[][] = [['Modern', 'Modern Bold'], ['Script', 'Celebration Script'], ['Geometric', 'Geometric'], ['Classic', 'Classic Serif'], ['Condensed', 'Bold Condensed']];

export type TextLayer = {
  id: string;
  text: string;
  font: string;
  color: string;
  size: number;
  x: number;
  y: number;
  align: 'left' | 'center' | 'right';
};

export type TagLayer = {
  text: string;
  x: number;
  y: number;
  font: string;
  size: number;
  color: string;
};

export type LogoLayout = {
  id: string;
  x: number;
  y: number;
  scale: number;
};

export type Design = {
  background: string;
  bandEnabled: boolean;
  bandPlacement: BandPlacement;
  tags: TagLayer[];
  textLayers: TextLayer[];
  logoLayouts: LogoLayout[];
};

export type Layout = {
  width: number;
  height: number;
  band: number;
  logoBand: number;
  outputHeight: number;
  flyerY: number;
  bandY: number;
};

export function defaultLogoLayout(id: string, index: number, total: number): LogoLayout {
  const columns = Math.min(4, total);
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    id,
    x: 12 + col * (76 / Math.max(columns - 1, 1)),
    y: 78 - row * 12,
    scale: 1,
  };
}

export function defaultTagLayer(text: string, index: number): TagLayer {
  return {
    text,
    x: 18 + (index % 3) * 28,
    y: 8 + Math.floor(index / 3) * 7,
    font: 'Modern',
    size: 2.1,
    color: '#ffffff',
  };
}

export function defaultTextLayer(): TextLayer {
  return {
    id: crypto.randomUUID(),
    text: '',
    font: 'Modern',
    color: '#ffffff',
    size: 5,
    x: 50,
    y: 40,
    align: 'center',
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('An image could not be loaded. Refresh the logo collection and try again.'));
    image.src = src;
  });
}

export function layout(width: number, height: number, count: number, bandPlacement: BandPlacement, bandEnabled: boolean, extra = 0) {
  const rows = Math.ceil(count / 4);
  const logoBand = Math.round(width * 0.26 * rows);
  const band = logoBand + extra;
  const extend = bandEnabled && (bandPlacement === 'header' || bandPlacement === 'footer');
  if (bandEnabled && !extend && band > height * 0.45) {
    throw new Error('This content needs more space. Use an added header or footer.');
  }
  const outputHeight = height + (extend ? band : 0);
  if (width * outputHeight > 24_000_000 || width > 8000 || outputHeight > 10_000) {
    throw new Error('This flyer is too large for export. Use an image up to 24 megapixels with sides below 8,000 × 10,000 pixels.');
  }
  let flyerY = 0;
  let bandY = 0;
  if (bandEnabled) {
    flyerY = bandPlacement === 'header' ? band : 0;
    bandY = bandPlacement === 'footer' ? height : bandPlacement === 'reserved-bottom' ? height - band : 0;
  }
  return { width, height, band, logoBand, outputHeight, flyerY, bandY, rows };
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line.trimEnd());
        line = char.trimStart();
      } else line += char;
    }
    lines.push(line);
  }
  return lines;
}

function inkFor(background: string) {
  const rgb = background.replace('#', '');
  const luminance = parseInt(rgb.slice(0, 2), 16) * 0.299 + parseInt(rgb.slice(2, 4), 16) * 0.587 + parseInt(rgb.slice(4, 6), 16) * 0.114;
  return luminance > 150 ? '#15243c' : '#ffffff';
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  logo: Logo,
  cx: number,
  cy: number,
  maxSide: number,
) {
  const [sx, sy, sw, sh] = logo.sourceRect ?? [0, 0, image.naturalWidth, image.naturalHeight];
  const scale = Math.min(maxSide / sw, maxSide / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(image, sx, sy, sw, sh, cx - dw / 2, cy - dh / 2, dw, dh);
}

function drawBandLogos(
  ctx: CanvasRenderingContext2D,
  w: number,
  loaded: HTMLImageElement[],
  logos: Logo[],
  bandY: number,
  logoBand: number,
  rows: number,
) {
  const rowH = logoBand / rows;
  loaded.forEach((image, i) => {
    const row = Math.floor(i / 4);
    const inRow = Math.min(4, logos.length - row * 4);
    const cellW = w / inRow;
    const padding = Math.max(12, w * 0.018);
    const [sx, sy, sw, sh] = logos[i].sourceRect ?? [0, 0, image.naturalWidth, image.naturalHeight];
    const scale = Math.min((cellW - 2 * padding) / sw, (rowH - 2 * padding) / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(image, sx, sy, sw, sh, cellW * (i % 4) + (cellW - dw) / 2, bandY + row * rowH + (rowH - dh) / 2, dw, dh);
  });
}

function drawTag(ctx: CanvasRenderingContext2D, tag: TagLayer, w: number, h: number, flyerY: number, pad: number) {
  const size = w * tag.size / 100;
  const tagH = size * 2.2;
  ctx.font = `${size}px "${tag.font}", sans-serif`;
  const labelW = ctx.measureText(tag.text).width + pad;
  const x = w * tag.x / 100 - labelW / 2;
  const y = flyerY + h * tag.y / 100 - tagH / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(x, y, labelW, tagH, tagH / 2);
  ctx.fill();
  ctx.fillStyle = tag.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(tag.text, x + labelW / 2, y + tagH / 2);
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, w: number, h: number, flyerY: number, pad: number) {
  if (!layer.text.trim()) return;
  const size = w * layer.size / 100;
  ctx.font = `${size}px "${layer.font}"`;
  const x = w * layer.x / 100;
  const anchorY = flyerY + h * layer.y / 100;
  const maxWidth = layer.align === 'left'
    ? w - pad - x
    : layer.align === 'right'
      ? x - pad
      : 2 * Math.min(x - pad, w - pad - x);
  const lines = wrap(ctx, layer.text, Math.max(w * 0.05, maxWidth));
  const lineHeight = size * 1.25;
  const textH = lines.length * lineHeight;
  if (textH > h - 2 * pad) throw new Error('Text is too tall for this flyer. Reduce its size or shorten it.');
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, flyerY + pad, w - 2 * pad, h - 2 * pad);
  ctx.clip();
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = layer.align;
  lines.forEach((line, i) => ctx.fillText(line, x, anchorY + i * lineHeight));
  ctx.restore();
}

export async function compose(
  canvas: HTMLCanvasElement,
  flyer: HTMLImageElement,
  logos: Logo[],
  design: Design = { background: '#000000', bandEnabled: true, bandPlacement: 'header', tags: [], textLayers: [], logoLayouts: [] },
) {
  if (!logos.length) throw new Error('Choose at least one logo.');
  const loaded = await Promise.all(logos.map(l => loadImage(l.url)));
  const fontsToLoad = new Set(['Modern', ...design.textLayers.map(t => t.font), ...design.tags.map(t => t.font)]);
  if (typeof document !== 'undefined') {
    await Promise.all([...fontsToLoad].map(f => document.fonts.load(`24px "${f}"`)));
  }

  const w = flyer.naturalWidth;
  const h = flyer.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable in this browser.');

  const bandEnabled = design.bandEnabled;
  const bandPlacement = design.bandPlacement;
  const pad = w * 0.025;
  const l = layout(w, h, logos.length, bandPlacement, bandEnabled, 0);

  canvas.width = w;
  canvas.height = l.outputHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, l.outputHeight);
  ctx.drawImage(flyer, 0, l.flyerY);

  if (bandEnabled) {
    ctx.fillStyle = design.background;
    ctx.fillRect(0, l.bandY, w, l.band);
    drawBandLogos(ctx, w, loaded, logos, l.bandY, l.logoBand, l.rows);
  } else {
    const layouts = design.logoLayouts.filter(item => logos.some(logo => logo.id === item.id));
    const maxSide = w * 0.18;
    layouts.forEach(item => {
      const index = logos.findIndex(logo => logo.id === item.id);
      if (index < 0) return;
      drawLogo(ctx, loaded[index], logos[index], w * item.x / 100, l.flyerY + h * item.y / 100, maxSide * item.scale);
    });
  }

  for (const tag of design.tags) drawTag(ctx, tag, w, h, l.flyerY, pad);
  for (const layer of design.textLayers) drawText(ctx, layer, w, h, l.flyerY, pad);

  return l;
}

import { loadImage } from './composite';

type Point = { r: number; g: number; b: number };

function sampleEdgeColors(ctx: CanvasRenderingContext2D, width: number, height: number): Point[] {
  const points: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));
  for (let x = 0; x < width; x += step) {
    points.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y += step) {
    points.push([0, y], [width - 1, y]);
  }
  return points.map(([x, y]) => {
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return { r, g, b };
  });
}

function averageColor(points: Point[]): Point {
  const total = points.reduce((sum, point) => ({
    r: sum.r + point.r,
    g: sum.g + point.g,
    b: sum.b + point.b,
  }), { r: 0, g: 0, b: 0 });
  return {
    r: total.r / points.length,
    g: total.g / points.length,
    b: total.b / points.length,
  };
}

function luminance(point: Point) {
  return 0.299 * point.r + 0.587 * point.g + 0.114 * point.b;
}

function colorDistance(a: Point, b: Point) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function removeLogoBackground(image: HTMLImageElement, tolerance?: number, softness?: number) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image editing is unavailable in this browser.');
  ctx.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const background = averageColor(sampleEdgeColors(ctx, width, height));
  const darkBackground = luminance(background) < 72;
  const resolvedTolerance = tolerance ?? (darkBackground ? 78 : 48);
  const resolvedSoftness = softness ?? (darkBackground ? 30 : 20);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const distance = colorDistance(pixel, background);
    if (distance <= resolvedTolerance) {
      data[i + 3] = 0;
      continue;
    }
    if (distance < resolvedTolerance + resolvedSoftness) {
      const fade = (distance - resolvedTolerance) / resolvedSoftness;
      data[i + 3] = Math.round(255 * fade);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** @deprecated Use removeLogoBackground */
export const removeLightBackground = removeLogoBackground;

export async function imageFromCanvas(canvas: HTMLCanvasElement) {
  return loadImage(canvas.toDataURL('image/png'));
}

export async function fileFromCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image.'))), 'image/png');
  });
  const base = fileName.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}-transparent.png`, { type: 'image/png' });
}

export async function cloneImage(source: HTMLImageElement | HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  const width = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const height = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image editing is unavailable in this browser.');
  ctx.drawImage(source, 0, 0);
  return imageFromCanvas(canvas);
}

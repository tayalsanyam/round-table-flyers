import { loadImage } from './composite';

type Point = { r: number; g: number; b: number };

function sampleCorners(ctx: CanvasRenderingContext2D, width: number, height: number): Point[] {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];
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

function colorDistance(a: Point, b: Point) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function removeLightBackground(image: HTMLImageElement, tolerance = 48, softness = 20) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image editing is unavailable in this browser.');
  ctx.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const background = averageColor(sampleCorners(ctx, width, height));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const distance = colorDistance(pixel, background);
    if (distance <= tolerance) {
      data[i + 3] = 0;
      continue;
    }
    if (distance < tolerance + softness) {
      const fade = (distance - tolerance) / softness;
      data[i + 3] = Math.round(255 * fade);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function imageFromCanvas(canvas: HTMLCanvasElement) {
  return loadImage(canvas.toDataURL('image/png'));
}

export async function fileFromCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image.'))), 'image/png');
  });
  const base = fileName.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}-nobg.png`, { type: 'image/png' });
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

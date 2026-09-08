export function flyerExportName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'flyer';
  return `${base}-area18.jpg`;
}

export function buildShareFile(blob: Blob, fileName: string) {
  return new File([blob], fileName, { type: 'image/jpeg' });
}

export function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Export failed. Try a smaller flyer.'))),
      'image/jpeg',
      0.95,
    );
  });
}

export function logoDownloadName(name: string, ext: string) {
  const safe = name.replace(/[^\w\s().-]+/g, '').trim().replace(/\s+/g, '-') || 'logo';
  return `${safe}.${ext}`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

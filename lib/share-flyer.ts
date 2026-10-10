import { buildShareFile, canvasToPngBlob, downloadBlob } from './export-flyer';

export type ShareFlyerResult = 'shared' | 'saved' | 'copied';

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function canShareFiles(file: File) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  // Without canShare we cannot know if file payloads are supported (old Safari).
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Native share sheets with WhatsApp are reliable on phones; desktop often is not. */
export function canShareFlyerNative(file: File) {
  return isMobileDevice() && canShareFiles(file);
}

/** iOS rejects share payloads that mix files with title/text/url. */
export function shareFlyerFile(file: File) {
  return navigator.share({ files: [file] });
}

export function openWhatsAppWeb() {
  window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
}

export function saveFlyerForManualShare(blob: Blob, fileName: string) {
  downloadBlob(blob, fileName);
  if (!isMobileDevice()) openWhatsAppWeb();
}

export async function copyFlyerImage(canvas: HTMLCanvasElement) {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const png = await canvasToPngBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    return true;
  } catch {
    return false;
  }
}

export async function shareFlyer(blob: Blob, fileName: string): Promise<ShareFlyerResult> {
  const file = buildShareFile(blob, fileName);

  if (canShareFlyerNative(file)) {
    try {
      await shareFlyerFile(file);
      return 'shared';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') throw error;
    }
  }

  saveFlyerForManualShare(blob, file.name);
  return 'saved';
}

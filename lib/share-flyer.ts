import { buildShareFile, downloadBlob } from './export-flyer';

export type ShareFlyerResult = 'shared' | 'saved';

export function canShareFiles(file: File) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const payload: ShareData = { files: [file] };
  return typeof navigator.canShare !== 'function' || navigator.canShare(payload);
}

/** iOS rejects share payloads that mix files with title/text/url. */
export function shareFlyerFile(file: File) {
  return navigator.share({ files: [file] });
}

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function saveFlyerForManualShare(blob: Blob, fileName: string) {
  downloadBlob(blob, fileName);
  if (!isMobileDevice()) openWhatsAppWeb();
}

export async function shareFlyer(blob: Blob, fileName: string): Promise<ShareFlyerResult> {
  const file = buildShareFile(blob, fileName);

  if (canShareFiles(file)) {
    try {
      await shareFlyerFile(file);
      return 'shared';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') throw error;
    }
  }

  saveFlyerForManualShare(blob, fileName);
  return 'saved';
}

export function openWhatsAppWeb() {
  window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
}

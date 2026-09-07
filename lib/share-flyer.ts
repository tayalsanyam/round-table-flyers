import { downloadBlob } from './export-flyer';

export type WhatsAppShareResult = 'shared' | 'fallback';

export async function shareFlyerOnWhatsApp(blob: Blob, fileName: string): Promise<WhatsAppShareResult> {
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  const shareData: ShareData = { files: [file], title: 'Round Table flyer' };

  if (typeof navigator !== 'undefined' && navigator.share) {
    if (!navigator.canShare || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return 'shared';
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') throw error;
      }
    }
  }

  downloadBlob(blob, fileName);
  window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
  return 'fallback';
}

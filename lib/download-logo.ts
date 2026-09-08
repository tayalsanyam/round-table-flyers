import type { Logo } from './catalog';
import { downloadBlob, logoDownloadName } from './export-flyer';

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export { logoDownloadName } from './export-flyer';

export async function downloadLogoAsset(logo: Pick<Logo, 'name' | 'url'>) {
  const response = await fetch(logo.url);
  if (!response.ok) throw new Error('Could not download this logo.');
  const blob = await response.blob();
  const ext = EXT_BY_TYPE[blob.type] || 'png';
  downloadBlob(blob, logoDownloadName(logo.name, ext));
}

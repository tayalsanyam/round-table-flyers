/** Append a stable cache-buster so browsers reload logo art after collection changes. */
export function withLogoVersion(url: string, version: string | number | null | undefined) {
  const token = version == null || version === '' ? '0' : encodeURIComponent(String(version));
  return `${url}${url.includes('?') ? '&' : '?'}v=${token}`;
}

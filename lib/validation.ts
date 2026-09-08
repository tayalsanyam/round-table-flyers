export const MAX_LOGO_BYTES = 10_000_000;

export function integerIn(value: unknown, min: number, max: number) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function logoFields(form: FormData, admin: boolean) {
  const category = String(form.get('category') || '');
  const area = integerIn(form.get('area'), 1, 18);
  const rt = integerIn(form.get('rt'), 1, 400);
  const tableKindRaw = String(form.get('table_kind') || 'standard');
  const tableKind = tableKindRaw === 'chairman' ? 'chairman' : 'standard';

  if (!['Table', 'Area', 'Official'].includes(category)) throw new Error('Choose a logo category.');
  if (category === 'Official' && !admin) throw new Error('Only an administrator can add official logos.');
  if (category !== 'Official' && !area) throw new Error('Choose Area 1–18.');
  if (category === 'Table' && !rt) throw new Error('Choose RT 1–400.');
  if (category !== 'Table' && tableKind === 'chairman') throw new Error('Choose a logo category.');

  const custom = String(form.get('name') || '').trim();
  const name = category === 'Table' && tableKind === 'standard' ? `RT ${rt}` : custom;
  if (!name || name.length > 100) throw new Error('Enter a name up to 100 characters.');

  return {
    name,
    category,
    area: category === 'Official' ? null : area,
    rt: category === 'Table' ? rt : null,
    tableKind,
  };
}

export function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
}

export function detectedImage(bytes: Uint8Array) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

import { facetByLabel } from './rti-facets';

export type FlyerBrief = {
  activity: string;
  title: string;
  date?: string;
  time?: string;
  showTime?: boolean;
  venue?: string;
  area?: string;
  showArea?: boolean;
  rt?: string;
  rtPrefix?: string;
  details?: string;
  style?: string;
  referenceCount?: number;
  editInstruction?: string;
  isEdit?: boolean;
  /** Admin-editable outline override from the database. */
  facetOutline?: string;
};

function clean(value?: string) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function formatDateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** Tables use a city/table prefix, e.g. CURT 270 — not plain “RT 270”. */
export function tableDisplayName(rt?: string, prefix?: string) {
  const number = clean(rt);
  if (!number) return '';
  const tag = clean(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (tag) return `${tag} ${number}`;
  return `RT ${number}`;
}

export function buildFlyerImagePrompt(brief: FlyerBrief) {
  const activity = clean(brief.activity) || 'Community service';
  const title = clean(brief.title);
  if (!title) throw new Error('Enter a flyer title.');
  if (title.length > 120) throw new Error('Keep the title under 120 characters.');

  const date = clean(brief.date);
  const time = clean(brief.time);
  const showTime = !!brief.showTime;
  const venue = clean(brief.venue);
  const area = clean(brief.area);
  const showArea = !!brief.showArea;
  const tableName = tableDisplayName(brief.rt, brief.rtPrefix);
  const details = clean(brief.details);
  const style = clean(brief.style);
  const facet = facetByLabel(activity);
  const facetOutline = clean(brief.facetOutline) || facet?.outline || '';
  const referenceCount = brief.referenceCount ?? 0;
  const editInstruction = clean(brief.editInstruction);
  const isEdit = !!brief.isEdit;

  if (isEdit && !editInstruction) {
    throw new Error('Describe what to change in the generated image.');
  }

  const contextBits = [
    `Activity type / facet: ${facet?.label ?? activity}.`,
    facetOutline && `Facet outline (theme and messaging only): ${facetOutline}`,
    date && `Event date to show clearly on the flyer: ${formatDateLabel(date)}.`,
    showTime && time && `Event time to show clearly on the flyer: ${formatTimeLabel(time)}.`,
    !showTime && 'Do NOT mention or paint any clock time on the flyer.',
    venue && `Venue or city: ${venue}.`,
    tableName && `Table identity to feature in plain text (not as a logo): ${tableName}. Focus on this table name.`,
    showArea && area && `Also show Area ${area} in plain text only (not as a logo).`,
    !showArea && 'Do NOT mention or paint any Area number on the flyer.',
    details && `Extra event details: ${details}.`,
    style && `Preferred visual direction: ${style}.`,
    referenceCount > 0 && !isEdit && (
      `PRIMARY VISUAL INSPIRATION: take the look from the ${referenceCount} attached reference image${referenceCount > 1 ? 's' : ''} — people, place, composition, colour, and atmosphere. `
      + 'The facet text sets the event meaning; the attached photo(s) should drive what the flyer looks like. '
      + 'Reinterpret into a cinematic vertical flyer. Do not copy any logos, crests, or watermarks from the references.'
    ),
    isEdit && `EDIT REQUEST — apply these changes to the provided flyer artwork: ${editInstruction}`,
  ].filter(Boolean);

  const base = isEdit
    ? [
        'Edit the provided vertical event flyer artwork. Keep it a finished poster, not a mockup.',
        'Preserve the overall flyer format unless the edit request asks otherwise.',
        'Keep logos out: do not add crests, seals, badges, watermarks, QR codes, or brand marks.',
      ]
    : [
        'Create a cinematic, high-impact vertical event flyer artwork for Round Table India, a young-men community service and fellowship movement in India.',
        'Make it dramatic and emotionally charged: strong hero imagery, deep contrast, rich colour, bold light (golden hour, rim light, or vivid dusk), scale, and atmosphere — still tasteful for a community organisation.',
        'Mood: powerful, hopeful, civic-minded, modern Indian public-service energy — not flat corporate, not political campaign, not generic stock collage.',
      ];

  return [
    ...base,
    `Main headline on the flyer, large and commanding: "${title}".`,
    ...contextBits,
    'Composition: one dominant visual idea, clear hierarchy, generous negative space for drama, readable title, short supporting line if needed, and clean margins.',
    'Leave a quiet strip or clear zone near the top or bottom for branding to be added later in another app.',
    'Typography must feel designed into the artwork — high contrast, phone-legible, premium poster lettering.',
    'Prefer photographic realism or stylised cinematic illustration over clip-art.',
    'CRITICAL RULES — never break these:',
    '- Do NOT include any logos, crests, seals, emblems, badges, watermarks, QR codes, or brand marks.',
    '- Do NOT invent or imitate Round Table, Area, Table, Rotary-style, or government logos.',
    '- Do NOT place circular crest shapes that look like organisation emblems.',
    '- Do NOT write “Round Table India”, “RTI”, or fake logo lockups; table text like CURT 270 may appear only as plain event lettering when requested.',
    !showArea ? '- Do NOT show any Area number anywhere on the artwork.' : '- Area may appear only as plain text, never as a logo.',
    'Output a single finished flyer image with no mockup frames, no hands holding the poster, and no UI chrome.',
  ].join('\n');
}

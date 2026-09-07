export const defaultActivityTags = [
  'LAPD Experience',
  'Go Go Green',
  'Community Service Activity',
  'Business Meet',
  'Socials',
  'Fellowship',
  'JAFFA',
  'AEX',
  'NEX',
  'MTM',
] as const;

export type ActivityTag = {
  id: string;
  label: string;
  sortOrder: number;
};

export function activityTagLabel(value: string) {
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label || label.length > 80) throw new Error('Enter a tag name up to 80 characters.');
  return label;
}

export function fallbackActivityTags(): ActivityTag[] {
  return defaultActivityTags.map((label, index) => ({
    id: `builtin-${index}`,
    label,
    sortOrder: index,
  }));
}

export type Member = {
  id: string;
  email: string;
  display_name: string;
  area: number;
  rt: number;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  is_admin: boolean;
};

export function cleanMemberFields(input: {
  display_name?: unknown;
  area?: unknown;
  rt?: unknown;
}) {
  const display_name = String(input.display_name ?? '').trim();
  const area = Number(input.area);
  const rt = Number(input.rt);

  if (!display_name || display_name.length > 100) {
    throw new Error('Enter a display name up to 100 characters.');
  }
  if (!Number.isInteger(area) || area < 1 || area > 18) {
    throw new Error('Area must be between 1 and 18.');
  }
  if (!Number.isInteger(rt) || rt < 1 || rt > 400) {
    throw new Error('Round Table must be between 1 and 400.');
  }

  return { display_name, area, rt };
}

export type IssueStatus = 'open' | 'done';

export type Issue = {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: IssueStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export const ISSUE_CATEGORIES = [
  'Account or login',
  'Logo upload or collection',
  'Flyer editor or download',
  'Privacy or data',
  'Other',
] as const;

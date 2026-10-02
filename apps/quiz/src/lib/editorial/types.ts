// Editorial accounts and scheduled seeding (SYSTEM.md 5.6, V12 run agent G9).
// Shapes of the three stores of docs/pending-migrations/v12-g9-editorial.sql.
// Client safe (no server import): the admin page and the unit tests read them.

export type DraftKind = 'thread' | 'debate' | 'blog';
export const DRAFT_KINDS: readonly DraftKind[] = ['thread', 'debate', 'blog'];

export type DraftStatus = 'draft' | 'approved' | 'published' | 'rejected';
export const DRAFT_STATUSES: readonly DraftStatus[] = ['draft', 'approved', 'published', 'rejected'];

/** One cited source of a draft. A blog cannot be approved without one. */
export interface DraftSource { label: string; url: string | null }

/** editorial_accounts row. */
export interface EditorialAccount {
  user_id: string;
  display_name: string;
  beat: string;
  active: boolean;
}

/** editorial_drafts row. */
export interface EditorialDraft {
  id: number;
  account_id: string;
  kind: DraftKind;
  group_id: number | null;
  title: string;
  body: string;
  /** A debate: 2 to 4 labels. Null for a thread or a blog. */
  options: string[] | null;
  sources: DraftSource[];
  scheduled_at: string | null;
  status: DraftStatus;
  /** Null = made by a template. */
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  /** 'debate:<id>' or 'post:<id>' once published; 'claim:<run>' while a publisher run holds it. */
  published_ref: string | null;
  debate_days: 1 | 3 | 7 | null;
  template_key: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What an admin (or a template) writes. */
export interface DraftInput {
  account_id: string;
  kind: DraftKind;
  group_id: number | null;
  title: string;
  body: string;
  options: string[] | null;
  sources: DraftSource[];
  debate_days: 1 | 3 | 7 | null;
}

export const DRAFT_COLS = 'id, account_id, kind, group_id, title, body, options, sources, scheduled_at, status, created_by, reviewed_by, reviewed_at, published_ref, debate_days, template_key, published_at, created_at, updated_at';

/** SYSTEM.md 5.6: at most 3 items a day. */
export const MAX_PER_DAY = 3;
/** A fan debate closes after 1, 3 or 7 days (community_debates); the default for a draft. */
export const DEFAULT_DEBATE_DAYS = 3;

/** Where a published draft lives. */
export function publishedHref(kind: DraftKind, ref: string | null): string | null {
  const m = /^(debate|post):(\d+)$/.exec(ref ?? '');
  if (!m) return null;
  if (m[1] === 'debate') return `/community/debate/${m[2]}`;
  return kind === 'blog' ? `/community/blog/e${m[2]}` : `/community/thread/e${m[2]}`;
}

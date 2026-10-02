// The publisher rules (SYSTEM.md 5.6), pure and unit tested:
//   1. only an APPROVED draft, reviewed by someone who is an admin (reviewed_by),
//   2. whose time has come (scheduled_at <= now),
//   3. at most 3 items a day (UTC day, the day key of the whole site),
//   4. never two in a row from one account: the next item is never by the account
//      of the last published one. A due draft of that account waits until another
//      account has published.
// One item per run (the cron runs every 15 minutes), the oldest due first.

import { MAX_PER_DAY } from './types';

import type { EditorialDraft } from './types';

export type RuleDraft = Pick<EditorialDraft, 'id' | 'account_id' | 'status' | 'scheduled_at' | 'reviewed_by' | 'reviewed_at' | 'published_ref'>;

export interface PublishContext {
  now: number;
  /** How many items were already published on the UTC day of `now`. */
  publishedToday: number;
  /** account_id of the most recently published item (any day), or null. */
  lastAccountId: string | null;
  isAdmin: (userId: string) => boolean;
  /** Active editorial accounts. A draft of a retired account is never published. */
  activeAccountIds: ReadonlySet<string>;
}

export type SkipReason = 'not_approved' | 'not_reviewed' | 'reviewer_not_admin' | 'not_due' | 'account_inactive' | 'claimed' | 'same_account_as_last';

export interface PublishPlan {
  /** The draft to publish in this run, or null. */
  pick: RuleDraft | null;
  reason: 'ok' | 'daily_cap' | 'nothing_due' | 'same_account_as_last';
  skipped: { id: number; reason: SkipReason }[];
}

/** UTC day bounds of an instant: [start, end). */
export function utcDayBounds(now: number): { start: string; end: string } {
  const d = new Date(now);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { start: new Date(start).toISOString(), end: new Date(start + 86_400_000).toISOString() };
}

/** Why this draft cannot be published now, or null when it can (rule 4 aside). */
export function ineligible(d: RuleDraft, ctx: PublishContext): SkipReason | null {
  if (d.status !== 'approved') return 'not_approved';
  if (!d.reviewed_by || !d.reviewed_at) return 'not_reviewed';
  if (!ctx.isAdmin(d.reviewed_by)) return 'reviewer_not_admin';
  const t = d.scheduled_at ? Date.parse(d.scheduled_at) : NaN;
  if (!Number.isFinite(t) || t > ctx.now) return 'not_due';
  if (!ctx.activeAccountIds.has(d.account_id)) return 'account_inactive';
  if (d.published_ref) return 'claimed';
  return null;
}

export function planPublish(drafts: RuleDraft[], ctx: PublishContext): PublishPlan {
  const skipped: PublishPlan['skipped'] = [];
  if (ctx.publishedToday >= MAX_PER_DAY) return { pick: null, reason: 'daily_cap', skipped };
  const due = drafts
    .filter((d) => { const r = ineligible(d, ctx); if (r) skipped.push({ id: d.id, reason: r }); return !r; })
    .sort((a, b) => Date.parse(a.scheduled_at ?? '') - Date.parse(b.scheduled_at ?? '') || a.id - b.id);
  if (!due.length) return { pick: null, reason: 'nothing_due', skipped };
  const pick = due.find((d) => d.account_id !== ctx.lastAccountId) ?? null;
  if (!pick) {
    for (const d of due) skipped.push({ id: d.id, reason: 'same_account_as_last' });
    return { pick: null, reason: 'same_account_as_last', skipped };
  }
  return { pick, reason: 'ok', skipped };
}

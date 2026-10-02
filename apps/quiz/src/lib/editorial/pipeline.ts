// The editorial pipeline (SYSTEM.md 5.6): a draft is written, an admin approves it
// with a date or rejects it, the publisher publishes what is approved and due.
// Every step goes through the EditorialStore interface, so the whole path from the
// queue to a published post is unit tested with the writes answered by an in-memory
// store (pipeline.test.ts); the real store is ./store.ts (service role).
//
// No side effect by construction: the store has exactly two publishing writes
// (insertDebate, insertPost) and neither grants XP, a badge, a streak, an activity
// event or a ticker line. No fan route is called.

import { approvalBlocker } from './drafts';
import { planPublish, utcDayBounds } from './rules';
import { DEFAULT_DEBATE_DAYS } from './types';

import type { PublishPlan } from './rules';
import type { DraftInput, DraftSource, DraftStatus, EditorialAccount, EditorialDraft } from './types';

export interface DebateWrite { group_id: number | null; author: string; question: string; body: string | null; options: string[]; closes_at: string }
export interface PostWrite { draft_id: number; kind: 'thread' | 'blog'; group_id: number | null; author: string; title: string; body: string; sources: DraftSource[] }

export type DraftPatch = Partial<Pick<EditorialDraft, 'account_id' | 'kind' | 'group_id' | 'title' | 'body' | 'options' | 'sources' | 'debate_days' | 'scheduled_at' | 'status' | 'reviewed_by' | 'reviewed_at' | 'published_ref' | 'published_at'>>;

export interface EditorialStore {
  accounts(): Promise<EditorialAccount[]>;
  listDrafts(limit: number): Promise<EditorialDraft[]>;
  getDraft(id: number): Promise<EditorialDraft | null>;
  /** Null when a draft with the same template_key already exists. */
  insertDraft(row: DraftInput & { created_by: string | null; template_key: string | null }): Promise<EditorialDraft | null>;
  /** Conditional update: only when the row is in one of `when.status` (and, with
   *  `when.unclaimed`, its published_ref is null). Null = no row matched. */
  updateDraft(id: number, patch: DraftPatch, when: { status: DraftStatus[]; unclaimed?: boolean }): Promise<EditorialDraft | null>;
  /** Approved drafts whose scheduled_at is at or before `nowIso`. */
  approvedDue(nowIso: string): Promise<EditorialDraft[]>;
  /** Items published in [startIso, endIso). */
  publishedCount(startIso: string, endIso: string): Promise<number>;
  /** account_id of the most recently published item, or null. */
  lastPublishedAccount(): Promise<string | null>;
  /** The fan-debate write path (community_debates). Returns the new id. */
  insertDebate(row: DebateWrite): Promise<number>;
  /** editorial_posts. Returns the new id. */
  insertPost(row: PostWrite): Promise<number>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
const fail = (error: string, status: number): { ok: false; error: string; status: number } => ({ ok: false, error, status });

/** A new draft. The account must be an active editorial account. */
export async function createDraft(store: EditorialStore, input: DraftInput, by: { adminId: string | null; templateKey?: string | null }): Promise<Result<EditorialDraft>> {
  const accounts = await store.accounts();
  if (!accounts.some((a) => a.active && a.user_id === input.account_id)) return fail('bad_account', 400);
  const row = await store.insertDraft({ ...input, created_by: by.adminId, template_key: by.templateKey ?? null });
  if (!row) return fail('duplicate', 409);
  return { ok: true, value: row };
}

/** Edit a draft. A change after an approval sends it back to review (status draft,
 *  reviewer cleared): what is published is always what an admin approved. */
export async function editDraft(store: EditorialStore, id: number, input: DraftInput): Promise<Result<EditorialDraft>> {
  const accounts = await store.accounts();
  if (!accounts.some((a) => a.active && a.user_id === input.account_id)) return fail('bad_account', 400);
  const row = await store.updateDraft(id, {
    ...input, status: 'draft', reviewed_by: null, reviewed_at: null, scheduled_at: null, published_ref: null,
  }, { status: ['draft', 'approved', 'rejected'] });
  if (!row) return fail('not_editable', 409);
  return { ok: true, value: row };
}

export async function approveDraft(store: EditorialStore, id: number, by: { adminId: string; isAdmin: (id: string) => boolean; scheduledAt: string; now: number }): Promise<Result<EditorialDraft>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  const d = await store.getDraft(id);
  if (!d) return fail('not_found', 404);
  const blocker = approvalBlocker(d);
  if (blocker) return fail(blocker, 422);
  const row = await store.updateDraft(id, {
    status: 'approved', reviewed_by: by.adminId, reviewed_at: new Date(by.now).toISOString(), scheduled_at: by.scheduledAt, published_ref: null,
  }, { status: ['draft', 'approved', 'rejected'] });
  if (!row) return fail('not_editable', 409);
  return { ok: true, value: row };
}

export async function rejectDraft(store: EditorialStore, id: number, by: { adminId: string; isAdmin: (id: string) => boolean; now: number }): Promise<Result<EditorialDraft>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  const row = await store.updateDraft(id, {
    status: 'rejected', reviewed_by: by.adminId, reviewed_at: new Date(by.now).toISOString(), scheduled_at: null, published_ref: null,
  }, { status: ['draft', 'approved'] });
  if (!row) return fail('not_editable', 409);
  return { ok: true, value: row };
}

export interface PublishRun {
  published: { id: number; ref: string; kind: EditorialDraft['kind']; account_id: string } | null;
  reason: PublishPlan['reason'] | 'lost_claim' | 'write_failed';
  skipped: PublishPlan['skipped'];
}

/** One publisher run: at most one item (see rules.ts). */
export async function runPublisher(store: EditorialStore, opts: { now: number; isAdmin: (id: string) => boolean; runId: string }): Promise<PublishRun> {
  const nowIso = new Date(opts.now).toISOString();
  const day = utcDayBounds(opts.now);
  const [accounts, due, publishedToday, lastAccountId] = await Promise.all([
    store.accounts(), store.approvedDue(nowIso), store.publishedCount(day.start, day.end), store.lastPublishedAccount(),
  ]);
  const plan = planPublish(due, {
    now: opts.now, publishedToday, lastAccountId, isAdmin: opts.isAdmin,
    activeAccountIds: new Set(accounts.filter((a) => a.active).map((a) => a.user_id)),
  });
  if (!plan.pick) return { published: null, reason: plan.reason, skipped: plan.skipped };

  // Claim first: two overlapping runs can never publish the same draft.
  const claimed = await store.updateDraft(plan.pick.id, { published_ref: `claim:${opts.runId}` }, { status: ['approved'], unclaimed: true });
  if (!claimed) return { published: null, reason: 'lost_claim', skipped: plan.skipped };

  let ref: string;
  try {
    if (claimed.kind === 'debate') {
      const days = claimed.debate_days ?? DEFAULT_DEBATE_DAYS;
      const id = await store.insertDebate({
        group_id: claimed.group_id, author: claimed.account_id, question: claimed.title, body: claimed.body.trim() || null,
        options: claimed.options ?? [], closes_at: new Date(opts.now + days * 86_400_000).toISOString(),
      });
      ref = `debate:${id}`;
    } else {
      const id = await store.insertPost({
        draft_id: claimed.id, kind: claimed.kind, group_id: claimed.group_id, author: claimed.account_id,
        title: claimed.title, body: claimed.body, sources: claimed.sources,
      });
      ref = `post:${id}`;
    }
  } catch (err) {
    // Nothing was published: give the draft back to the queue.
    await store.updateDraft(claimed.id, { published_ref: null }, { status: ['approved'] }).catch(() => null);
    console.error('[editorial] publish write failed:', err instanceof Error ? err.message : err);
    return { published: null, reason: 'write_failed', skipped: plan.skipped };
  }
  await store.updateDraft(claimed.id, { status: 'published', published_ref: ref, published_at: nowIso }, { status: ['approved'] });
  return { published: { id: claimed.id, ref, kind: claimed.kind, account_id: claimed.account_id }, reason: 'ok', skipped: plan.skipped };
}

// Run O1, lot E1b: the quiz lane of the editorial pipeline, from the review batch to the quiz page.
//
//   import     an admin pastes quiz drafts (formats.md 4): each is validated, filed under its Team account and group, and the
//              drafts of one paste form a review batch (1 to 50, a 25 percent sample to read, two errors reject the batch);
//   approve    an admin approves drafts one by one or closes the review of a batch; an approved quiz gets a scheduled_at at a
//              random time in the coming days (rules.ts planQuizSchedule), the groups with no published quiz first;
//   schedule   an admin spreads the approved quizzes again over N days;
//   publish    the cron (every 15 minutes) writes the approved quiz that is due as a published quiz under its Team account,
//              within 10 a day and 1 per group a day, through the same insert as the create route (create_quiz_bypass).
//
// Every step goes through the QuizStore interface, so the path is unit tested with an in-memory store (quiz.test.ts); the real
// store is ./store.ts (service role). The post-publish hooks (revalidation, IndexNow, followers) run in after-publish.ts, called
// by the cron route with the run's answer. Nothing here grants XP, a badge, a streak, an activity event or a ticker line.

import { hubSlugGroup } from '@/lib/seo/hub-slugs';

import { utcDayBounds } from '../rules';
import { checkQuizPayload, draftSourcesOf, publishByMs, quizRowFor, slugRefusal } from './payload';
import { DEFAULT_SCHEDULE_DAYS, MAX_SCHEDULE_DAYS, batchVerdict, planQuizPublish, planQuizSchedule, sampleSize } from './rules';

import type { DraftSource, DraftStatus, EditorialAccount } from '../types';
import type { QuizDraftPayload } from './payload';
import type { QuizPublishPlan, ScheduleItem, ScheduledSlot } from './rules';
import type { QuizDraft, QuizGroup, QuizWrite, ReviewBatch } from './types';

export interface QuizDraftInsert {
  account_id: string;
  group_id: number;
  title: string;
  sources: DraftSource[];
  created_by: string | null;
  payload: QuizDraftPayload;
  review_batch_id: number | null;
}
export type QuizDraftPatch = Partial<Pick<QuizDraft, 'status' | 'reviewed_by' | 'reviewed_at' | 'scheduled_at' | 'published_ref' | 'published_at'>>;
export interface CalendarRow extends ScheduledSlot { id: number | null }
export interface SlugOwner { id: string; creator_id: string; title: string }

export interface QuizStore {
  accounts(): Promise<EditorialAccount[]>;
  /** The usernames of the editorial accounts (profiles), by username. */
  accountIdsByUsername(usernames: string[]): Promise<Map<string, string>>;
  groupsBySlug(slugs: string[]): Promise<Map<string, QuizGroup>>;
  groupsByIds(ids: number[]): Promise<Map<number, QuizGroup>>;
  /** Published quizzes of each group (an exact count per group: never a client side count of a capped read). */
  publishedQuizCounts(groupIds: number[]): Promise<Map<number, number>>;
  /** The quiz that holds each of these slugs. */
  slugOwners(slugs: string[]): Promise<Map<string, SlugOwner>>;
  /** The slugs of the quizzes that hold each of these titles (lowercase title to slugs): two pages never share a title. */
  quizTitleOwners(titles: string[]): Promise<Map<string, string[]>>;
  /** Slugs among these that a quiz draft (not rejected) already holds. */
  quizDraftSlugs(slugs: string[]): Promise<Set<string>>;
  listQuizDrafts(limit: number, status?: DraftStatus): Promise<QuizDraft[]>;
  getQuizDrafts(ids: number[]): Promise<QuizDraft[]>;
  draftsOfBatch(batchId: number): Promise<QuizDraft[]>;
  insertQuizDraft(row: QuizDraftInsert): Promise<QuizDraft>;
  /** Conditional update, like EditorialStore.updateDraft; null = no row matched. */
  updateQuizDraft(id: number, patch: QuizDraftPatch, when: { status: DraftStatus[]; unclaimed?: boolean }): Promise<QuizDraft | null>;
  /** Approved quiz drafts whose scheduled_at is at or before `nowIso`. */
  approvedQuizDue(nowIso: string): Promise<QuizDraft[]>;
  /** The calendar from `sinceIso`: approved unclaimed quiz drafts (at their scheduled_at) and quizzes published by the pipeline (at published_at). */
  calendarRows(sinceIso: string): Promise<CalendarRow[]>;
  /** Quizzes published in [startIso, endIso). */
  publishedQuizzesBetween(startIso: string, endIso: string): Promise<Array<{ group_id: number | null }>>;
  /** The quiz insert (create_quiz_bypass on kpop). */
  insertQuiz(row: QuizWrite): Promise<{ id: string; slug: string }>;
  createReviewBatch(row: { label: string; size: number; sample_size: number }): Promise<ReviewBatch>;
  listReviewBatches(limit: number): Promise<ReviewBatch[]>;
  getReviewBatch(id: number): Promise<ReviewBatch | null>;
  /** Closes an open batch; null = it was not open. */
  closeReviewBatch(id: number, row: { status: ReviewBatch['status']; errors: number; reviewed_by: string; reviewed_at: string }): Promise<ReviewBatch | null>;
}

export type QuizResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number; detail?: string };
const fail = (error: string, status: number, detail?: string): { ok: false; error: string; status: number; detail?: string } => ({ ok: false, error, status, ...(detail ? { detail } : {}) });

const MAX_IMPORT = 50;
const dayOf = (ms: number): string => utcDayBounds(ms).start;

export interface Blocked { id: number; error: string; detail?: string }

/** Why each draft cannot be approved now (a missing id means it can). One round of reads for the whole set. */
export async function quizBlockers(store: QuizStore, drafts: readonly QuizDraft[]): Promise<Map<number, Blocked>> {
  const out = new Map<number, Blocked>();
  const parsed = new Map<number, QuizDraftPayload>();
  for (const d of drafts) {
    if (d.status === 'published') { out.set(d.id, { id: d.id, error: 'already_published' }); continue; }
    const r = checkQuizPayload(d.payload);
    if (!r.ok) { out.set(d.id, { id: d.id, error: r.error, detail: r.detail }); continue; }
    if (d.group_id === null) { out.set(d.id, { id: d.id, error: 'no_group' }); continue; }
    parsed.set(d.id, r.value);
  }
  const live = drafts.filter((d) => parsed.has(d.id));
  if (!live.length) return out;
  const hubGroups = [...new Set(live.map((d) => hubSlugGroup(parsed.get(d.id)!.slug)?.group).filter((g): g is string => !!g))];
  const [accounts, groups, hubs, owners, titles] = await Promise.all([
    store.accounts(),
    store.groupsByIds([...new Set(live.map((d) => d.group_id!))]),
    hubGroups.length ? store.groupsBySlug(hubGroups) : Promise.resolve(new Map<string, QuizGroup>()),
    store.slugOwners(live.map((d) => parsed.get(d.id)!.slug)),
    store.quizTitleOwners(live.map((d) => parsed.get(d.id)!.title)),
  ]);
  const active = new Set(accounts.filter((a) => a.active).map((a) => a.user_id));
  for (const d of live) {
    const p = parsed.get(d.id)!;
    if (!active.has(d.account_id)) { out.set(d.id, { id: d.id, error: 'bad_account' }); continue; }
    if (groups.get(d.group_id!)?.slug !== p.group_slug) { out.set(d.id, { id: d.id, error: 'group_mismatch' }); continue; }
    if (slugRefusal(p.slug, p.group_slug, (s) => hubs.has(s))) { out.set(d.id, { id: d.id, error: 'hub_slug' }); continue; }
    const owner = owners.get(p.slug);
    if (owner && !(owner.creator_id === d.account_id && owner.title === p.title)) { out.set(d.id, { id: d.id, error: 'slug_taken' }); continue; }
    if ((titles.get(p.title.toLowerCase()) ?? []).some((slug) => slug !== p.slug)) out.set(d.id, { id: d.id, error: 'title_taken' });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Import

export interface ImportRejected { index: number; slug: string | null; error: string; detail: string }
export interface ImportOutcome { batch: ReviewBatch | null; created: QuizDraft[]; rejected: ImportRejected[] }

/** File pasted quiz drafts as one review batch. Drafts that fail a check are listed, the others are filed. */
/**
 * `adminId` is null for a system import (the award-prep cron, audit 04 P1-6): the drafts are filed as `draft` and wait for an admin like any other.
 * `fullReview` makes the whole batch the sample (the owner reads 100 percent of award drafts, not 25).
 */
export async function importQuizDrafts(store: QuizStore, items: unknown, by: { adminId: string | null; label: string; now: number; fullReview?: boolean }): Promise<QuizResult<ImportOutcome>> {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_IMPORT) return fail('bad_batch_size', 400, `Paste 1 to ${MAX_IMPORT} drafts at a time.`);
  const label = by.label.trim().slice(0, 120) || `Quiz drafts of ${new Date(by.now).toISOString().slice(0, 10)}`;
  const rejected: ImportRejected[] = [];
  const valid: Array<{ index: number; p: QuizDraftPayload }> = [];
  const seen = new Set<string>();
  items.forEach((raw, index) => {
    const r = checkQuizPayload(raw);
    const slug = r.ok ? r.value.slug : typeof (raw as { slug?: unknown } | null)?.slug === 'string' ? (raw as { slug: string }).slug : null;
    if (!r.ok) { rejected.push({ index, slug, error: r.error, detail: r.detail }); return; }
    if (seen.has(r.value.slug)) { rejected.push({ index, slug, error: 'slug_repeated', detail: 'Another draft of this paste has the same slug.' }); return; }
    seen.add(r.value.slug);
    valid.push({ index, p: r.value });
  });

  const [accounts, byName, groups, owners, draftSlugs, titles] = await Promise.all([
    store.accounts(),
    store.accountIdsByUsername([...new Set(valid.map((v) => v.p.account))]),
    store.groupsBySlug([...new Set(valid.map((v) => v.p.group_slug))]),
    store.slugOwners(valid.map((v) => v.p.slug)),
    store.quizDraftSlugs(valid.map((v) => v.p.slug)),
    store.quizTitleOwners(valid.map((v) => v.p.title)),
  ]);
  const seenTitles = new Set<string>();
  const hubParts = [...new Set(valid.map((v) => hubSlugGroup(v.p.slug)?.group).filter((g): g is string => !!g))];
  const hubs = hubParts.length ? await store.groupsBySlug(hubParts) : new Map<string, QuizGroup>();
  const active = new Set(accounts.filter((a) => a.active).map((a) => a.user_id));

  const ok: Array<{ index: number; p: QuizDraftPayload; accountId: string; group: QuizGroup }> = [];
  for (const { index, p } of valid) {
    const accountId = byName.get(p.account);
    const group = groups.get(p.group_slug);
    const reject = (error: string, detail: string): void => { rejected.push({ index, slug: p.slug, error, detail }); };
    if (!accountId || !active.has(accountId)) reject('bad_account', `${p.account} is not an active Team account.`);
    else if (!group) reject('bad_group', `No group has the slug ${p.group_slug}.`);
    else if (slugRefusal(p.slug, p.group_slug, (s) => hubs.has(s))) reject('hub_slug', 'The slug is the slug of a group hub ("{group}-quiz", "-test" or "-trivia").');
    else if (owners.has(p.slug)) reject('slug_taken', 'A quiz already has this slug.');
    else if (draftSlugs.has(p.slug)) reject('slug_taken', 'Another quiz draft already has this slug.');
    else if ((titles.get(p.title.toLowerCase()) ?? []).length > 0 || seenTitles.has(p.title.toLowerCase())) reject('title_taken', 'Another quiz already has this title.');
    else { seenTitles.add(p.title.toLowerCase()); ok.push({ index, p, accountId, group }); }
  }
  rejected.sort((a, b) => a.index - b.index);
  if (!ok.length) return { ok: true, value: { batch: null, created: [], rejected } };

  const batch = await store.createReviewBatch({ label, size: ok.length, sample_size: by.fullReview ? ok.length : sampleSize(ok.length) });
  const created: QuizDraft[] = [];
  for (const { p, accountId, group } of ok) {
    created.push(await store.insertQuizDraft({
      account_id: accountId, group_id: group.id, title: p.title, sources: draftSourcesOf(p), created_by: by.adminId, payload: p, review_batch_id: batch.id,
    }));
  }
  return { ok: true, value: { batch, created, rejected } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Approve and schedule

export interface ScheduleBy { adminId: string; isAdmin: (id: string) => boolean; now: number; days?: number | undefined; rand?: (() => number) | undefined }
export interface ApproveOutcome {
  approved: Array<{ id: number; scheduled_at: string }>;
  blocked: Blocked[];
  unplaced: Array<{ id: number; reason: 'no_group' | 'no_room' | 'past_deadline' }>;
}

const clampDays = (d: number | undefined): number => Math.max(1, Math.min(MAX_SCHEDULE_DAYS, Math.floor(d ?? DEFAULT_SCHEDULE_DAYS) || DEFAULT_SCHEDULE_DAYS));

/** The calendar a batch is planned against: what is already scheduled or published from today on, but the batch itself. */
async function planFor(store: QuizStore, drafts: readonly QuizDraft[], by: ScheduleBy): Promise<ReturnType<typeof planQuizSchedule>> {
  const ids = new Set(drafts.map((d) => d.id));
  const [rows, counts] = await Promise.all([
    store.calendarRows(dayOf(by.now)),
    store.publishedQuizCounts([...new Set(drafts.map((d) => d.group_id).filter((g): g is number => g !== null))]),
  ]);
  const items: ScheduleItem[] = drafts.map((d) => {
    const r = checkQuizPayload(d.payload);
    return { id: d.id, group_id: d.group_id, publish_by: r.ok && r.value.publish_by ? publishByMs(r.value.publish_by) : null };
  });
  const firstGroups = new Set(drafts.map((d) => d.group_id).filter((g): g is number => g !== null && (counts.get(g) ?? 0) === 0));
  return planQuizSchedule(items, {
    now: by.now, days: clampDays(by.days), existing: rows.filter((r) => r.id === null || !ids.has(r.id)), firstGroups, rand: by.rand,
  });
}

/** Approve drafts (status draft, rejected or approved again) and schedule them at random times over `days` days. */
export async function approveQuizDrafts(store: QuizStore, ids: readonly number[], by: ScheduleBy): Promise<QuizResult<ApproveOutcome>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  const uniq = [...new Set(ids)];
  if (!uniq.length || uniq.length > 200) return fail('bad_ids', 400);
  const found = await store.getQuizDrafts(uniq);
  const blocked: Blocked[] = uniq.filter((id) => !found.some((d) => d.id === id)).map((id) => ({ id, error: 'not_found' }));
  const blockers = await quizBlockers(store, found);
  const ready = found.filter((d) => !blockers.has(d.id));
  blocked.push(...blockers.values());
  if (!ready.length) return { ok: true, value: { approved: [], blocked, unplaced: [] } };

  const plan = await planFor(store, ready, by);
  const approved: ApproveOutcome['approved'] = [];
  for (const a of plan.assigned) {
    const row = await store.updateQuizDraft(a.id, {
      status: 'approved', reviewed_by: by.adminId, reviewed_at: new Date(by.now).toISOString(), scheduled_at: a.scheduled_at, published_ref: null,
    }, { status: ['draft', 'approved', 'rejected'] }); // not "unclaimed": approving again is how an admin frees a draft a stopped run left claimed
    if (row) approved.push({ id: a.id, scheduled_at: a.scheduled_at }); else blocked.push({ id: a.id, error: 'not_editable' });
  }
  return { ok: true, value: { approved, blocked: blocked.sort((a, b) => a.id - b.id), unplaced: plan.unplaced } };
}

export interface ScheduleOutcome { scheduled: Array<{ id: number; scheduled_at: string }>; blocked: Blocked[]; unplaced: ApproveOutcome['unplaced'] }

/** Spread every approved, unpublished quiz again over `days` days (the admin action of the owner decision). */
export async function scheduleApprovedQuizzes(store: QuizStore, by: ScheduleBy): Promise<QuizResult<ScheduleOutcome>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  const approved = (await store.listQuizDrafts(500, 'approved')).filter((d) => d.published_ref === null);
  const blockers = await quizBlockers(store, approved);
  const ready = approved.filter((d) => !blockers.has(d.id));
  if (!ready.length) return { ok: true, value: { scheduled: [], blocked: [...blockers.values()], unplaced: [] } };
  const plan = await planFor(store, ready, by);
  const scheduled: ScheduleOutcome['scheduled'] = [];
  const blocked = [...blockers.values()];
  for (const a of plan.assigned) {
    const row = await store.updateQuizDraft(a.id, { scheduled_at: a.scheduled_at }, { status: ['approved'], unclaimed: true });
    if (row) scheduled.push({ id: a.id, scheduled_at: a.scheduled_at }); else blocked.push({ id: a.id, error: 'not_editable' });
  }
  return { ok: true, value: { scheduled, blocked: blocked.sort((a, b) => a.id - b.id), unplaced: plan.unplaced } };
}

export async function rejectQuizDraft(store: QuizStore, id: number, by: { adminId: string; isAdmin: (id: string) => boolean; now: number }): Promise<QuizResult<QuizDraft>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  const row = await store.updateQuizDraft(id, {
    status: 'rejected', reviewed_by: by.adminId, reviewed_at: new Date(by.now).toISOString(), scheduled_at: null, published_ref: null,
  }, { status: ['draft', 'approved'] });
  return row ? { ok: true, value: row } : fail('not_editable', 409);
}

export interface CloseOutcome { batch: ReviewBatch; approved: ApproveOutcome['approved']; rejected: number[]; blocked: Blocked[]; unplaced: ApproveOutcome['unplaced'] }

/**
 * Close the review of a batch. `errors` is the number of errors the reviewer found in the sample: two or more reject the
 * batch (every draft still in the queue is rejected), fewer approve it (every draft still in the queue is approved and
 * scheduled over `by.days` days). A batch where some drafts could not be approved, or were rejected one by one, is `partial`.
 */
export async function closeReviewBatch(store: QuizStore, batchId: number, errors: unknown, by: ScheduleBy): Promise<QuizResult<CloseOutcome>> {
  if (!by.isAdmin(by.adminId)) return fail('forbidden', 403);
  if (typeof errors !== 'number' || !Number.isInteger(errors) || errors < 0 || errors > 1000) return fail('bad_errors', 400);
  const batch = await store.getReviewBatch(batchId);
  if (!batch) return fail('not_found', 404);
  if (batch.status !== 'open') return fail('not_open', 409);
  const drafts = await store.draftsOfBatch(batchId);
  const queue = drafts.filter((d) => d.status === 'draft');
  const alreadyRejected = drafts.some((d) => d.status === 'rejected');
  const alreadyLive = drafts.some((d) => d.status === 'published');
  const verdict = batchVerdict(errors);
  const nowIso = new Date(by.now).toISOString();
  let status: ReviewBatch['status'];
  let approved: ApproveOutcome['approved'] = [];
  let blocked: Blocked[] = [];
  let unplaced: ApproveOutcome['unplaced'] = [];
  const rejected: number[] = [];
  if (verdict === 'rejected') {
    // Whatever is not live yet goes, approved or not: the sample showed the batch cannot be trusted.
    for (const d of drafts.filter((x) => x.status === 'draft' || x.status === 'approved')) {
      const r = await rejectQuizDraft(store, d.id, by);
      if (r.ok) rejected.push(d.id);
    }
    status = alreadyLive ? 'partial' : 'rejected';
  } else {
    if (queue.length) {
      const r = await approveQuizDrafts(store, queue.map((d) => d.id), by);
      if (!r.ok) return r;
      ({ approved, blocked, unplaced } = r.value);
    }
    status = alreadyRejected || blocked.length > 0 || unplaced.length > 0 ? 'partial' : 'approved';
  }
  const closed = await store.closeReviewBatch(batchId, { status, errors, reviewed_by: by.adminId, reviewed_at: nowIso });
  if (!closed) return fail('not_open', 409);
  return { ok: true, value: { batch: closed, approved, rejected, blocked, unplaced } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Publish

export interface QuizPublished {
  /** The draft. */
  id: number;
  ref: string;
  account_id: string;
  quiz_id: string;
  slug: string;
  title: string;
  group_id: number;
  group_slug: string;
}
export interface QuizRun {
  published: QuizPublished | null;
  reason: QuizPublishPlan['reason'] | 'lost_claim' | 'write_failed';
  skipped: QuizPublishPlan['skipped'];
}

/** One run of the quiz publisher: at most one quiz (the cron runs every 15 minutes), under the caps of rules.ts. */
export async function runQuizPublisher(store: QuizStore, opts: { now: number; isAdmin: (id: string) => boolean; runId: string }): Promise<QuizRun> {
  const nowIso = new Date(opts.now).toISOString();
  const day = utcDayBounds(opts.now);
  const [accounts, due, publishedToday] = await Promise.all([store.accounts(), store.approvedQuizDue(nowIso), store.publishedQuizzesBetween(day.start, day.end)]);

  // The slugs and groups of the due drafts, read once for the whole plan.
  const slugs: string[] = [];
  const hubParts = new Set<string>();
  const groupIds = new Set<number>();
  for (const d of due) {
    const r = checkQuizPayload(d.payload);
    if (!r.ok) continue;
    slugs.push(r.value.slug);
    const hub = hubSlugGroup(r.value.slug)?.group;
    if (hub) hubParts.add(hub);
    if (d.group_id !== null) groupIds.add(d.group_id);
  }
  const [owners, hubs, groups] = await Promise.all([
    slugs.length ? store.slugOwners(slugs) : Promise.resolve(new Map<string, SlugOwner>()),
    hubParts.size ? store.groupsBySlug([...hubParts]) : Promise.resolve(new Map<string, QuizGroup>()),
    groupIds.size ? store.groupsByIds([...groupIds]) : Promise.resolve(new Map<number, QuizGroup>()),
  ]);

  const plan = planQuizPublish(due, {
    now: opts.now, publishedToday, isAdmin: opts.isAdmin,
    activeAccountIds: new Set(accounts.filter((a) => a.active).map((a) => a.user_id)),
    slugOwners: owners, groupSlugs: new Set(hubs.keys()), groupSlugById: new Map([...groups.values()].map((g) => [g.id, g.slug] as const)),
  });
  if (!plan.pick) return { published: null, reason: plan.reason, skipped: plan.skipped };
  const pick = due.find((d) => d.id === plan.pick!.id)!;
  const parsed = checkQuizPayload(pick.payload);
  if (!parsed.ok || pick.group_id === null) return { published: null, reason: 'nothing_due', skipped: plan.skipped }; // the plan already checked both
  const payload = parsed.value;
  const group = groups.get(pick.group_id)!;

  // Claim first: two overlapping runs can never publish the same draft.
  const claimed = await store.updateQuizDraft(pick.id, { published_ref: `claim:${opts.runId}` }, { status: ['approved'], unclaimed: true });
  if (!claimed) return { published: null, reason: 'lost_claim', skipped: plan.skipped };

  let quizId: string;
  let slug: string;
  try {
    const own = owners.get(payload.slug);
    if (own) {
      quizId = own.id; // a quiz this very draft wrote before a run stopped: not written twice
      slug = payload.slug;
    } else {
      const made = await store.insertQuiz(quizRowFor(pick.account_id, pick.group_id, payload));
      quizId = made.id;
      slug = made.slug;
    }
  } catch (err) {
    // Nothing was published: give the draft back to the queue.
    await store.updateQuizDraft(pick.id, { published_ref: null }, { status: ['approved'] }).catch(() => null);
    console.error('[editorial] quiz write failed:', err instanceof Error ? err.message : err);
    return { published: null, reason: 'write_failed', skipped: plan.skipped };
  }
  const ref = `quiz:${slug}`;
  const done = { status: 'published', published_ref: ref, published_at: nowIso } as const;
  const marked = await store.updateQuizDraft(pick.id, done, { status: ['approved'] }).catch(() => null)
    ?? await store.updateQuizDraft(pick.id, done, { status: ['approved'] }).catch(() => null);
  if (!marked) console.error('[editorial] quiz published but its draft could not be marked:', pick.id, slug);
  return {
    published: { id: pick.id, ref, account_id: pick.account_id, quiz_id: quizId, slug, title: payload.title, group_id: pick.group_id, group_slug: group.slug },
    reason: 'ok', skipped: plan.skipped,
  };
}

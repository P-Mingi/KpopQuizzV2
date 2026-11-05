import { createServiceRoleClient } from '@/lib/supabase/server';
import { SITE_ID } from '@/lib/site/registry';
import { forSite, withSite } from '@/lib/site/scope';

import { supabaseStore } from '../store';
import { QUIZ_DRAFT_COLS, REVIEW_BATCH_COLS } from './types';

import type { CalendarRow, QuizDraftPatch, QuizStore, SlugOwner } from './pipeline';
import type { QuizDraft, QuizGroup, ReviewBatch } from './types';

// The real QuizStore: the service-role client on editorial_drafts (kind 'quiz'), review_batches (SQL 012), groups and quizzes.
// Server only. Callers check editorialQuizOn() and quizLaneLive() first: nothing here runs on a build where the lane is off or
// where 012 is not applied.
//
// Reads of a scoped table go through forSite and the inserts through withSite (the same no-ops on the kpop build with SITE_SCOPE
// off). Two reads are deliberately global: the slug of a quiz is unique across every site (quizzes_slug_key), so slugOwners asks
// the whole table. review_batches.site_id has no default, so its insert names the site.

type Svc = ReturnType<typeof createServiceRoleClient>;

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`editorial quiz ${what}: ${r.error.message}`);
  return r;
}

/** A read capped at 1000 rows by PostgREST: more than this is a read we cannot trust, so the caller stops (law 12). */
const CAP = 1000;
function notCapped<T>(rows: T[] | null, what: string): T[] {
  const list = rows ?? [];
  if (list.length >= CAP) throw new Error(`editorial quiz ${what}: ${CAP} rows or more`);
  return list;
}

const MISSING_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
/** True when the error means "this table or column does not exist (yet)", which is what SQL 012 not applied looks like. */
export function isMissingSchema(err: { code?: string | null; message?: string | null } | null | undefined, status?: number): boolean {
  if (!err) return false;
  if (err.code && MISSING_CODES.has(err.code)) return true;
  if (status === 404) return true;
  return /does not exist|could not find the/i.test(err.message ?? '');
}

/**
 * Is SQL 012 there (editorial_drafts.payload and review_batch_id, review_batches)? Uncached GET probe. False = the quiz lane
 * stays inert. Throws on any other failure, so a blip is never read as "not applied" (nor as applied).
 */
export async function quizLaneLive(svc: Svc = createServiceRoleClient()): Promise<boolean> {
  for (const [table, cols] of [['editorial_drafts', 'payload, review_batch_id'], ['review_batches', 'id']] as const) {
    const { error, status } = await svc.from(table).select(cols).limit(1);
    if (!error) continue;
    if (isMissingSchema(error, status)) return false;
    throw new Error(`editorial quiz probe ${table}: ${error.message}`);
  }
  return true;
}

export function supabaseQuizStore(svc: Svc = createServiceRoleClient()): QuizStore {
  const base = supabaseStore(svc);
  const drafts = () => forSite(svc.from('editorial_drafts').select(QUIZ_DRAFT_COLS)).eq('kind', 'quiz');
  return {
    accounts: () => base.accounts(),
    async accountIdsByUsername(usernames) {
      const out = new Map<string, string>();
      if (!usernames.length) return out;
      const ids = (await base.accounts()).map((a) => a.user_id);
      if (!ids.length) return out;
      const { data } = must(await svc.from('profiles').select('id, username').in('id', ids).in('username', usernames), 'team usernames');
      for (const p of (data ?? []) as Array<{ id: string; username: string | null }>) if (p.username) out.set(p.username, p.id);
      return out;
    },
    async groupsBySlug(slugs) {
      const out = new Map<string, QuizGroup>();
      if (!slugs.length) return out;
      const { data } = must(await forSite(svc.from('groups').select('id, slug, name')).in('slug', slugs), 'groups by slug');
      for (const g of (data ?? []) as QuizGroup[]) out.set(g.slug, g);
      return out;
    },
    async groupsByIds(ids) {
      const out = new Map<number, QuizGroup>();
      if (!ids.length) return out;
      const { data } = must(await forSite(svc.from('groups').select('id, slug, name')).in('id', ids), 'groups by id');
      for (const g of (data ?? []) as QuizGroup[]) out.set(g.id, g);
      return out;
    },
    async publishedQuizCounts(groupIds) {
      const out = new Map<number, number>();
      // One exact count per group (GET + count, limit 1): a count of a capped read would undercount past 1000 rows.
      await Promise.all(groupIds.map(async (g) => {
        const { count } = must(await forSite(svc.from('quizzes').select('id', { count: 'exact' })).eq('group_id', g).eq('status', 'published').limit(1), 'published count');
        out.set(g, count ?? 0);
      }));
      return out;
    },
    async slugOwners(slugs) {
      const out = new Map<string, SlugOwner>();
      if (!slugs.length) return out;
      // Global on purpose: quizzes.slug is unique across the sites.
      const { data } = must(await svc.from('quizzes').select('id, slug, creator_id, title').in('slug', slugs), 'slug owners');
      for (const q of (data ?? []) as Array<SlugOwner & { slug: string }>) out.set(q.slug, { id: q.id, creator_id: q.creator_id, title: q.title });
      return out;
    },
    async quizTitleOwners(titles) {
      const out = new Map<string, string[]>();
      if (!titles.length) return out;
      // Global like the slugs: two pages of the network never share a title (check:metadata-dupes).
      const { data } = must(await svc.from('quizzes').select('slug, title').in('title', titles), 'title owners');
      for (const q of (data ?? []) as Array<{ slug: string; title: string }>) out.set(q.title.toLowerCase(), [...(out.get(q.title.toLowerCase()) ?? []), q.slug]);
      return out;
    },
    async quizDraftSlugs(slugs) {
      const out = new Set<string>();
      if (!slugs.length) return out;
      const { data } = must(await forSite(svc.from('editorial_drafts').select('payload')).eq('kind', 'quiz').neq('status', 'rejected').in('payload->>slug', slugs), 'draft slugs');
      for (const r of (data ?? []) as Array<{ payload: { slug?: unknown } | null }>) if (typeof r.payload?.slug === 'string') out.add(r.payload.slug);
      return out;
    },
    async listQuizDrafts(limit, status) {
      let q = drafts();
      if (status) q = q.eq('status', status);
      const { data } = must(await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit), 'drafts');
      return (data ?? []) as unknown as QuizDraft[];
    },
    async getQuizDrafts(ids) {
      if (!ids.length) return [];
      const { data } = must(await drafts().in('id', ids).limit(CAP), 'drafts by id');
      return (data ?? []) as unknown as QuizDraft[];
    },
    async draftsOfBatch(batchId) {
      const { data } = must(await drafts().eq('review_batch_id', batchId).order('id', { ascending: true }).limit(100), 'batch drafts');
      return (data ?? []) as unknown as QuizDraft[];
    },
    async insertQuizDraft(row) {
      const { data, error } = await svc.from('editorial_drafts').insert(withSite({
        account_id: row.account_id, kind: 'quiz', group_id: row.group_id, title: row.title, sources: row.sources,
        created_by: row.created_by, status: 'draft', payload: row.payload, review_batch_id: row.review_batch_id,
      })).select(QUIZ_DRAFT_COLS).single();
      if (error) throw new Error(`editorial quiz insert draft: ${error.message}`);
      return data as unknown as QuizDraft;
    },
    async updateQuizDraft(id, patch: QuizDraftPatch, when) {
      let q = forSite(svc.from('editorial_drafts').update({ ...patch, updated_at: new Date().toISOString() })).eq('id', id).eq('kind', 'quiz').in('status', when.status);
      if (when.unclaimed) q = q.is('published_ref', null);
      const { data } = must(await q.select(QUIZ_DRAFT_COLS).maybeSingle(), 'update draft');
      return (data as unknown as QuizDraft | null) ?? null;
    },
    async approvedQuizDue(nowIso) {
      const { data } = must(await drafts().eq('status', 'approved').lte('scheduled_at', nowIso).order('scheduled_at', { ascending: true }).order('id', { ascending: true }).limit(200), 'due drafts');
      return (data ?? []) as unknown as QuizDraft[];
    },
    async calendarRows(sinceIso) {
      const [sched, done] = await Promise.all([
        forSite(svc.from('editorial_drafts').select('id, group_id, scheduled_at')).eq('kind', 'quiz').eq('status', 'approved').gte('scheduled_at', sinceIso).limit(CAP),
        forSite(svc.from('editorial_drafts').select('group_id, published_at')).eq('kind', 'quiz').eq('status', 'published').gte('published_at', sinceIso).limit(CAP),
      ]);
      const rows: CalendarRow[] = [];
      for (const r of notCapped(must(sched, 'calendar').data as Array<{ id: number; group_id: number | null; scheduled_at: string }> | null, 'calendar')) rows.push({ id: r.id, group_id: r.group_id, at: r.scheduled_at });
      for (const r of notCapped(must(done, 'calendar').data as Array<{ group_id: number | null; published_at: string }> | null, 'calendar')) rows.push({ id: null, group_id: r.group_id, at: r.published_at });
      return rows;
    },
    async publishedQuizzesBetween(startIso, endIso) {
      const { data } = must(await forSite(svc.from('editorial_drafts').select('group_id')).eq('kind', 'quiz').eq('status', 'published')
        .gte('published_at', startIso).lt('published_at', endIso).limit(CAP), 'published today');
      return notCapped(data as Array<{ group_id: number | null }> | null, 'published today');
    },
    async insertQuiz(row) {
      // The create route's insert, for the kpop build: create_quiz_bypass fills no site_id (the column default 'kpop' does).
      const { data, error } = await svc.rpc('create_quiz_bypass', { p_data: row });
      if (error) throw new Error(`editorial quiz insert: ${error.message}`);
      return data as { id: string; slug: string };
    },
    async createReviewBatch(row) {
      const { data, error } = await svc.from('review_batches').insert({ site_id: SITE_ID, lane: 'editorial-quiz', label: row.label, size: row.size, sample_size: row.sample_size })
        .select(REVIEW_BATCH_COLS).single();
      if (error) throw new Error(`editorial quiz insert batch: ${error.message}`);
      return data as unknown as ReviewBatch;
    },
    async listReviewBatches(limit) {
      const { data } = must(await forSite(svc.from('review_batches').select(REVIEW_BATCH_COLS)).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit), 'batches');
      return (data ?? []) as unknown as ReviewBatch[];
    },
    async getReviewBatch(id) {
      const { data } = must(await forSite(svc.from('review_batches').select(REVIEW_BATCH_COLS)).eq('id', id).maybeSingle(), 'batch');
      return (data as unknown as ReviewBatch | null) ?? null;
    },
    async closeReviewBatch(id, row) {
      const { data } = must(await forSite(svc.from('review_batches').update({ status: row.status, errors: row.errors, reviewed_by: row.reviewed_by, reviewed_at: row.reviewed_at }))
        .eq('id', id).eq('status', 'open').select(REVIEW_BATCH_COLS).maybeSingle(), 'close batch');
      return (data as unknown as ReviewBatch | null) ?? null;
    },
  };
}

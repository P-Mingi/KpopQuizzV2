// Run O1, lot E1b: the real stores against a recording fake of supabase (nothing leaves the process): the quiz drafts never mix with
// the drafts of the other kinds, the quiz insert is the create route's rpc, nothing but the quiz tables and that rpc is written, the
// 012 probe, and the post-publish hooks of a normal quiz creation.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

const calls = vi.hoisted(() => ({ tags: [] as Array<[string, unknown]>, paths: [] as string[], after: [] as Array<() => Promise<void>>, pinged: [] as string[][], rpcs: [] as Array<{ fn: string; args: unknown }>, rpcError: null as string | null }));
vi.mock('next/cache', () => ({
  unstable_cache: <T,>(fn: T) => fn,
  revalidateTag: (tag: string, profile: unknown) => { calls.tags.push([tag, profile]); },
  revalidatePath: (p: string) => { calls.paths.push(p); },
}));
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => { calls.after.push(fn); } }));
vi.mock('@/lib/indexnow', () => ({ pingIndexNow: async (urls: string[]) => { calls.pinged.push(urls); return { submitted: urls.length, batches: 1 }; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({ rpc: async (fn: string, args: unknown) => { calls.rpcs.push({ fn, args }); return { data: null, error: calls.rpcError ? { message: calls.rpcError } : null }; } }),
}));
vi.mock('@/lib/ux-v1/p8/write', () => ({ insertCommunityDebate: async () => ({ id: 1 }) }));

import { supabaseStore } from '../store';
import { afterQuizPublished } from './after-publish';
import { publishQuizLane } from './cron';
import { quizRowFor } from './payload';
import { isMissingSchema, quizLaneLive, supabaseQuizStore } from './store';
import { ADMIN, MINA, NOW, draftFor, goodPayload, isAdmin, memoryQuizStore, seedDrafts } from './test-fixtures';
import { approveQuizDrafts } from './pipeline';

import type { QuizPublished } from './pipeline';

beforeEach(() => { delete process.env.SITE_SCOPE; calls.tags = []; calls.paths = []; calls.after = []; calls.pinged = []; calls.rpcs = []; calls.rpcError = null; });

describe('the drafts of the other kinds never see a quiz draft', () => {
  it('every read and update of the regular store leaves kind quiz out (the queue, the 3 a day count, the last account, the due list)', async () => {
    const db = recordingDb({ editorial_accounts: [], editorial_drafts: [] });
    const s = supabaseStore(db as never);
    await s.listDrafts(10);
    await s.getDraft(1);
    await s.updateDraft(1, { title: 'x' } as never, { status: ['draft'], unclaimed: true });
    await s.approvedDue('2026-11-04T00:00:00Z');
    await s.publishedCount('2026-11-04T00:00:00Z', '2026-11-05T00:00:00Z');
    await s.lastPublishedAccount();
    const drafts = db.queries.filter((q) => q.table === 'editorial_drafts');
    expect(drafts).toHaveLength(6);
    for (const q of drafts) expect(q.ops.some(([m, a]) => m === 'neq' && a[0] === 'kind' && a[1] === 'quiz'), JSON.stringify(q.ops.map(([m]) => m))).toBe(true);
  });

  it('every read and update of the quiz store is on kind quiz, and the site scope applies where it should', async () => {
    process.env.SITE_SCOPE = '1';
    const db = recordingDb({ editorial_accounts: [], editorial_drafts: [], review_batches: [], groups: [], quizzes: [], profiles: [] });
    const s = supabaseQuizStore(db as never);
    await s.listQuizDrafts(10, 'draft');
    await s.getQuizDrafts([1, 2]);
    await s.draftsOfBatch(3);
    await s.updateQuizDraft(1, { status: 'rejected' }, { status: ['draft'] });
    await s.approvedQuizDue('2026-11-04T00:00:00Z');
    await s.calendarRows('2026-11-04T00:00:00Z');
    await s.publishedQuizzesBetween('2026-11-04T00:00:00Z', '2026-11-05T00:00:00Z');
    await s.quizDraftSlugs(['a']);
    const drafts = db.queries.filter((q) => q.table === 'editorial_drafts');
    expect(drafts.length).toBeGreaterThanOrEqual(8);
    for (const q of drafts) expect(q.ops.some(([m, a]) => m === 'eq' && a[0] === 'kind' && a[1] === 'quiz')).toBe(true);
    for (const q of drafts) expect(q.ops.some(([m, a]) => m === 'eq' && a[0] === 'site_id' && a[1] === 'kpop')).toBe(true);
    await s.groupsBySlug(['aespa']);
    await s.publishedQuizCounts([1]);
    await s.listReviewBatches(5);
    expect(db.scopedTo('groups', 'kpop') && db.scopedTo('quizzes', 'kpop') && db.scopedTo('review_batches', 'kpop')).toBe(true);
  });

  it('the slug of a quiz is unique across the sites: its read is global on purpose', async () => {
    process.env.SITE_SCOPE = '1';
    const db = recordingDb({ quizzes: [{ id: 'q1', slug: 'a', creator_id: MINA, title: 'T' }] });
    const owners = await supabaseQuizStore(db as never).slugOwners(['a', 'b']);
    expect([...owners.keys()]).toEqual(['a']);
    expect(db.scopedTo('quizzes', 'kpop')).toBe(false);
    const titles = recordingDb({ quizzes: [{ slug: 's1', title: 'A Title' }, { slug: 's2', title: 'A title' }] });
    expect(await supabaseQuizStore(titles as never).quizTitleOwners(['A Title'])).toEqual(new Map([['a title', ['s1', 's2']]]));
    expect(titles.scopedTo('quizzes', 'kpop')).toBe(false);
  });
});

describe('what the quiz store writes', () => {
  it('a draft: kind quiz, status draft, the payload and the batch; no site_id on kpop with the scope off', async () => {
    const db = recordingDb({ editorial_drafts: { id: 5 } });
    const p = goodPayload();
    await supabaseQuizStore(db as never).insertQuizDraft({ account_id: MINA, group_id: 1, title: p.title, sources: [{ label: 'x', url: 'https://a.test/' }], created_by: ADMIN, payload: p, review_batch_id: 4 });
    expect(db.calls('editorial_drafts', 'insert')).toEqual([[{
      account_id: MINA, kind: 'quiz', group_id: 1, title: p.title, sources: [{ label: 'x', url: 'https://a.test/' }], created_by: ADMIN, status: 'draft', payload: p, review_batch_id: 4,
    }]]);
  });

  it('a review batch names its site (the column has no default)', async () => {
    const db = recordingDb({ review_batches: { id: 2 } });
    await supabaseQuizStore(db as never).createReviewBatch({ label: 'L', size: 10, sample_size: 3 });
    expect(db.calls('review_batches', 'insert')).toEqual([[{ site_id: 'kpop', lane: 'editorial-quiz', label: 'L', size: 10, sample_size: 3 }]]);
  });

  it('the quiz is inserted through create_quiz_bypass with the create route payload, and nothing else', async () => {
    const db = recordingDb({}, { create_quiz_bypass: { id: 'q-1', slug: 'aespa-debut-era-check' } });
    const row = quizRowFor(MINA, 1, goodPayload());
    expect(await supabaseQuizStore(db as never).insertQuiz(row)).toEqual({ id: 'q-1', slug: 'aespa-debut-era-check' });
    expect(db.rpcs).toEqual([{ fn: 'create_quiz_bypass', args: { p_data: row } }]);
    expect(db.queries).toHaveLength(0);
    // the keys are the ones the rpc reads (migration 117) and nothing more
    expect(Object.keys(row).sort()).toEqual(['cover_image_url', 'creator_id', 'difficulty', 'group_id', 'language', 'question_count', 'questions', 'quiz_type', 'settings', 'slug', 'title']);
  });

  it('every write method touches the quiz tables and that rpc only: no profile, XP, badge, activity or notification table', async () => {
    const db = recordingDb({ editorial_drafts: { id: 5 }, review_batches: { id: 2 }, editorial_accounts: [], profiles: [] }, { create_quiz_bypass: { id: 'q', slug: 's' } });
    const s = supabaseQuizStore(db as never);
    await s.insertQuizDraft({ account_id: MINA, group_id: 1, title: 'T', sources: [], created_by: ADMIN, payload: goodPayload(), review_batch_id: null });
    await s.updateQuizDraft(1, { status: 'rejected' }, { status: ['draft'] });
    await s.createReviewBatch({ label: 'L', size: 1, sample_size: 1 });
    await s.closeReviewBatch(1, { status: 'approved', errors: 0, reviewed_by: ADMIN, reviewed_at: '2026-11-04T00:00:00Z' });
    await s.insertQuiz(quizRowFor(MINA, 1, goodPayload()));
    const written = new Set(db.queries.filter((q) => q.ops.some(([m]) => m === 'insert' || m === 'update' || m === 'delete' || m === 'upsert')).map((q) => q.table));
    expect([...written].sort()).toEqual(['editorial_drafts', 'review_batches']);
    expect(db.rpcs.map((r) => r.fn)).toEqual(['create_quiz_bypass']);
  });

  it('the count of published quizzes of a group is an exact count, one query per group', async () => {
    const db = recordingDb({ quizzes: [] });
    await supabaseQuizStore(db as never).publishedQuizCounts([1, 2, 3]);
    const qs = db.queries.filter((q) => q.table === 'quizzes');
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      expect(q.ops.find(([m]) => m === 'select')?.[1]).toEqual(['id', { count: 'exact' }]);
      expect(q.ops.some(([m, a]) => m === 'limit' && a[0] === 1)).toBe(true);
    }
  });
});

describe('the 012 probe: the lane is inert until SQL 012 is applied', () => {
  const probeDb = (answer: (table: string) => { error: { code?: string; message: string } | null; status?: number }) => ({
    from: (table: string) => ({ select: () => ({ limit: async () => ({ ...answer(table) }) }) }),
  });

  it('true when both reads answer', async () => {
    expect(await quizLaneLive(probeDb(() => ({ error: null })) as never)).toBe(true);
  });

  it('false when the column or the table is missing (what a production without 012 answers)', async () => {
    expect(await quizLaneLive(probeDb(() => ({ error: { code: '42703', message: 'column editorial_drafts.payload does not exist' }, status: 400 })) as never)).toBe(false);
    expect(await quizLaneLive(probeDb((t) => (t === 'review_batches' ? { error: { code: 'PGRST205', message: "Could not find the table 'public.review_batches' in the schema cache" }, status: 404 } : { error: null })) as never)).toBe(false);
    expect(await quizLaneLive(probeDb(() => ({ error: { code: 'PGRST204', message: "Could not find the 'payload' column of 'editorial_drafts' in the schema cache" }, status: 400 })) as never)).toBe(false);
  });

  it('throws on any other failure: a blip is never read as "applied" nor as "not applied"', async () => {
    await expect(quizLaneLive(probeDb(() => ({ error: { code: '57014', message: 'canceling statement due to statement timeout' }, status: 500 })) as never)).rejects.toThrow('probe');
  });

  it('isMissingSchema', () => {
    expect(isMissingSchema(null)).toBe(false);
    expect(isMissingSchema({ code: '42P01', message: '' })).toBe(true);
    expect(isMissingSchema({ code: null, message: 'relation "x" does not exist' })).toBe(true);
    expect(isMissingSchema({ code: '23505', message: 'duplicate key' })).toBe(false);
  });
});

describe('the post-publish hooks of a normal quiz creation', () => {
  const pub: QuizPublished = { id: 7, ref: 'quiz:aespa-era-check-1', account_id: MINA, quiz_id: 'quiz-1', slug: 'aespa-era-check-1', title: 'How well do you know aespa era 1?', group_id: 1, group_slug: 'aespa' };

  it('the quiz page, its group page, /new, the home page and the sitemap are refreshed, and IndexNow hears of the three URLs after the response', async () => {
    await afterQuizPublished(pub);
    expect(calls.tags).toEqual([['quizzes', { expire: 0 }], ['groups', { expire: 0 }]]);
    expect(calls.paths).toEqual(['/q/aespa-era-check-1', '/aespa-quiz', '/new', '/', '/sitemap.xml']);
    expect(calls.pinged).toEqual([]);
    await calls.after[0]!();
    expect(calls.pinged).toEqual([['/q/aespa-era-check-1', '/aespa-quiz', '/new']]);
  });

  it('the followers of the Team account are notified through the rpc of the create route', async () => {
    await afterQuizPublished(pub);
    expect(calls.rpcs).toEqual([{ fn: 'fanout_followed_new_quiz', args: { p_creator_id: MINA, p_quiz_id: 'quiz-1', p_quiz_title: 'How well do you know aespa era 1?', p_quiz_slug: 'aespa-era-check-1' } }]);
  });

  it('a failing hook never throws and never stops the next one', async () => {
    calls.rpcError = 'rpc down';
    await expect(afterQuizPublished(pub)).resolves.toBeUndefined();
    const seen: string[] = [];
    await afterQuizPublished(pub, { onChanged: () => { throw new Error('outside a request'); }, fanout: async () => { seen.push('fanout'); } });
    expect(seen).toEqual(['fanout']);
    await expect(afterQuizPublished(pub, { onChanged: () => undefined, fanout: async () => { throw new Error('boom'); } })).resolves.toBeUndefined();
  });
});

describe('the quiz lane of the cron', () => {
  async function ready() {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, [draftFor({ id: 1, slug: 'aespa', name: 'aespa' }, 1)]);
    await approveQuizDrafts(m, ids, { adminId: ADMIN, isAdmin, now: NOW - 3 * 86_400_000, days: 1, rand: () => 0.5 });
    return m;
  }

  it('publishes one quiz, then runs the hooks with it, and answers a summary', async () => {
    const m = await ready();
    const hooked: QuizPublished[] = [];
    const answer = await publishQuizLane({ now: NOW, isAdmin, runId: 'r', store: m, live: async () => true, after: async (p) => { hooked.push(p); } });
    expect(answer).toEqual({ published: { id: 1, ref: 'quiz:aespa-era-check-1', slug: 'aespa-era-check-1' }, reason: 'ok', skipped: 0 });
    expect(hooked).toHaveLength(1);
    expect(hooked[0]).toMatchObject({ slug: 'aespa-era-check-1', group_slug: 'aespa', account_id: MINA });
    expect(m.quizzes).toHaveLength(1);
  });

  it('SQL 012 not applied: nothing is read or written', async () => {
    const m = await ready();
    const answer = await publishQuizLane({ now: NOW, isAdmin, runId: 'r', store: m, live: async () => false, after: async () => { throw new Error('no hook without a quiz'); } });
    expect(answer).toEqual({ published: null, reason: 'quiz_not_live', skipped: 0 });
    expect(m.quizzes).toHaveLength(0);
  });

  it('a nothing-due run runs no hook, and a failure never throws', async () => {
    const empty = memoryQuizStore();
    const after = vi.fn(async () => undefined);
    expect(await publishQuizLane({ now: NOW, isAdmin, runId: 'r', store: empty, live: async () => true, after })).toMatchObject({ published: null, reason: 'nothing_due' });
    expect(after).not.toHaveBeenCalled();
    const broken = memoryQuizStore();
    broken.approvedQuizDue = async () => { throw new Error('db down'); };
    expect(await publishQuizLane({ now: NOW, isAdmin, runId: 'r', store: broken, live: async () => true, after })).toEqual({ published: null, reason: 'quiz_failed', skipped: 0, error: 'quiz_publish_failed' });
    expect(await publishQuizLane({ now: NOW, isAdmin, runId: 'r', store: empty, live: async () => { throw new Error('probe failed'); }, after })).toMatchObject({ error: 'quiz_publish_failed' });
  });
});

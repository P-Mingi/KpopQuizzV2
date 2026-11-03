// Run O1, lot E1b: the quiz lane from the pasted draft to the published quiz, every write answered by an in-memory store (no
// database, no network: nothing here can reach production). Caps over days of cron runs, the review batch, the approvals, the
// publisher (claim, failed write, a run that stopped after the insert) and the two lanes side by side (the 3 a day of threads,
// debates and blogs and the 10 a day of quizzes never count each other).

import { describe, expect, it } from 'vitest';

import { runPublisher } from '../pipeline';
import { approveQuizDrafts, closeReviewBatch, importQuizDrafts, quizBlockers, rejectQuizDraft, runQuizPublisher, scheduleApprovedQuizzes } from './pipeline';
import { quizRowFor } from './payload';
import { MAX_QUIZ_PER_DAY, isQuizTimeAllowed, inQuietWindow, utcDayKey } from './rules';
import { ACCOUNTS, ADMIN, DAY, GROUPS, JAE, MIN, MINA, NOW, draftFor, goodPayload, iso, isAdmin, memoryQuizStore, seedDrafts } from './test-fixtures';

import type { EditorialStore } from '../pipeline';
import type { MemoryQuizStore } from './test-fixtures';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const by = { adminId: ADMIN, isAdmin, now: NOW };
const runQuiz = (m: MemoryQuizStore, now: number, id = 'run') => runQuizPublisher(m, { now, isAdmin, runId: id });

/** n drafts, one per group (group ids 1..n), the account alternating between the two active Team accounts. */
const batchOf = (n: number, from = 1): ReturnType<typeof draftFor>[] => Array.from({ length: n }, (_, i) => draftFor(GROUPS[(from - 1 + i) % GROUPS.length]!, i + 1, i % 2 ? 'jae_team' : 'mina_team'));

describe('import: drafts pasted by an admin become one review batch', () => {
  it('files valid drafts under their Team account and group, with the batch, its size and its sample', async () => {
    const m = memoryQuizStore();
    const r = await importQuizDrafts(m, batchOf(10), { adminId: ADMIN, label: 'First ten', now: NOW });
    expect(r.ok && r.value.rejected).toEqual([]);
    expect(r.ok && r.value.created).toHaveLength(10);
    expect(m.batches).toEqual([expect.objectContaining({ id: 1, label: 'First ten', size: 10, sample_size: 3, status: 'open', lane: 'editorial-quiz' })]);
    expect(m.drafts.every((d) => d.status === 'draft' && d.kind === 'quiz' && d.review_batch_id === 1 && d.reviewed_by === null && d.scheduled_at === null)).toBe(true);
    expect(m.drafts[0]).toMatchObject({ account_id: MINA, group_id: 1, created_by: ADMIN });
    expect(m.drafts[1]).toMatchObject({ account_id: JAE, group_id: 2 });
    expect(m.drafts[0]!.sources).toEqual([{ label: 'Wikipedia, aespa', url: 'https://en.wikipedia.org/wiki/Aespa' }, { label: 'Wikidata, aespa', url: 'https://www.wikidata.org/wiki/Q98400000' }]);
    expect(m.quizzes).toHaveLength(0); // nothing is published by an import
  });

  it('a draft that fails a check is listed with its reason, the others are still filed', async () => {
    const m = memoryQuizStore();
    const items: unknown[] = [
      draftFor(GROUPS[0]!, 1),
      { ...draftFor(GROUPS[1]!, 2), questions: [] },                                        // bad_question_count
      draftFor(GROUPS[2]!, 3, 'nobody_here'),                                               // bad_account
      draftFor(GROUPS[3]!, 4, 'sol_team'),                                                  // retired account
      { ...draftFor(GROUPS[4]!, 5), group_slug: 'not-a-group' },                            // bad_group
      { ...draftFor(GROUPS[5]!, 6), slug: 'bts-quiz' },                                     // hub slug of another group
      { ...draftFor(GROUPS[5]!, 7), slug: 'seventeen-trivia' },                             // hub slug of its own group
      draftFor(GROUPS[6]!, 8),
      { ...draftFor(GROUPS[7]!, 9), slug: draftFor(GROUPS[6]!, 8).slug },                   // repeats a slug of the paste
      null,
    ];
    const r = await importQuizDrafts(m, items, { adminId: ADMIN, label: '', now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.created.map((d) => d.group_id)).toEqual([1, 7]);
    expect(r.value.rejected.map((x) => [x.index, x.error])).toEqual([
      [1, 'bad_question_count'], [2, 'bad_account'], [3, 'bad_account'], [4, 'bad_group'], [5, 'hub_slug'], [6, 'hub_slug'], [8, 'slug_repeated'], [9, 'bad_payload'],
    ]);
    expect(r.value.batch).toMatchObject({ size: 2, sample_size: 1, label: 'Quiz drafts of 2026-11-04' });
  });

  it('a slug a quiz or a draft already holds is refused; nothing at all is filed when nothing is valid', async () => {
    const m = memoryQuizStore();
    await importQuizDrafts(m, [draftFor(GROUPS[0]!, 1)], { adminId: ADMIN, label: 'a', now: NOW });
    m.quizzes.push({ id: 'q-old', slug: draftFor(GROUPS[1]!, 2).slug, creator_id: JAE, title: 'Old', group_id: 2, status: 'published', row: quizRowFor(JAE, 2, goodPayload()) });
    const r = await importQuizDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[1]!, 2)], { adminId: ADMIN, label: 'b', now: NOW });
    expect(r.ok && r.value.rejected.map((x) => x.error)).toEqual(['slug_taken', 'slug_taken']);
    expect(r.ok && r.value.batch).toBeNull();
    expect(m.batches).toHaveLength(1);
    expect(m.drafts).toHaveLength(1);
  });

  it('1 to 50 drafts at a time', async () => {
    const m = memoryQuizStore();
    expect(await importQuizDrafts(m, [], { adminId: ADMIN, label: '', now: NOW })).toMatchObject({ ok: false, error: 'bad_batch_size', status: 400 });
    expect(await importQuizDrafts(m, 'nope', { adminId: ADMIN, label: '', now: NOW })).toMatchObject({ ok: false, error: 'bad_batch_size' });
    expect(await importQuizDrafts(m, Array.from({ length: 51 }, () => ({})), { adminId: ADMIN, label: '', now: NOW })).toMatchObject({ ok: false, error: 'bad_batch_size' });
  });
});

describe('review batch: a sample, two errors reject', () => {
  it('fewer than two errors approve every draft in the queue and schedule it over N days; the batch is approved', async () => {
    const m = memoryQuizStore();
    await importQuizDrafts(m, batchOf(10), { adminId: ADMIN, label: 'Batch', now: NOW });
    const r = await closeReviewBatch(m, 1, 1, { ...by, days: 5, rand: seeded(1) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.batch).toMatchObject({ status: 'approved', errors: 1, reviewed_by: ADMIN });
    expect(r.value.approved).toHaveLength(10);
    expect(m.drafts.every((d) => d.status === 'approved' && d.reviewed_by === ADMIN && !!d.scheduled_at)).toBe(true);
    const days = new Set(m.drafts.map((d) => utcDayKey(Date.parse(d.scheduled_at!))));
    expect(days.size).toBe(5);
    for (const d of m.drafts) {
      const t = Date.parse(d.scheduled_at!);
      expect(isQuizTimeAllowed(t)).toBe(true);
      expect(t).toBeGreaterThan(NOW);
    }
    expect(m.quizzes).toHaveLength(0); // approving publishes nothing
    expect(await closeReviewBatch(m, 1, 0, { ...by, days: 5 })).toMatchObject({ ok: false, error: 'not_open', status: 409 });
  });

  it('two errors reject the batch and every draft not live yet', async () => {
    const m = memoryQuizStore();
    await importQuizDrafts(m, batchOf(6), { adminId: ADMIN, label: 'Batch', now: NOW });
    const r = await closeReviewBatch(m, 1, 2, { ...by, days: 5 });
    expect(r.ok && r.value.batch).toMatchObject({ status: 'rejected', errors: 2 });
    expect(r.ok && r.value.rejected).toHaveLength(6);
    expect(m.drafts.every((d) => d.status === 'rejected' && d.scheduled_at === null)).toBe(true);
    expect(m.quizzes).toHaveLength(0);
  });

  it('a batch where a draft was rejected one by one, or could not be approved, is partial', async () => {
    const m = memoryQuizStore();
    await importQuizDrafts(m, batchOf(4), { adminId: ADMIN, label: 'Batch', now: NOW });
    await rejectQuizDraft(m, 1, by);
    const r = await closeReviewBatch(m, 1, 0, { ...by, days: 3, rand: seeded(2) });
    expect(r.ok && r.value.batch.status).toBe('partial');
    expect(m.drafts.map((d) => d.status)).toEqual(['rejected', 'approved', 'approved', 'approved']);

    const n = memoryQuizStore();
    await importQuizDrafts(n, batchOf(3), { adminId: ADMIN, label: 'Batch', now: NOW });
    n.quizzes.push({ id: 'q', slug: (n.drafts[1]!.payload as { slug: string }).slug, creator_id: JAE, title: 'taken', group_id: 2, status: 'published', row: quizRowFor(JAE, 2, goodPayload()) });
    const p = await closeReviewBatch(n, 1, 0, { ...by, days: 3, rand: seeded(2) });
    expect(p.ok && p.value.batch.status).toBe('partial');
    expect(p.ok && p.value.blocked).toEqual([{ id: 2, error: 'slug_taken' }]);
    expect(n.drafts[1]!.status).toBe('draft');
  });

  it('only an admin closes a review; the errors are a whole number; an unknown batch is not found', async () => {
    const m = memoryQuizStore();
    await importQuizDrafts(m, batchOf(2), { adminId: ADMIN, label: 'Batch', now: NOW });
    expect(await closeReviewBatch(m, 1, 0, { ...by, adminId: 'someone', days: 3 })).toMatchObject({ ok: false, error: 'forbidden', status: 403 });
    expect(await closeReviewBatch(m, 1, -1, { ...by, days: 3 })).toMatchObject({ ok: false, error: 'bad_errors' });
    expect(await closeReviewBatch(m, 1, 1.5, { ...by, days: 3 })).toMatchObject({ ok: false, error: 'bad_errors' });
    expect(await closeReviewBatch(m, 1, '1', { ...by, days: 3 })).toMatchObject({ ok: false, error: 'bad_errors' });
    expect(await closeReviewBatch(m, 99, 0, { ...by, days: 3 })).toMatchObject({ ok: false, error: 'not_found', status: 404 });
    expect(m.drafts.every((d) => d.status === 'draft')).toBe(true);
  });
});

describe('approve and schedule', () => {
  it('a single approval gets a random time in the coming days, the reviewer and the date', async () => {
    const m = memoryQuizStore();
    const [id] = await seedDrafts(m, [draftFor(GROUPS[0]!, 1)]);
    const r = await approveQuizDrafts(m, [id!], { ...by, rand: seeded(3) });
    expect(r.ok && r.value.approved).toHaveLength(1);
    const d = m.drafts[0]!;
    expect(d).toMatchObject({ status: 'approved', reviewed_by: ADMIN, reviewed_at: iso(NOW), published_ref: null });
    expect(isQuizTimeAllowed(Date.parse(d.scheduled_at!))).toBe(true);
    expect(Date.parse(d.scheduled_at!)).toBeGreaterThan(NOW);
  });

  it('refuses what the rules refuse, with the reason', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[1]!, 2), draftFor(GROUPS[2]!, 3), draftFor(GROUPS[3]!, 4)]);
    m.drafts[1]!.payload = { nope: true };
    m.drafts[2]!.account_id = '99999999-9999-4999-8999-999999999999';
    m.drafts[3]!.group_id = 9; // the draft says aespa-like slug of group 4 but the row is filed under TXT
    const r = await approveQuizDrafts(m, [...ids, 404], { ...by, rand: seeded(1) });
    expect(r.ok && r.value.approved.map((a) => a.id)).toEqual([1]);
    expect(r.ok && r.value.blocked.map((b) => [b.id, b.error])).toEqual([[2, 'bad_payload'], [3, 'bad_account'], [4, 'group_mismatch'], [404, 'not_found']]);
    expect(await approveQuizDrafts(m, ids, { ...by, adminId: 'someone' })).toMatchObject({ ok: false, error: 'forbidden', status: 403 });
    expect(await approveQuizDrafts(m, [], by)).toMatchObject({ ok: false, error: 'bad_ids' });
  });

  it('the slug of another group hub and a taken slug block the approval', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, [goodPayload({ slug: 'aespa-debut-era-check' }), goodPayload({ slug: 'aespa-other-check' })]);
    (m.drafts[0]!.payload as { slug: string }).slug = 'bts-quiz'; // filed by SQL, never through the import
    m.quizzes.push({ id: 'q', slug: 'aespa-other-check', creator_id: JAE, title: 'Someone else', group_id: 1, status: 'published', row: quizRowFor(JAE, 1, goodPayload()) });
    const blockers = await quizBlockers(m, m.drafts);
    expect([...blockers.values()].map((b) => [b.id, b.error])).toEqual([[1, 'hub_slug'], [2, 'slug_taken']]);
    void ids;
  });

  it('re-approving an approved draft moves its date; a published draft cannot be approved', async () => {
    const m = memoryQuizStore();
    const [id] = await seedDrafts(m, [draftFor(GROUPS[0]!, 1)]);
    await approveQuizDrafts(m, [id!], { ...by, rand: seeded(1) });
    const first = m.drafts[0]!.scheduled_at;
    await approveQuizDrafts(m, [id!], { ...by, rand: seeded(99) });
    expect(m.drafts[0]!.status).toBe('approved');
    expect(m.drafts[0]!.scheduled_at).not.toBe(first);
    m.drafts[0]!.status = 'published';
    expect(await approveQuizDrafts(m, [id!], by)).toMatchObject({ ok: true, value: { approved: [], blocked: [{ id: 1, error: 'already_published' }] } });
  });

  it('the groups with no published quiz come first', async () => {
    const m = memoryQuizStore();
    // groups 1 and 2 already have a published quiz; 3 and 4 have none. All four have a draft; the first two ids belong to groups 1 and 2.
    m.quizzes.push(
      { id: 'a', slug: 'old-a', creator_id: MINA, title: 'Old A', group_id: 1, status: 'published', row: quizRowFor(MINA, 1, goodPayload()) },
      { id: 'b', slug: 'old-b', creator_id: MINA, title: 'Old B', group_id: 2, status: 'published', row: quizRowFor(MINA, 2, goodPayload()) },
    );
    const ids = await seedDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[1]!, 2), draftFor(GROUPS[2]!, 3), draftFor(GROUPS[3]!, 4)]);
    await approveQuizDrafts(m, ids, { ...by, days: 4, rand: seeded(5) });
    const at = (id: number): number => Date.parse(m.drafts.find((d) => d.id === id)!.scheduled_at!);
    expect(Math.max(at(3), at(4))).toBeLessThan(Math.min(at(1), at(2)));
  });

  it('"spread again" moves only the approved quizzes that are not live: the published and the queue stay', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, batchOf(8));
    await approveQuizDrafts(m, ids.slice(0, 6), { ...by, days: 1, rand: seeded(1) });
    // one went live already, one is still in the queue (ids 7 and 8), one approved draft was rejected by hand afterwards
    Object.assign(m.drafts[0]!, { status: 'published', published_ref: 'quiz:x', published_at: iso(NOW - 10 * MIN) });
    await rejectQuizDraft(m, 2, by);
    const before = m.drafts.map((d) => [d.id, d.status, d.scheduled_at]);
    const r = await scheduleApprovedQuizzes(m, { ...by, days: 6, rand: seeded(2) });
    expect(r.ok && r.value.scheduled.map((s) => s.id).sort()).toEqual([3, 4, 5, 6]);
    const after = m.drafts.map((d) => [d.id, d.status, d.scheduled_at]);
    for (const id of [1, 2, 7, 8]) expect(after.find((a) => a[0] === id)).toEqual(before.find((b) => b[0] === id));
    const days = new Set(m.drafts.filter((d) => [3, 4, 5, 6].includes(d.id)).map((d) => utcDayKey(Date.parse(d.scheduled_at!))));
    expect(days.size).toBe(4);
    expect(await scheduleApprovedQuizzes(m, { ...by, adminId: 'someone' })).toMatchObject({ ok: false, error: 'forbidden' });
  });

  it('a day with no room left reports the draft as unplaced instead of breaking the cap', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[0]!, 2), draftFor(GROUPS[0]!, 3)]);
    const r = await approveQuizDrafts(m, ids, { ...by, days: 2, rand: seeded(1) });
    expect(r.ok && r.value.approved).toHaveLength(2); // one quiz of the group a day, two days
    expect(r.ok && r.value.unplaced).toEqual([{ id: 3, reason: 'no_room' }]);
    expect(m.drafts[2]!.status).toBe('draft');
  });

  it('reject takes a queued or approved draft out; a published one cannot be rejected', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[1]!, 2)]);
    await approveQuizDrafts(m, [ids[0]!], { ...by, rand: seeded(1) });
    expect(await rejectQuizDraft(m, ids[0]!, by)).toMatchObject({ ok: true, value: { status: 'rejected', scheduled_at: null } });
    expect(await rejectQuizDraft(m, ids[0]!, by)).toMatchObject({ ok: false, error: 'not_editable' });
    expect(await rejectQuizDraft(m, ids[1]!, { ...by, adminId: 'someone' })).toMatchObject({ ok: false, error: 'forbidden' });
    m.drafts[1]!.status = 'published';
    expect(await rejectQuizDraft(m, ids[1]!, by)).toMatchObject({ ok: false, error: 'not_editable' });
  });
});

describe('the publisher: one quiz a run, written through the quiz insert', () => {
  async function approved(m: MemoryQuizStore, payloads = batchOf(1)): Promise<number[]> {
    const ids = await seedDrafts(m, payloads);
    await approveQuizDrafts(m, ids, { ...by, now: NOW - 3 * DAY, days: 1, rand: seeded(1) }); // scheduled around 3 days ago: due now
    return ids;
  }

  it('writes the published quiz of the draft: its insert shape, its Team account, its group; the draft says where it went', async () => {
    const m = memoryQuizStore();
    const [id] = await approved(m);
    const run = await runQuiz(m, NOW);
    expect(run).toMatchObject({ reason: 'ok', published: { id, ref: 'quiz:aespa-era-check-1', account_id: MINA, quiz_id: 'quiz-1', slug: 'aespa-era-check-1', group_id: 1, group_slug: 'aespa' } });
    expect(m.inserts).toEqual([quizRowFor(MINA, 1, goodPayload({ slug: 'aespa-era-check-1', title: 'How well do you know aespa era 1?', group_slug: 'aespa' }))]);
    expect(m.inserts[0]).toMatchObject({ creator_id: MINA, group_id: 1, quiz_type: 'multiple_choice', language: 'en', question_count: 10, cover_image_url: null });
    expect(m.inserts[0]!.questions).toHaveLength(10);
    expect(m.drafts[0]).toMatchObject({ status: 'published', published_ref: 'quiz:aespa-era-check-1', published_at: iso(NOW), reviewed_by: ADMIN });
    expect(await runQuiz(m, NOW + 15 * MIN)).toMatchObject({ published: null, reason: 'nothing_due' }); // not twice
    expect(m.quizzes).toHaveLength(1);
  });

  it('nothing before its time, nothing without an admin review, nothing for a retired account', async () => {
    const m = memoryQuizStore();
    const ids = await seedDrafts(m, batchOf(3));
    expect(await runQuiz(m, NOW)).toMatchObject({ published: null, reason: 'nothing_due' }); // queued, not approved
    Object.assign(m.drafts[0]!, { status: 'approved', reviewed_by: ADMIN, reviewed_at: iso(NOW), scheduled_at: iso(NOW + MIN) });
    expect(await runQuiz(m, NOW)).toMatchObject({ published: null, reason: 'nothing_due' }); // approved, not due
    Object.assign(m.drafts[1]!, { status: 'approved', reviewed_by: 'a-fan', reviewed_at: iso(NOW), scheduled_at: iso(NOW - MIN) });
    const r = await runQuiz(m, NOW);
    expect(r.published).toBeNull();
    expect(r.skipped).toEqual([{ id: ids[1]!, reason: 'reviewer_not_admin' }]);
    Object.assign(m.drafts[2]!, { status: 'approved', reviewed_by: ADMIN, reviewed_at: iso(NOW), scheduled_at: iso(NOW - MIN), account_id: '99999999-9999-4999-8999-999999999999' });
    expect((await runQuiz(m, NOW)).skipped.map((s) => s.reason)).toEqual(['reviewer_not_admin', 'account_inactive']);
    expect(m.quizzes).toHaveLength(0);
  });

  it('a failed write publishes nothing and gives the draft back; a draft claimed by another run is left alone', async () => {
    const m = memoryQuizStore();
    const [id] = await approved(m);
    m.failNextInsert = true;
    expect(await runQuiz(m, NOW)).toMatchObject({ published: null, reason: 'write_failed' });
    expect(m.drafts[0]).toMatchObject({ status: 'approved', published_ref: null });
    m.drafts[0]!.published_ref = 'claim:other';
    expect(await runQuiz(m, NOW + MIN)).toMatchObject({ published: null, skipped: [{ id, reason: 'claimed' }] });
    m.drafts[0]!.published_ref = null;
    expect((await runQuiz(m, NOW + 2 * MIN)).published?.id).toBe(id);
    expect(m.quizzes).toHaveLength(1);
  });

  it('a run that stopped after the insert: approving again writes the draft as published without a second quiz', async () => {
    const m = memoryQuizStore();
    const [id] = await approved(m);
    m.crashAfterInsert = true;
    expect(await runQuiz(m, NOW)).toMatchObject({ published: null, reason: 'write_failed' });
    expect(m.quizzes).toHaveLength(1); // the quiz is live, the draft was given back to the queue
    const again = await runQuiz(m, NOW + 15 * MIN);
    expect(again).toMatchObject({ reason: 'ok', published: { id, quiz_id: 'quiz-1', slug: 'aespa-era-check-1' } });
    expect(m.quizzes).toHaveLength(1);
    expect(m.inserts).toHaveLength(1);
    expect(m.drafts[0]!.status).toBe('published');
  });

  it('a slug another quiz holds is skipped with its reason and never blocks the next draft', async () => {
    const m = memoryQuizStore();
    const ids = await approved(m, batchOf(2));
    m.quizzes.push({ id: 'q', slug: (m.drafts[0]!.payload as { slug: string }).slug, creator_id: JAE, title: 'Someone else', group_id: 1, status: 'published', row: quizRowFor(JAE, 1, goodPayload()) });
    const r = await runQuiz(m, NOW);
    expect(r.skipped).toEqual([{ id: ids[0]!, reason: 'slug_taken' }]);
    expect(r.published?.id).toBe(ids[1]);
  });

  it('a hub slug filed by SQL is refused at publication', async () => {
    const m = memoryQuizStore();
    await approved(m, [draftFor(GROUPS[1]!, 1)]);
    (m.drafts[0]!.payload as { slug: string }).slug = 'aespa-trivia';
    expect(await runQuiz(m, NOW)).toMatchObject({ published: null, skipped: [{ id: 1, reason: 'hub_slug' }] });
    expect(m.quizzes).toHaveLength(0);
  });

  it('never in the quiet window', async () => {
    const m = memoryQuizStore();
    await approved(m);
    expect(await runQuiz(m, Date.parse('2026-11-04T23:55:00Z'))).toMatchObject({ published: null, reason: 'quiet_window' });
    expect(m.quizzes).toHaveLength(0);
    expect((await runQuiz(m, Date.parse('2026-11-05T00:30:00Z'))).published).not.toBeNull();
  });
});

describe('days of cron runs: 10 quizzes a day, 1 per group a day, in the window, the quiz of every group', () => {
  it('30 approved drafts over 3 days publish as scheduled, within both caps', async () => {
    const m = memoryQuizStore();
    // 12 groups, 30 drafts: 6 groups have 3 drafts, 6 have 2... the per group cap spreads them over days
    const payloads = Array.from({ length: 30 }, (_, i) => draftFor(GROUPS[i % 12]!, i + 1, i % 2 ? 'jae_team' : 'mina_team'));
    const ids = await seedDrafts(m, payloads);
    const approvedRun = await approveQuizDrafts(m, ids, { ...by, days: 3, rand: seeded(21) });
    expect(approvedRun.ok && approvedRun.value.approved.length + approvedRun.value.unplaced.length).toBe(30);
    const count = approvedRun.ok ? approvedRun.value.approved.length : 0;
    expect(count).toBeGreaterThan(20);

    const published: Array<{ at: number; group: number; scheduled: string }> = [];
    for (let t = NOW; t < NOW + 5 * DAY; t += 15 * MIN) {
      const r = await runQuiz(m, t, `r${t}`);
      if (r.published) {
        const d = m.drafts.find((x) => x.id === r.published!.id)!;
        published.push({ at: t, group: r.published.group_id, scheduled: d.scheduled_at! });
      }
    }
    expect(published).toHaveLength(count);
    const perDay = new Map<string, number>();
    const perGroupDay = new Set<string>();
    for (const p of published) {
      const day = utcDayKey(p.at);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      const k = `${day}/${p.group}`;
      expect(perGroupDay.has(k), `second quiz of group ${p.group} on ${day}`).toBe(false);
      perGroupDay.add(k);
      expect(p.at).toBeGreaterThanOrEqual(Date.parse(p.scheduled)); // never before its date
      expect(p.at - Date.parse(p.scheduled)).toBeLessThan(15 * MIN); // and at the first run after it
      expect(inQuietWindow(p.at)).toBe(false);
      expect(isQuizTimeAllowed(p.at - (p.at % (15 * MIN)))).toBe(true);
    }
    for (const [day, n] of perDay) expect(n, day).toBeLessThanOrEqual(MAX_QUIZ_PER_DAY);
    expect(m.quizzes).toHaveLength(count);
    expect(new Set(m.quizzes.map((q) => q.slug)).size).toBe(count);
  });

  it('even if every draft is due at once (a day of downtime), the caps hold and the rest waits for the next days', async () => {
    const m = memoryQuizStore();
    const payloads = Array.from({ length: 24 }, (_, i) => draftFor(GROUPS[i % 12]!, i + 1));
    const ids = await seedDrafts(m, payloads);
    await approveQuizDrafts(m, ids, { ...by, now: NOW - 10 * DAY, days: 10, rand: seeded(4) });
    const perDay = new Map<string, number>();
    const perGroupDay = new Set<string>();
    for (let t = NOW; t < NOW + 3 * DAY; t += 15 * MIN) {
      const r = await runQuiz(m, t, `r${t}`);
      if (!r.published) continue;
      const day = utcDayKey(t);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      const k = `${day}/${r.published.group_id}`;
      expect(perGroupDay.has(k)).toBe(false);
      perGroupDay.add(k);
    }
    expect([...perDay.values()]).toEqual([10, 10, 4]);
    expect(m.quizzes).toHaveLength(24);
  });
});

describe('the two lanes side by side: the 3 a day of threads, debates and blogs and the 10 a day of quizzes never count each other', () => {
  /** The part of EditorialStore the regular publisher reads and writes, over the same draft rows. */
  function threadsStore(m: MemoryQuizStore, threads: Array<{ id: number; account_id: string; scheduled_at: string; published_at: string | null; status: 'approved' | 'published' }>): EditorialStore & { posts: number[] } {
    const posts: number[] = [];
    const s = {
      posts,
      async accounts() { return ACCOUNTS; },
      async approvedDue(nowIso: string) {
        return threads.filter((t) => t.status === 'approved' && t.scheduled_at <= nowIso).map((t) => ({
          id: t.id, account_id: t.account_id, kind: 'thread', group_id: null, title: `Thread ${t.id}`, body: 'b', options: null, sources: [], scheduled_at: t.scheduled_at, status: 'approved', created_by: null,
          reviewed_by: ADMIN, reviewed_at: iso(NOW), published_ref: null, debate_days: null, template_key: null, published_at: null, created_at: iso(NOW), updated_at: iso(NOW),
        }));
      },
      // exactly what the real store counts: the drafts that are not quizzes
      async publishedCount(start: string, end: string) { return threads.filter((t) => t.status === 'published' && t.published_at! >= start && t.published_at! < end).length; },
      async lastPublishedAccount() { return threads.filter((t) => t.status === 'published').sort((a, b) => b.published_at!.localeCompare(a.published_at!))[0]?.account_id ?? null; },
      async updateDraft(id: number, patch: { published_ref?: string | null; status?: string; published_at?: string }) {
        const t = threads.find((x) => x.id === id);
        if (!t) return null;
        if (patch.status === 'published') { t.status = 'published'; t.published_at = patch.published_at ?? null; }
        return { id } as never;
      },
      async insertPost(row: { draft_id: number }) { posts.push(row.draft_id); return 900 + posts.length; },
    };
    void m;
    return s as unknown as EditorialStore & { posts: number[] };
  }

  it('10 quizzes published today leave the 3 threads of the day alone, and 3 threads leave the quizzes alone', async () => {
    const m = memoryQuizStore();
    const day = Date.parse('2026-11-04T10:00:00Z');
    const payloads = Array.from({ length: 12 }, (_, i) => draftFor(GROUPS[i]!, i + 1));
    const ids = await seedDrafts(m, payloads);
    for (const [i, id] of ids.entries()) Object.assign(m.drafts.find((d) => d.id === id)!, { status: 'approved', reviewed_by: ADMIN, reviewed_at: iso(NOW), scheduled_at: iso(day - DAY + i * MIN) });
    const threads = Array.from({ length: 5 }, (_, i) => ({ id: 1000 + i, account_id: i % 2 ? JAE : MINA, scheduled_at: iso(day - 60 * MIN), published_at: null, status: 'approved' as const }));
    const store = threadsStore(m, threads);

    let quizzes = 0;
    let items = 0;
    for (let t = day; t < day + 6 * 60 * MIN; t += 15 * MIN) { // six hours of runs on one UTC day
      const reg = await runPublisher(store, { now: t, isAdmin, runId: `t${t}` });
      if (reg.published) items++;
      const q = await runQuiz(m, t, `q${t}`);
      if (q.published) quizzes++;
    }
    expect(items).toBe(3);              // MAX_PER_DAY of the regular lane, unchanged by the quizzes
    expect(quizzes).toBe(10);           // MAX_QUIZ_PER_DAY, unchanged by the threads
    expect(store.posts).toHaveLength(3);
    expect(m.quizzes).toHaveLength(10);
    // the next UTC day: both caps are fresh
    const next = Date.parse('2026-11-05T09:00:00Z');
    expect((await runPublisher(store, { now: next, isAdmin, runId: 'n1' })).published).not.toBeNull();
    expect((await runQuiz(m, next, 'n2')).published).not.toBeNull();
  });
});

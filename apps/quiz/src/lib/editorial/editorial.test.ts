// V12 G9 editorial seeding: the publisher rules, the draft checks, the templates and
// the whole pipeline from the queue to a published post, with every write answered
// by an in-memory store (no database, no network: nothing here can reach production).

import { describe, expect, it } from 'vitest';

import { approvalBlocker, checkDraftInput, checkSchedule, cleanSources, safeUrl } from './drafts';
import { approveDraft, createDraft, editDraft, rejectDraft, runPublisher } from './pipeline';
import { draftToPost } from './preview';
import { ineligible, planPublish, utcDayBounds } from './rules';
import { buildComebackTopic, buildWeeklyRecap, dayLabel, pickAccount } from './templates';
import { MAX_PER_DAY, publishedHref } from './types';

import type { DebateWrite, DraftPatch, EditorialStore, PostWrite } from './pipeline';
import type { PublishContext, RuleDraft } from './rules';
import type { DraftInput, DraftStatus, EditorialAccount, EditorialDraft } from './types';

const MINA = '11111111-1111-4111-8111-111111111111';
const JAE = '22222222-2222-4222-8222-222222222222';
const SOL = '33333333-3333-4333-8333-333333333333';
const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAN = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const isAdmin = (id: string): boolean => id === ADMIN;
const NOW = Date.parse('2026-10-02T12:00:00Z');
const iso = (ms: number): string => new Date(ms).toISOString();
const MIN = 60_000;

const ACCOUNTS: EditorialAccount[] = [
  { user_id: MINA, display_name: 'Mina', beat: 'Girl groups', active: true },
  { user_id: JAE, display_name: 'Jae', beat: 'Boy groups', active: true },
  { user_id: SOL, display_name: 'Sol', beat: 'Charts and data', active: true },
];

function rule(over: Partial<RuleDraft> & { id: number }): RuleDraft {
  return { account_id: MINA, status: 'approved', scheduled_at: iso(NOW - MIN), reviewed_by: ADMIN, reviewed_at: iso(NOW - 60 * MIN), published_ref: null, ...over };
}
function ctx(over: Partial<PublishContext> = {}): PublishContext {
  return { now: NOW, publishedToday: 0, lastAccountId: null, isAdmin, activeAccountIds: new Set([MINA, JAE, SOL]), ...over };
}

describe('publisher rules', () => {
  it('reviewed only: a draft without a reviewer, or reviewed by a non admin, is never picked', () => {
    expect(ineligible(rule({ id: 1, reviewed_by: null }), ctx())).toBe('not_reviewed');
    expect(ineligible(rule({ id: 1, reviewed_at: null }), ctx())).toBe('not_reviewed');
    expect(ineligible(rule({ id: 1, reviewed_by: FAN }), ctx())).toBe('reviewer_not_admin');
    expect(planPublish([rule({ id: 1, reviewed_by: FAN }), rule({ id: 2, reviewed_by: null })], ctx()).pick).toBeNull();
    expect(planPublish([rule({ id: 1 })], ctx()).pick?.id).toBe(1);
  });

  it('status: only an approved draft', () => {
    for (const status of ['draft', 'rejected', 'published'] as DraftStatus[]) {
      expect(ineligible(rule({ id: 1, status }), ctx())).toBe('not_approved');
    }
  });

  it('time: nothing before its scheduled_at, due at the exact instant, no date = never', () => {
    expect(ineligible(rule({ id: 1, scheduled_at: iso(NOW + 1) }), ctx())).toBe('not_due');
    expect(ineligible(rule({ id: 1, scheduled_at: iso(NOW) }), ctx())).toBeNull();
    expect(ineligible(rule({ id: 1, scheduled_at: null }), ctx())).toBe('not_due');
    expect(ineligible(rule({ id: 1, scheduled_at: 'not a date' }), ctx())).toBe('not_due');
  });

  it('3 a day: the fourth item of a UTC day waits', () => {
    expect(MAX_PER_DAY).toBe(3);
    expect(planPublish([rule({ id: 1 })], ctx({ publishedToday: 2 })).pick?.id).toBe(1);
    const capped = planPublish([rule({ id: 1 })], ctx({ publishedToday: 3 }));
    expect(capped.pick).toBeNull();
    expect(capped.reason).toBe('daily_cap');
    expect(planPublish([rule({ id: 1 })], ctx({ publishedToday: 7 })).reason).toBe('daily_cap');
  });

  it('the day is the UTC day', () => {
    expect(utcDayBounds(Date.parse('2026-10-02T23:59:59Z'))).toEqual({ start: '2026-10-02T00:00:00.000Z', end: '2026-10-03T00:00:00.000Z' });
    expect(utcDayBounds(Date.parse('2026-10-03T00:00:00Z')).start).toBe('2026-10-03T00:00:00.000Z');
  });

  it('never two in a row from one account: the next due draft of another account goes first', () => {
    const drafts = [rule({ id: 1, account_id: MINA, scheduled_at: iso(NOW - 30 * MIN) }), rule({ id: 2, account_id: JAE, scheduled_at: iso(NOW - 10 * MIN) })];
    expect(planPublish(drafts, ctx({ lastAccountId: MINA })).pick?.id).toBe(2);
    expect(planPublish(drafts, ctx({ lastAccountId: JAE })).pick?.id).toBe(1);
    expect(planPublish(drafts, ctx({ lastAccountId: null })).pick?.id).toBe(1);
  });

  it('never two in a row: with only the last account due, nothing is published', () => {
    const plan = planPublish([rule({ id: 1, account_id: MINA }), rule({ id: 2, account_id: MINA })], ctx({ lastAccountId: MINA }));
    expect(plan.pick).toBeNull();
    expect(plan.reason).toBe('same_account_as_last');
    expect(plan.skipped.map((s) => s.reason)).toEqual(['same_account_as_last', 'same_account_as_last']);
  });

  it('oldest due first, ties by id; a retired account and a claimed draft are skipped', () => {
    const drafts = [rule({ id: 9, scheduled_at: iso(NOW - MIN) }), rule({ id: 4, scheduled_at: iso(NOW - 5 * MIN) }), rule({ id: 3, scheduled_at: iso(NOW - 5 * MIN) })];
    expect(planPublish(drafts, ctx()).pick?.id).toBe(3);
    expect(ineligible(rule({ id: 1, account_id: JAE }), ctx({ activeAccountIds: new Set([MINA]) }))).toBe('account_inactive');
    expect(ineligible(rule({ id: 1, published_ref: 'claim:x' }), ctx())).toBe('claimed');
    expect(planPublish([], ctx()).reason).toBe('nothing_due');
  });
});

describe('draft checks', () => {
  const ok = { account_id: MINA, kind: 'thread', title: 'Which b-side deserves a comeback stage?', body: 'One b-side from any group.', sources: [] };

  it('accepts a thread, a debate and a blog; trims and normalises', () => {
    const t = checkDraftInput({ ...ok, title: `  ${ok.title}  `, account_id: MINA.toUpperCase() });
    expect(t).toEqual({ ok: true, value: { account_id: MINA, kind: 'thread', group_id: null, title: ok.title, body: ok.body, options: null, sources: [], debate_days: null } });
    const d = checkDraftInput({ ...ok, kind: 'debate', body: '', options: ['Hype Boy', ' Magnetic ', ''], debate_days: 7, group_id: '12' });
    expect(d.ok && d.value).toMatchObject({ kind: 'debate', options: ['Hype Boy', 'Magnetic'], debate_days: 7, group_id: 12, body: '' });
    expect(checkDraftInput({ ...ok, kind: 'debate', options: ['a', 'b'] })).toMatchObject({ ok: true, value: { debate_days: 3 } });
    expect(checkDraftInput({ ...ok, kind: 'blog', sources: [{ label: 'Circle Chart, week 39', url: 'https://circlechart.kr/' }] }).ok).toBe(true);
  });

  it('refuses what the constraints would refuse', () => {
    const err = (b: unknown): string | null => { const r = checkDraftInput(b); return r.ok ? null : r.error; };
    expect(err({ ...ok, account_id: 'mina' })).toBe('bad_account');
    expect(err({ ...ok, kind: 'challenge' })).toBe('bad_kind');
    expect(err({ ...ok, title: 'abc' })).toBe('bad_title');
    expect(err({ ...ok, title: 'x'.repeat(161) })).toBe('bad_title');
    expect(err({ ...ok, body: '   ' })).toBe('empty_body');
    expect(err({ ...ok, body: 'x'.repeat(20001) })).toBe('too_long');
    expect(err({ ...ok, kind: 'debate', options: ['a', 'b'], body: 'x'.repeat(2001) })).toBe('too_long');
    expect(err({ ...ok, group_id: -1 })).toBe('bad_group');
    expect(err({ ...ok, kind: 'debate', options: ['only one'] })).toBe('bad_options');
    expect(err({ ...ok, kind: 'debate', options: ['a', 'A'] })).toBe('bad_options');
    expect(err({ ...ok, kind: 'debate', options: ['a', 'b', 'c', 'd', 'e'] })).toBe('bad_options');
    expect(err({ ...ok, kind: 'debate', options: ['a', 'b'], debate_days: 2 })).toBe('bad_days');
    expect(err({ ...ok, sources: [{ label: 'x', url: 'javascript:alert(1)' }] })).toBe('bad_sources');
    expect(err({ ...ok, sources: [{ label: '', url: 'https://a.b' }] })).toBe('bad_sources');
    expect(err({ ...ok, sources: 'nope' })).toBe('bad_sources');
  });

  it('sources: only http(s) links, empty rows dropped', () => {
    expect(safeUrl('https://kpopquiz.org/q/x')).toBe('https://kpopquiz.org/q/x');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.example', 'https://a b', 'https://a"onmouseover="x', '']) expect(safeUrl(bad)).toBeNull();
    expect(cleanSources([{ label: ' KpopQuiz plays ', url: '' }, { label: '', url: '' }, { label: 'x', url: null }])).toEqual([{ label: 'KpopQuiz plays', url: null }, { label: 'x', url: null }]);
  });

  it('a schedule is any real instant', () => {
    expect(checkSchedule('2026-10-03T08:00:00.000Z')).toEqual({ ok: true, value: '2026-10-03T08:00:00.000Z' });
    expect(checkSchedule('')).toEqual({ ok: false, error: 'bad_date' });
    expect(checkSchedule('tomorrow')).toEqual({ ok: false, error: 'bad_date' });
    expect(checkSchedule(undefined)).toEqual({ ok: false, error: 'bad_date' });
  });

  it('a blog and a data draft need a source before approval', () => {
    expect(approvalBlocker({ kind: 'blog', sources: [], status: 'draft', template_key: null })).toBe('blog_needs_sources');
    expect(approvalBlocker({ kind: 'blog', sources: [{ label: 'x', url: null }], status: 'draft', template_key: null })).toBeNull();
    expect(approvalBlocker({ kind: 'thread', sources: [], status: 'draft', template_key: 'weekly_recap:2026-09-28' })).toBe('template_needs_sources');
    expect(approvalBlocker({ kind: 'thread', sources: [], status: 'draft', template_key: null })).toBeNull();
    expect(approvalBlocker({ kind: 'thread', sources: [], status: 'published', template_key: null })).toBe('already_published');
  });
});

/* ------------------------------------------------------------------------- */
/* In-memory EditorialStore: every write is recorded and answered locally.    */
/* ------------------------------------------------------------------------- */

interface Memory extends EditorialStore {
  drafts: EditorialDraft[];
  debates: (DebateWrite & { id: number })[];
  posts: (PostWrite & { id: number })[];
  failNextWrite: boolean;
  clock: number;
}

function memoryStore(accounts: EditorialAccount[] = ACCOUNTS): Memory {
  const m: Memory = {
    drafts: [], debates: [], posts: [], failNextWrite: false, clock: NOW,
    async accounts() { return accounts; },
    async listDrafts(limit) { return [...m.drafts].reverse().slice(0, limit); },
    async getDraft(id) { return m.drafts.find((d) => d.id === id) ?? null; },
    async insertDraft(row) {
      if (row.template_key && m.drafts.some((d) => d.template_key === row.template_key)) return null;
      const d: EditorialDraft = {
        id: m.drafts.length + 1, account_id: row.account_id, kind: row.kind, group_id: row.group_id, title: row.title, body: row.body,
        options: row.options, sources: row.sources, scheduled_at: null, status: 'draft', created_by: row.created_by, reviewed_by: null,
        reviewed_at: null, published_ref: null, debate_days: row.debate_days, template_key: row.template_key, published_at: null,
        created_at: iso(m.clock), updated_at: iso(m.clock),
      };
      m.drafts.push(d);
      return d;
    },
    async updateDraft(id, patch: DraftPatch, when) {
      const d = m.drafts.find((x) => x.id === id);
      if (!d || !when.status.includes(d.status)) return null;
      if (when.unclaimed && d.published_ref !== null) return null;
      // The table's own CHECKs (v12-g9-editorial.sql), so the test fails where the database would.
      const next = { ...d, ...patch };
      if ((next.status === 'approved' || next.status === 'published') && (!next.reviewed_by || !next.reviewed_at)) throw new Error('editorial_drafts_reviewed_chk');
      if (next.status === 'approved' && !next.scheduled_at) throw new Error('editorial_drafts_schedule_chk');
      if (next.status === 'published' && (!next.published_ref || !next.published_at)) throw new Error('editorial_drafts_published_chk');
      Object.assign(d, next);
      return d;
    },
    async approvedDue(nowIso) { return m.drafts.filter((d) => d.status === 'approved' && !!d.scheduled_at && d.scheduled_at <= nowIso); },
    async publishedCount(start, end) { return m.drafts.filter((d) => d.status === 'published' && !!d.published_at && d.published_at >= start && d.published_at < end).length; },
    async lastPublishedAccount() {
      const done = m.drafts.filter((d) => d.status === 'published').sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '') || b.id - a.id);
      return done[0]?.account_id ?? null;
    },
    async insertDebate(row) {
      if (m.failNextWrite) { m.failNextWrite = false; throw new Error('stubbed failure'); }
      m.debates.push({ ...row, id: 500 + m.debates.length });
      return 500 + m.debates.length - 1;
    },
    async insertPost(row) {
      if (m.failNextWrite) { m.failNextWrite = false; throw new Error('stubbed failure'); }
      if (m.posts.some((p) => p.draft_id === row.draft_id)) throw new Error('editorial_posts_draft_id_key');
      m.posts.push({ ...row, id: 900 + m.posts.length });
      return 900 + m.posts.length - 1;
    },
  };
  return m;
}

const thread = (account: string, title: string): DraftInput => ({ account_id: account, kind: 'thread', group_id: null, title, body: 'One b-side from any group that never got a music show stage.\n\nSay why in one line.', options: null, sources: [], debate_days: null });
const run = (m: Memory, now: number, id = 'run'): ReturnType<typeof runPublisher> => runPublisher(m, { now, isAdmin, runId: id });

describe('pipeline: from the queue to a published post (writes stubbed)', () => {
  it('a thread: draft, approve with a date, not before its time, then published once, marked editorial', async () => {
    const m = memoryStore();
    const created = await createDraft(m, thread(MINA, 'Which b-side deserves a comeback stage?'), { adminId: ADMIN });
    expect(created.ok && created.value.status).toBe('draft');
    const id = created.ok ? created.value.id : 0;

    // In the queue, not approved: the publisher does nothing.
    expect(await run(m, NOW)).toMatchObject({ published: null, reason: 'nothing_due' });
    expect(m.posts).toHaveLength(0);

    const at = iso(NOW + 30 * MIN);
    const approved = await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: at, now: NOW });
    expect(approved.ok && approved.value).toMatchObject({ status: 'approved', reviewed_by: ADMIN, scheduled_at: at });

    // Approved but not due yet.
    expect(await run(m, NOW + 15 * MIN)).toMatchObject({ published: null, reason: 'nothing_due' });
    expect(m.posts).toHaveLength(0);

    // Due: published through the editorial store, by the editorial account.
    const done = await run(m, NOW + 30 * MIN);
    expect(done).toMatchObject({ reason: 'ok', published: { id, ref: 'post:900', kind: 'thread', account_id: MINA } });
    expect(m.posts).toEqual([{ id: 900, draft_id: id, kind: 'thread', group_id: null, author: MINA, title: 'Which b-side deserves a comeback stage?', body: thread(MINA, '').body, sources: [] }]);
    expect(m.debates).toHaveLength(0);
    const row = await m.getDraft(id);
    expect(row).toMatchObject({ status: 'published', published_ref: 'post:900', published_at: iso(NOW + 30 * MIN), reviewed_by: ADMIN });
    expect(publishedHref('thread', row?.published_ref ?? null)).toBe('/community/thread/e900');

    // The next run publishes nothing more (no double post).
    expect(await run(m, NOW + 45 * MIN)).toMatchObject({ published: null, reason: 'nothing_due' });
    expect(m.posts).toHaveLength(1);
  });

  it('a debate goes through the fan-debate write with its options and closing date', async () => {
    const m = memoryStore();
    const c = await createDraft(m, { account_id: JAE, kind: 'debate', group_id: 7, title: 'Better debut song?', body: '', options: ['Hype Boy', 'Magnetic'], sources: [], debate_days: 7 }, { adminId: ADMIN });
    const id = c.ok ? c.value.id : 0;
    await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    expect(await run(m, NOW)).toMatchObject({ reason: 'ok', published: { ref: 'debate:500', kind: 'debate' } });
    expect(m.debates).toEqual([{ id: 500, group_id: 7, author: JAE, question: 'Better debut song?', body: null, options: ['Hype Boy', 'Magnetic'], closes_at: iso(NOW + 7 * 86_400_000) }]);
    expect(m.posts).toHaveLength(0);
    expect(publishedHref('debate', 'debate:500')).toBe('/community/debate/500');
    expect(publishedHref('blog', 'post:12')).toBe('/community/blog/e12');
    expect(publishedHref('thread', 'claim:abc')).toBeNull();
  });

  it('nothing publishes without an admin review', async () => {
    const m = memoryStore();
    const c = await createDraft(m, thread(MINA, 'A thread nobody reviewed yet'), { adminId: null });
    const id = c.ok ? c.value.id : 0;
    // A non admin cannot approve or reject.
    expect(await approveDraft(m, id, { adminId: FAN, isAdmin, scheduledAt: iso(NOW), now: NOW })).toMatchObject({ ok: false, error: 'forbidden', status: 403 });
    expect(await rejectDraft(m, id, { adminId: FAN, isAdmin, now: NOW })).toMatchObject({ ok: false, error: 'forbidden' });
    expect((await m.getDraft(id))?.status).toBe('draft');
    // Even a row forced to "approved" with a non admin reviewer is skipped by the publisher.
    Object.assign(m.drafts[0]!, { status: 'approved', reviewed_by: FAN, reviewed_at: iso(NOW), scheduled_at: iso(NOW) });
    const r = await run(m, NOW + MIN);
    expect(r.published).toBeNull();
    expect(r.skipped).toEqual([{ id, reason: 'reviewer_not_admin' }]);
    expect(m.posts).toHaveLength(0);
    // And the store refuses an approved row with no reviewer at all (the table's CHECK).
    await expect(m.updateDraft(id, { reviewed_by: null }, { status: ['approved'] })).rejects.toThrow('reviewed_chk');
  });

  it('3 a day and never two in a row, over a full day of runs', async () => {
    const m = memoryStore();
    // Six approved drafts, all due at once: Mina x3 first, then Jae, Sol, Jae.
    const order = [MINA, MINA, MINA, JAE, SOL, JAE];
    for (const [i, acc] of order.entries()) {
      const c = await createDraft(m, thread(acc, `Editorial thread number ${i + 1}`), { adminId: ADMIN });
      if (c.ok) await approveDraft(m, c.value.id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW + i * 1000), now: NOW });
    }
    const day1 = Date.parse('2026-10-02T13:00:00Z');
    const published: string[] = [];
    for (let i = 0; i < 40; i++) { // a run every 15 minutes until the end of the UTC day
      const r = await run(m, day1 + i * 15 * MIN, `r${i}`);
      if (r.published) published.push(r.published.account_id);
    }
    // Mina, then NOT Mina again (Jae), then Mina: three items and the day is full.
    expect(published).toEqual([MINA, JAE, MINA]);
    expect(await run(m, Date.parse('2026-10-02T23:59:00Z'))).toMatchObject({ published: null, reason: 'daily_cap' });

    // Next UTC day: the cap is fresh, the rotation continues.
    const day2 = Date.parse('2026-10-03T00:00:00Z');
    const next: string[] = [];
    for (let i = 0; i < 96; i++) {
      const r = await run(m, day2 + i * 15 * MIN, `s${i}`);
      if (r.published) next.push(r.published.account_id);
    }
    // Left: Mina (3), Sol (5), Jae (6). The last item was Mina's, so Sol goes first.
    expect(next).toEqual([SOL, MINA, JAE]);
    const all = [...published, ...next];
    for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    expect(m.posts).toHaveLength(6);
    expect(new Set(m.posts.map((p) => p.draft_id)).size).toBe(6);
    expect(m.drafts.every((d) => d.status === 'published' && d.reviewed_by === ADMIN)).toBe(true);
  });

  it('with only the last account left, the publisher waits', async () => {
    const m = memoryStore();
    for (const t of ['First thread by Mina today', 'Second thread by Mina today']) {
      const c = await createDraft(m, thread(MINA, t), { adminId: ADMIN });
      if (c.ok) await approveDraft(m, c.value.id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    }
    expect((await run(m, NOW)).published?.id).toBe(1);
    expect(await run(m, NOW + 15 * MIN)).toMatchObject({ published: null, reason: 'same_account_as_last' });
    expect(m.posts).toHaveLength(1);
  });

  it('an edit after approval sends the draft back to review; a reject takes it out', async () => {
    const m = memoryStore();
    const c = await createDraft(m, thread(MINA, 'A thread that gets edited later'), { adminId: ADMIN });
    const id = c.ok ? c.value.id : 0;
    await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    const edited = await editDraft(m, id, thread(MINA, 'A thread that was edited after approval'));
    expect(edited.ok && edited.value).toMatchObject({ status: 'draft', reviewed_by: null, reviewed_at: null, scheduled_at: null });
    expect((await run(m, NOW + MIN)).published).toBeNull();
    await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    expect(await rejectDraft(m, id, { adminId: ADMIN, isAdmin, now: NOW })).toMatchObject({ ok: true, value: { status: 'rejected' } });
    expect((await run(m, NOW + MIN)).published).toBeNull();
    expect(m.posts).toHaveLength(0);
  });

  it('a published draft can no longer be edited, approved or rejected', async () => {
    const m = memoryStore();
    const c = await createDraft(m, thread(MINA, 'A thread that is already live'), { adminId: ADMIN });
    const id = c.ok ? c.value.id : 0;
    await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    await run(m, NOW);
    expect(await editDraft(m, id, thread(MINA, 'A changed title after publication'))).toMatchObject({ ok: false, error: 'not_editable' });
    expect(await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW })).toMatchObject({ ok: false, error: 'already_published' });
    expect(await rejectDraft(m, id, { adminId: ADMIN, isAdmin, now: NOW })).toMatchObject({ ok: false, error: 'not_editable' });
    expect(m.posts[0]?.title).toBe('A thread that is already live');
  });

  it('a failed write publishes nothing and gives the draft back; a claimed draft is not taken twice', async () => {
    const m = memoryStore();
    const c = await createDraft(m, thread(MINA, 'A thread whose first write fails'), { adminId: ADMIN });
    const id = c.ok ? c.value.id : 0;
    await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW });
    m.failNextWrite = true;
    expect(await run(m, NOW)).toMatchObject({ published: null, reason: 'write_failed' });
    expect(await m.getDraft(id)).toMatchObject({ status: 'approved', published_ref: null });
    // Held by another run: skipped.
    m.drafts[0]!.published_ref = 'claim:other';
    expect(await run(m, NOW + MIN)).toMatchObject({ published: null, reason: 'nothing_due', skipped: [{ id, reason: 'claimed' }] });
    m.drafts[0]!.published_ref = null;
    expect((await run(m, NOW + 2 * MIN)).published?.id).toBe(id);
    expect(m.posts).toHaveLength(1);
  });

  it('a draft needs an active editorial account; a blog needs a source; one draft per template key', async () => {
    const m = memoryStore([...ACCOUNTS.slice(0, 2), { ...ACCOUNTS[2]!, active: false }]);
    expect(await createDraft(m, thread(FAN, 'A thread by somebody who is a fan'), { adminId: ADMIN })).toMatchObject({ ok: false, error: 'bad_account' });
    expect(await createDraft(m, thread(SOL, 'A thread by a retired team account'), { adminId: ADMIN })).toMatchObject({ ok: false, error: 'bad_account' });
    const blog = await createDraft(m, { ...thread(MINA, 'A blog without any source yet'), kind: 'blog' }, { adminId: ADMIN });
    const id = blog.ok ? blog.value.id : 0;
    expect(await approveDraft(m, id, { adminId: ADMIN, isAdmin, scheduledAt: iso(NOW), now: NOW })).toMatchObject({ ok: false, error: 'blog_needs_sources', status: 422 });
    expect((await createDraft(m, thread(MINA, 'The weekly recap of this week'), { adminId: null, templateKey: 'weekly_recap:2026-09-28' })).ok).toBe(true);
    expect(await createDraft(m, thread(MINA, 'The weekly recap of this week'), { adminId: null, templateKey: 'weekly_recap:2026-09-28' })).toMatchObject({ ok: false, error: 'duplicate', status: 409 });
  });
});

describe('templates from real data', () => {
  const week = { from: '2026-09-22', to: '2026-09-28' };

  it('weekly recap: every line comes from a row and has its source', () => {
    const t = buildWeeklyRecap({
      ...week,
      hardestSong: { title: 'Chk Chk Boom', artist: 'Stray Kids', answers: 240, correct: 60 },
      topQuiz: { title: 'BTS era check', slug: 'bts-era-check', plays: 1204, perfect: 31 },
      splits: [{ question: 'Better debut song', a: 'Hype Boy', b: 'Magnetic', votesA: 620, votesB: 380 }],
    }, ACCOUNTS);
    expect(t?.templateKey).toBe('weekly_recap:2026-09-28');
    expect(t?.input.account_id).toBe(SOL); // the data beat
    expect(t?.input.kind).toBe('thread');
    expect(t?.input.title).toBe('Weekly recap: the hardest song was Chk Chk Boom');
    expect(t?.input.body.split('\n\n')).toEqual([
      'The hardest song in the blindtest this week was Chk Chk Boom by Stray Kids. Fans named it 25% of the time (60 of 240 answers).',
      'The most played quiz was BTS era check: 1,204 plays and 31 perfect scores.',
      'This or that, Better debut song: Hype Boy 62%, Magnetic 38% (1,000 votes).',
      'Which one surprised you? Tell us in one line.',
    ]);
    expect(t?.input.sources).toEqual([
      { label: 'KpopQuiz blindtest runs, Sep 22 to Sep 28, 2026: 240 answers on Chk Chk Boom', url: null },
      { label: 'KpopQuiz plays, Sep 22 to Sep 28, 2026: BTS era check', url: 'https://kpopquiz.org/q/bts-era-check' },
      { label: 'KpopQuiz This or that votes, Sep 22 to Sep 28, 2026: Better debut song', url: null },
    ]);
    expect(approvalBlocker({ kind: 'thread', sources: t?.input.sources ?? [], status: 'draft', template_key: t?.templateKey ?? null })).toBeNull();
    expect(checkDraftInput(t?.input).ok).toBe(true);
  });

  it('weekly recap: a missing fact is left out, and no fact means no draft', () => {
    const onlyQuiz = buildWeeklyRecap({ ...week, hardestSong: null, topQuiz: { title: 'BTS era check', slug: 'bts-era-check', plays: 1, perfect: 0 }, splits: [] }, ACCOUNTS);
    expect(onlyQuiz?.input.title).toBe('Weekly recap: the most played quiz was BTS era check');
    expect(onlyQuiz?.input.body).toBe('The most played quiz was BTS era check: 1 play.\n\nWhich one surprised you? Tell us in one line.');
    expect(onlyQuiz?.input.sources).toHaveLength(1);
    // Too few answers to call a song hard: left out.
    expect(buildWeeklyRecap({ ...week, hardestSong: { title: 'X', artist: null, answers: 19, correct: 0 }, topQuiz: null, splits: [] }, ACCOUNTS)).toBeNull();
    expect(buildWeeklyRecap({ ...week, hardestSong: null, topQuiz: null, splits: [{ question: 'q', a: 'a', b: 'b', votesA: 0, votesB: 0 }] }, ACCOUNTS)).toBeNull();
    expect(buildWeeklyRecap({ ...week, hardestSong: null, topQuiz: null, splits: [] }, ACCOUNTS)).toBeNull();
    // No active account: no draft.
    expect(buildWeeklyRecap({ ...week, hardestSong: null, topQuiz: { title: 'BTS era check', slug: 's', plays: 5, perfect: 0 }, splits: [] }, [])).toBeNull();
  });

  it('comeback topic: from the release calendar row, never by the data account', () => {
    const t = buildComebackTopic({ id: 412, group_id: 3, artist: 'aespa', title: 'Rich Man', release_date: '2026-10-09', kind: 'ep' }, ACCOUNTS);
    expect(t).toEqual({
      templateKey: 'comeback:412',
      input: {
        account_id: MINA, kind: 'thread', group_id: 3, title: 'aespa comes back with Rich Man: what do you expect?',
        body: 'aespa releases Rich Man (EP) on Oct 9, 2026.\n\nWhat do you want from this comeback? One line.',
        options: null, sources: [{ label: 'KpopQuiz release calendar: aespa, Rich Man, Oct 9, 2026', url: null }], debate_days: null,
      },
    });
    expect(buildComebackTopic({ id: 413, group_id: null, artist: 'ATEEZ', title: 'x', release_date: '2026-10-09', kind: 'album' }, ACCOUNTS)?.input.account_id).toBe(JAE);
    expect(buildComebackTopic({ id: 1, group_id: null, artist: ' ', title: 'x', release_date: '2026-10-09', kind: 'ep' }, ACCOUNTS)).toBeNull();
    expect(buildComebackTopic({ id: 1, group_id: null, artist: 'a', title: 'x', release_date: 'soon', kind: 'ep' }, ACCOUNTS)).toBeNull();
    expect(buildComebackTopic({ id: 1, group_id: null, artist: 'a', title: 'x'.repeat(160), release_date: '2026-10-09', kind: 'ep' }, ACCOUNTS)).toBeNull();
  });

  it('helpers', () => {
    expect(dayLabel('2026-09-28')).toBe('Sep 28');
    expect(dayLabel('2026-01-05', true)).toBe('Jan 5, 2026');
    expect(pickAccount(ACCOUNTS, /chart/i, 0)?.user_id).toBe(SOL);
    expect(pickAccount(ACCOUNTS, null, 4)?.user_id).toBe(JAE);
    expect(pickAccount(ACCOUNTS.map((a) => ({ ...a, active: false })), null, 0)).toBeNull();
  });

  it('no em or en dash in anything a template writes', () => {
    const t = buildWeeklyRecap({ ...week, hardestSong: { title: 'A', artist: 'B', answers: 30, correct: 3 }, topQuiz: { title: 'C', slug: 'c', plays: 9, perfect: 1 }, splits: [{ question: 'q', a: 'x', b: 'y', votesA: 2, votesB: 1 }] }, ACCOUNTS);
    const c = buildComebackTopic({ id: 1, group_id: null, artist: 'a', title: 'b', release_date: '2026-10-09', kind: 'mv' }, ACCOUNTS);
    expect(JSON.stringify([t, c])).not.toMatch(/[–—]/);
  });
});

describe('preview: the post a draft becomes', () => {
  it('a thread is a team post with no level, no heart and closed replies', () => {
    const post = draftToPost(thread(MINA, 'Which b-side deserves a comeback stage?'), { account: ACCOUNTS[0]!, group: null, groupPhoto: null, at: NOW, now: NOW, ago: 'just now' });
    expect(post).toMatchObject({ kind: 'thread', title: 'Which b-side deserves a comeback stage?', likes: null, replyTo: null, commentCount: 0, ago: 'just now' });
    expect(post.author).toMatchObject({ name: 'Mina', isTeam: true, level: null, accent: null, bias: null, avatarUrl: null });
    expect(post.paragraphs).toEqual(['One b-side from any group that never got a music show stage.', 'Say why in one line.']);
  });

  it('a debate shows its options at zero votes and its closing date; a blog its reading time', () => {
    const d = draftToPost({ kind: 'debate', title: 'Better debut song?', body: '', options: ['Hype Boy', 'Magnetic'], sources: [], debate_days: 1 }, { account: ACCOUNTS[1]!, group: null, groupPhoto: null, at: NOW, now: NOW, ago: 'just now' });
    expect(d.debate).toEqual({ daily: false, open: true, closesAt: iso(NOW + 86_400_000), comments: 0, options: [{ label: 'Hype Boy', votes: 0 }, { label: 'Magnetic', votes: 0 }], total: 0 });
    const b = draftToPost({ kind: 'blog', title: 'Five b-sides worth a stage', body: 'word '.repeat(450), options: null, sources: [{ label: 's', url: null }], debate_days: null }, { account: ACCOUNTS[0]!, group: null, groupPhoto: '/idols/x.jpg', at: NOW, now: NOW, ago: 'just now' });
    expect(b.blog).toMatchObject({ coverUrl: '/idols/x.jpg', readingMin: 2 });
    expect(b.sources).toEqual([{ label: 's', url: null }]);
  });
});

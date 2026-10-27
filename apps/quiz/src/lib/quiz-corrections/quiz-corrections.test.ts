import { describe, expect, it } from 'vitest';

import { NOTIFICATION_CATEGORIES, NOTIFICATION_TYPES } from '@/lib/notification-types';
import { categoryOf, iconOf, matchesFilter, targetOf } from '@/lib/ux-v1/p11/notifications';

import {
  CORRECTION_DEADLINE_MS, CORRECTION_RUN_LIMIT, decide, deadlinePassed, draftNotice, editHref, firstNotice, markedAnswerOf,
  questionAt, sameText, stillMatches,
} from './rules';
import { runQuizCorrections } from './run';

import type { CorrectionNotice, CorrectionQuiz, CorrectionRequest, CorrectionStatus } from './rules';
import type { CorrectionStore, NoticeResult } from './run';

// The quiz corrections job: the pure rules (marked answer, match, 14-day deadline, decisions,
// notice text) and the run against an in-memory store (transitions, idempotence, the 50 cap,
// one bad row, the missing table).

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 27, 9, 30, 0); // 27 Oct 2026 09:30 UTC
const iso = (ms: number): string => new Date(ms).toISOString();

const MC = { question: 'How many members are in newjeans?', options: ['6', '8', '5', '4'], correct: 2 };
const TF = { question: 'Spring Day is a B-side.', options: [], correct: true };

function quiz(over: Partial<CorrectionQuiz> = {}): CorrectionQuiz {
  return {
    id: 'quiz-1', title: 'NEWJEANS quiz', slug: 'newjeans-quiz', status: 'published', creator_id: 'creator-1',
    questions: [{ question: 'Q0', options: ['a', 'b', 'c', 'd'], correct: 0 }, MC, TF], group_slug: 'newjeans', ...over,
  };
}

function request(over: Partial<CorrectionRequest> = {}): CorrectionRequest {
  return {
    id: 'req-1', quiz_id: 'quiz-1', q_index: 1, question: MC.question, marked_answer: '5',
    correction: 'NewJeans debuted with five members, and Wikipedia lists four current members since December 2025.',
    source_url: 'https://en.wikipedia.org/wiki/NewJeans', status: 'pending', notified_at: null, deadline_at: null, ...over,
  };
}

function notifiedAt(at: number, over: Partial<CorrectionRequest> = {}): CorrectionRequest {
  return request({ status: 'notified', notified_at: iso(at), deadline_at: iso(at + CORRECTION_DEADLINE_MS), ...over });
}

interface Row extends CorrectionRequest { resolved_at: string | null; drafted_at: string | null; created: number }

class FakeStore implements CorrectionStore {
  rows: Row[] = [];
  quizMap = new Map<string, CorrectionQuiz>();
  notices: CorrectionNotice[] = [];
  unpublished: string[] = [];
  quizWrites: string[] = [];
  missingTable = false;
  suppress = false;
  failInsertFor = new Set<string>();
  failMarkNotified = false;
  limits: number[] = [];

  constructor(reqs: CorrectionRequest[] = [], quizzes: CorrectionQuiz[] = [quiz()]) {
    reqs.forEach((r, i) => this.rows.push({ ...r, resolved_at: null, drafted_at: null, created: i }));
    for (const q of quizzes) this.quizMap.set(q.id, structuredClone(q));
  }

  row(id: string): Row { return this.rows.find((r) => r.id === id)!; }

  async openRequests(limit: number): Promise<CorrectionRequest[] | null> {
    this.limits.push(limit);
    if (this.missingTable) return null;
    const pending = this.rows.filter((r) => r.status === 'pending').sort((a, b) => a.created - b.created);
    const notified = this.rows.filter((r) => r.status === 'notified')
      .sort((a, b) => Date.parse(a.deadline_at ?? '') - Date.parse(b.deadline_at ?? ''));
    return [...pending, ...notified].slice(0, limit).map((r) => ({ ...r }));
  }

  async quizzes(ids: readonly string[]): Promise<Map<string, CorrectionQuiz>> {
    const out = new Map<string, CorrectionQuiz>();
    for (const id of ids) { const q = this.quizMap.get(id); if (q) out.set(id, structuredClone(q)); }
    return out;
  }

  async insertNotice(n: CorrectionNotice): Promise<NoticeResult> {
    if (this.failInsertFor.has(n.quiz_id)) throw new Error('boom');
    if (this.suppress) return 'suppressed';
    if (this.notices.some((x) => x.user_id === n.user_id && x.quiz_id === n.quiz_id && x.type === n.type && x.title === n.title)) return 'duplicate';
    this.notices.push(n);
    return 'inserted';
  }

  async markNotified(id: string, at: string, deadline: string): Promise<boolean> {
    if (this.failMarkNotified) throw new Error('write failed');
    const r = this.row(id);
    if (r.status !== 'pending') return false;
    Object.assign(r, { status: 'notified' as CorrectionStatus, notified_at: at, deadline_at: deadline });
    return true;
  }

  async close(id: string, status: 'resolved' | 'cancelled', at: string): Promise<boolean> {
    const r = this.row(id);
    if (r.status !== 'pending' && r.status !== 'notified') return false;
    Object.assign(r, { status, resolved_at: at });
    return true;
  }

  async draftQuiz(quizId: string): Promise<boolean> {
    const q = this.quizMap.get(quizId);
    if (!q || q.status !== 'published') return false;
    q.status = 'draft';
    this.quizWrites.push(quizId);
    return true;
  }

  async markDrafted(id: string, at: string): Promise<boolean> {
    const r = this.row(id);
    if (r.status !== 'notified') return false;
    Object.assign(r, { status: 'drafted' as CorrectionStatus, drafted_at: at });
    return true;
  }

  quizUnpublished(q: CorrectionQuiz): void { this.unpublished.push(q.slug); }
}

const quiet = { log: (): void => {} };

describe('quiz corrections: the marked answer', () => {
  it('multiple choice: the text of the option at the correct index', () => {
    expect(markedAnswerOf(MC)).toBe('5');
    expect(markedAnswerOf({ ...MC, correct: 3 })).toBe('4');
  });
  it('true or false: True or False from the boolean, options ignored', () => {
    expect(markedAnswerOf(TF)).toBe('True');
    expect(markedAnswerOf({ question: 'x', correct: false })).toBe('False');
    expect(markedAnswerOf({ question: 'x', options: ['True', 'False'], correct: false })).toBe('False');
  });
  it('intruder: the label of the option object', () => {
    expect(markedAnswerOf({ question: 'x', options: [{ label: 'A', image_url: null }, { label: 'B', image_url: null }], correct: 1 })).toBe('B');
  });
  it('no readable answer: null', () => {
    expect(markedAnswerOf(null)).toBeNull();
    expect(markedAnswerOf({ question: 'x', options: ['a'], correct: null })).toBeNull();
    expect(markedAnswerOf({ question: 'x', options: ['a'], correct: 4 })).toBeNull();
    expect(markedAnswerOf({ question: 'x', options: ['a'], correct: 0.5 })).toBeNull();
  });
  it('questionAt: in range only', () => {
    expect(questionAt(quiz().questions, 1)).toEqual({ question: MC.question, answer: '5' });
    expect(questionAt(quiz().questions, 3)).toBeNull();
    expect(questionAt(quiz().questions, -1)).toBeNull();
    expect(questionAt('not an array', 0)).toBeNull();
  });
});

describe('quiz corrections: does the question still match', () => {
  const mcReq = request();
  const tfReq = request({ q_index: 2, question: TF.question, marked_answer: 'True' });

  it('multiple choice: same question and same marked answer = match', () => {
    expect(stillMatches(mcReq, quiz().questions)).toBe(true);
  });
  it('multiple choice: spacing or capitals alone are not a fix', () => {
    const qs = quiz({ questions: [{}, { ...MC, question: '  How many members are in  NewJeans? ' }] }).questions;
    expect(stillMatches(mcReq, qs)).toBe(true);
    expect(sameText('Spring  Day', 'spring day')).toBe(true);
  });
  it('multiple choice: another marked answer = changed', () => {
    expect(stillMatches(mcReq, [{}, { ...MC, correct: 3 }])).toBe(false);
  });
  it('multiple choice: the marked option relabelled = changed', () => {
    expect(stillMatches(mcReq, [{}, { ...MC, options: ['6', '8', '5 (at debut)', '4'] }])).toBe(false);
  });
  it('multiple choice: a reworded question = changed', () => {
    expect(stillMatches(mcReq, [{}, { ...MC, question: 'How many members did NewJeans debut with?' }])).toBe(false);
  });
  it('true or false: same statement and same boolean = match', () => {
    expect(stillMatches(tfReq, quiz().questions)).toBe(true);
  });
  it('true or false: the answer flipped = changed', () => {
    expect(stillMatches(tfReq, [{}, MC, { ...TF, correct: false }])).toBe(false);
  });
  it('true or false: the statement rewritten = changed', () => {
    expect(stillMatches(tfReq, [{}, MC, { ...TF, question: 'Spring Day is a lead single.' }])).toBe(false);
  });
  it('the question deleted (index out of range) = changed', () => {
    expect(stillMatches(request({ q_index: 5 }), quiz().questions)).toBe(false);
    expect(stillMatches(mcReq, [{}])).toBe(false);
  });
});

describe('quiz corrections: the 14-day deadline', () => {
  it('passes at its exact instant, never a millisecond before', () => {
    const r = notifiedAt(T0);
    expect(deadlinePassed(r, T0 + 14 * DAY - 1)).toBe(false);
    expect(deadlinePassed(r, T0 + 14 * DAY)).toBe(true);
    expect(deadlinePassed(r, T0 + 15 * DAY)).toBe(true);
  });
  it('falls back to notified_at + 14 days, and never passes for a request never notified', () => {
    expect(deadlinePassed(request({ status: 'notified', notified_at: iso(T0), deadline_at: null }), T0 + 14 * DAY)).toBe(true);
    expect(deadlinePassed(request({ status: 'notified', notified_at: iso(T0), deadline_at: null }), T0 + 14 * DAY - 1)).toBe(false);
    expect(deadlinePassed(request(), T0 + 100 * DAY)).toBe(false);
  });
});

describe('quiz corrections: decisions', () => {
  it('pending and unchanged: notify', () => {
    expect(decide(request(), quiz(), T0)).toEqual({ kind: 'notify' });
  });
  it('pending but already changed: resolve without a notice', () => {
    expect(decide(request(), quiz({ questions: [{}, { ...MC, correct: 3 }] }), T0)).toEqual({ kind: 'resolve', reason: 'changed' });
  });
  it('pending on a quiz that is gone, removed or flagged, or has no creator: cancel', () => {
    expect(decide(request(), null, T0)).toEqual({ kind: 'cancel', reason: 'quiz_gone' });
    expect(decide(request(), quiz({ status: 'removed' }), T0)).toEqual({ kind: 'cancel', reason: 'quiz_not_live' });
    expect(decide(request(), quiz({ status: 'flagged' }), T0)).toEqual({ kind: 'cancel', reason: 'quiz_not_live' });
    expect(decide(request(), quiz({ creator_id: null }), T0)).toEqual({ kind: 'cancel', reason: 'no_creator' });
  });
  it('notified, unchanged, before the deadline: wait', () => {
    expect(decide(notifiedAt(T0), quiz(), T0 + 13 * DAY)).toEqual({ kind: 'wait' });
  });
  it('notified and fixed before the deadline: resolve', () => {
    expect(decide(notifiedAt(T0), quiz({ questions: [{}, { ...MC, correct: 3 }] }), T0 + 2 * DAY)).toEqual({ kind: 'resolve', reason: 'changed' });
  });
  it('notified, unchanged, deadline passed: draft (also when the quiz is already a draft)', () => {
    expect(decide(notifiedAt(T0), quiz(), T0 + 14 * DAY)).toEqual({ kind: 'draft' });
    expect(decide(notifiedAt(T0), quiz({ status: 'draft' }), T0 + 14 * DAY)).toEqual({ kind: 'draft' });
  });
  it('notified, deadline passed, quiz removed meanwhile: cancel; fixed: resolve', () => {
    expect(decide(notifiedAt(T0), quiz({ status: 'removed' }), T0 + 20 * DAY)).toEqual({ kind: 'cancel', reason: 'quiz_not_live' });
    expect(decide(notifiedAt(T0), quiz({ questions: [{}] }), T0 + 20 * DAY)).toEqual({ kind: 'resolve', reason: 'changed' });
  });
  it('closed requests are left alone', () => {
    for (const status of ['resolved', 'drafted', 'cancelled'] as const) expect(decide(request({ status }), quiz(), T0)).toEqual({ kind: 'wait' });
  });
});

describe('quiz corrections: the notices', () => {
  const q = { ...quiz(), creator_id: 'creator-1' };
  it('the first notice names the quiz, quotes the question and carries the correction, the source and the editor link', () => {
    const n = firstNotice(request(), q, T0 + CORRECTION_DEADLINE_MS);
    expect(n).toMatchObject({ user_id: 'creator-1', type: 'quiz_correction', quiz_id: 'quiz-1', link_url: '/quiz/quiz-1/edit', sources: ['https://en.wikipedia.org/wiki/NewJeans'] });
    expect(n.title).toBe('Please check question 2 of "NEWJEANS quiz"');
    expect(n.body).toContain('"How many members are in newjeans?"');
    expect(n.body).toContain('marks "5" as the answer');
    expect(n.body).toContain(request().correction);
    expect(n.body).toContain('by November 10, 2026');
    expect(n.body).toContain('Source: https://en.wikipedia.org/wiki/NewJeans');
  });
  it('the draft notice says how to bring the quiz back', () => {
    const n = draftNotice(request(), q);
    expect(n.title).toBe('"NEWJEANS quiz" is now a draft (question 2)');
    expect(n.body).toContain('moved to draft');
    expect(n.body).toContain('edit this question, then email hello@kpopquiz.org');
    expect(n.link_url).toBe(editHref('quiz-1'));
  });
  it('no em or en dash in any notice text', () => {
    for (const n of [firstNotice(request(), q, T0), draftNotice(request(), q)]) expect(`${n.title} ${n.body}`).not.toMatch(/[–—]/);
  });
});

describe('quiz corrections: the quiz_correction notification type', () => {
  it('is a live type, in no settings category (no toggle can silence it)', () => {
    expect(NOTIFICATION_TYPES).toContain('quiz_correction');
    expect(NOTIFICATION_CATEGORIES.flatMap((c) => c.types)).not.toContain('quiz_correction');
    expect(categoryOf('quiz_correction')).toBeNull();
  });
  it('shows under All and Your quizzes, with the pen icon, and opens the quiz editor', () => {
    expect(matchesFilter({ type: 'quiz_correction' }, 'all')).toBe(true);
    expect(matchesFilter({ type: 'quiz_correction' }, 'your_quizzes')).toBe(true);
    expect(matchesFilter({ type: 'quiz_correction' }, 'social')).toBe(false);
    expect(matchesFilter({ type: 'quiz_correction' }, 'achievements')).toBe(false);
    expect(iconOf('quiz_correction')).toBe('pen');
    expect(targetOf({ link_url: editHref('quiz-1'), quiz_slug: 'newjeans-quiz' })).toEqual({ href: '/quiz/quiz-1/edit', external: false });
  });
});

describe('quiz corrections: a run', () => {
  it('pending: one notice, status notified, notified_at now, deadline now + 14 days', async () => {
    const store = new FakeStore([request()]);
    const report = await runQuizCorrections(store, { now: T0, ...quiet });
    expect(report).toMatchObject({ live: true, read: 1, notified: 1, errors: 0 });
    expect(store.notices).toHaveLength(1);
    expect(store.notices[0]).toMatchObject({ type: 'quiz_correction', user_id: 'creator-1', sources: [request().source_url] });
    expect(store.row('req-1')).toMatchObject({ status: 'notified', notified_at: iso(T0), deadline_at: iso(T0 + 14 * DAY) });
    expect(store.quizWrites).toEqual([]);
  });

  it('the full path: notified, waits 14 days, then drafts the quiz once and sends the second notice', async () => {
    const store = new FakeStore([request()]);
    await runQuizCorrections(store, { now: T0, ...quiet });
    const day13 = await runQuizCorrections(store, { now: T0 + 13 * DAY, ...quiet });
    expect(day13).toMatchObject({ waiting: 1, drafted: 0 });
    expect(store.quizMap.get('quiz-1')!.status).toBe('published');
    const day14 = await runQuizCorrections(store, { now: T0 + 14 * DAY, ...quiet });
    expect(day14).toMatchObject({ drafted: 1, errors: 0 });
    expect(store.quizMap.get('quiz-1')!.status).toBe('draft');
    expect(store.quizWrites).toEqual(['quiz-1']);
    expect(store.unpublished).toEqual(['newjeans-quiz']);
    expect(store.row('req-1')).toMatchObject({ status: 'drafted', drafted_at: iso(T0 + 14 * DAY) });
    expect(store.notices.map((n) => n.title)).toEqual(['Please check question 2 of "NEWJEANS quiz"', '"NEWJEANS quiz" is now a draft (question 2)']);
    // nothing left to do
    const after = await runQuizCorrections(store, { now: T0 + 15 * DAY, ...quiet });
    expect(after.read).toBe(0);
    expect(store.notices).toHaveLength(2);
  });

  it('fixed before the deadline: resolved at the next run, the quiz untouched', async () => {
    const store = new FakeStore([notifiedAt(T0)]);
    store.quizMap.get('quiz-1')!.questions = [{}, { ...MC, correct: 3 }, TF];
    const report = await runQuizCorrections(store, { now: T0 + 3 * DAY, ...quiet });
    expect(report).toMatchObject({ resolved: 1, drafted: 0 });
    expect(store.row('req-1')).toMatchObject({ status: 'resolved', resolved_at: iso(T0 + 3 * DAY) });
    expect(store.quizWrites).toEqual([]);
    expect(store.notices).toEqual([]);
  });

  it('changed after the deadline (question deleted): resolved, the quiz untouched', async () => {
    const store = new FakeStore([notifiedAt(T0)]);
    store.quizMap.get('quiz-1')!.questions = [{}];
    const report = await runQuizCorrections(store, { now: T0 + 30 * DAY, ...quiet });
    expect(report).toMatchObject({ resolved: 1 });
    expect(store.quizWrites).toEqual([]);
  });

  it('true or false: unchanged at the deadline drafts, flipped resolves', async () => {
    const tf = notifiedAt(T0, { id: 'tf', q_index: 2, question: TF.question, marked_answer: 'True' });
    const a = new FakeStore([tf]);
    expect(await runQuizCorrections(a, { now: T0 + 14 * DAY, ...quiet })).toMatchObject({ drafted: 1 });
    const b = new FakeStore([tf]);
    b.quizMap.get('quiz-1')!.questions = [{}, MC, { ...TF, correct: false }];
    expect(await runQuizCorrections(b, { now: T0 + 14 * DAY, ...quiet })).toMatchObject({ resolved: 1, drafted: 0 });
  });

  it('two requests on one quiz: the quiz is drafted once, each request gets its notice', async () => {
    const store = new FakeStore([notifiedAt(T0), notifiedAt(T0, { id: 'req-2', q_index: 2, question: TF.question, marked_answer: 'True' })]);
    const report = await runQuizCorrections(store, { now: T0 + 14 * DAY, ...quiet });
    expect(report).toMatchObject({ drafted: 2, errors: 0 });
    expect(store.quizWrites).toEqual(['quiz-1']);
    expect(store.unpublished).toHaveLength(1);
    expect(store.notices.map((n) => n.title)).toEqual(['"NEWJEANS quiz" is now a draft (question 2)', '"NEWJEANS quiz" is now a draft (question 3)']);
  });

  it('a quiz removed before the deadline ends: cancelled, no notice, no quiz write', async () => {
    const store = new FakeStore([notifiedAt(T0)], [quiz({ status: 'removed' })]);
    expect(await runQuizCorrections(store, { now: T0 + 14 * DAY, ...quiet })).toMatchObject({ cancelled: 1 });
    expect(store.quizWrites).toEqual([]);
    expect(store.notices).toEqual([]);
  });

  it('idempotent: a run that stopped after the notice finishes next time without a second notice', async () => {
    const store = new FakeStore([request()]);
    store.failMarkNotified = true;
    const first = await runQuizCorrections(store, { now: T0, ...quiet });
    expect(first).toMatchObject({ errors: 1, notified: 0 });
    expect(store.row('req-1').status).toBe('pending');
    store.failMarkNotified = false;
    const second = await runQuizCorrections(store, { now: T0 + 60_000, ...quiet });
    expect(second).toMatchObject({ notified: 1 });
    expect(second.outcomes[0]!.detail).toBe('duplicate');
    expect(store.notices).toHaveLength(1);
    expect(store.row('req-1').status).toBe('notified');
  });

  it('idempotent: running twice on the same day changes nothing the second time', async () => {
    const store = new FakeStore([request()]);
    await runQuizCorrections(store, { now: T0, ...quiet });
    const again = await runQuizCorrections(store, { now: T0 + 1000, ...quiet });
    expect(again).toMatchObject({ waiting: 1, notified: 0 });
    expect(store.notices).toHaveLength(1);
  });

  it('a notice dropped by the preference trigger leaves the request pending (no clock starts)', async () => {
    const store = new FakeStore([request()]);
    store.suppress = true;
    const report = await runQuizCorrections(store, { now: T0, ...quiet });
    expect(report).toMatchObject({ skipped: 1, notified: 0 });
    expect(store.row('req-1').status).toBe('pending');
  });

  it('never throws on one bad row: the others still run and the error is logged', async () => {
    const lines: string[] = [];
    const store = new FakeStore(
      [request({ id: 'bad', quiz_id: 'quiz-bad' }), request({ id: 'good' })],
      [quiz(), quiz({ id: 'quiz-bad', slug: 'bad' })],
    );
    store.failInsertFor.add('quiz-bad');
    const report = await runQuizCorrections(store, { now: T0, log: (l) => lines.push(l) });
    expect(report).toMatchObject({ errors: 1, notified: 1 });
    expect(store.row('bad').status).toBe('pending');
    expect(store.row('good').status).toBe('notified');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('request bad');
  });

  it(`handles at most ${CORRECTION_RUN_LIMIT} requests a run, the rest on the next run`, async () => {
    const reqs = Array.from({ length: 60 }, (_, i) => request({ id: `r${i}`, quiz_id: `quiz-${i}`, q_index: 0 }));
    const store = new FakeStore(reqs, reqs.map((r) => quiz({ id: r.quiz_id, slug: `slug-${r.quiz_id}`, questions: [MC] })));
    const first = await runQuizCorrections(store, { now: T0, ...quiet });
    expect(store.limits).toEqual([50]);
    expect(first.read).toBe(50);
    expect(store.notices).toHaveLength(50);
    expect(store.rows.filter((r) => r.status === 'notified')).toHaveLength(50);
    expect(store.rows.filter((r) => r.status === 'pending')).toHaveLength(10);
    const second = await runQuizCorrections(store, { now: T0 + DAY, limit: 500, ...quiet });
    expect(store.limits).toEqual([50, 50]);
    expect(second.read).toBe(50);
    expect(store.rows.filter((r) => r.status === 'pending')).toHaveLength(0);
  });

  it('the requests table does not exist yet: live false, nothing read or written', async () => {
    const store = new FakeStore([request()]);
    store.missingTable = true;
    const report = await runQuizCorrections(store, { now: T0, ...quiet });
    expect(report).toMatchObject({ live: false, read: 0, notified: 0, errors: 0 });
    expect(store.notices).toEqual([]);
    expect(store.quizWrites).toEqual([]);
  });
});

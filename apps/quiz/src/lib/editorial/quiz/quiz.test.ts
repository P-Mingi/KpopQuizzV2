// Run O1, lot E1b: the pure rules of the quiz lane. The draft check, the slug refusal, the publish caps (10 a day, 1 per group a
// day, the 3 a day of the other kinds untouched), the random schedule (window, quiet hours, caps, groups with no quiz first), the
// review batch sample and verdict. No database, no network.

import { describe, expect, it } from 'vitest';

import { MAX_PER_DAY } from '../types';
import { planPublish } from '../rules';
import { editorialQuizFrom } from './flag';
import { BLOCKED_SOURCE_HOSTS, checkQuizPayload, isHubQueryTitle, quizRowFor, slugRefusal } from './payload';
import {
  DEFAULT_SCHEDULE_DAYS, LEAD_MIN, MAX_QUIZ_PER_DAY, MAX_QUIZ_PER_GROUP_PER_DAY, REJECT_AT_ERRORS, batchVerdict, drawSample, inQuietWindow, isQuizTimeAllowed,
  planQuizPublish, planQuizSchedule, sampleSize, utcDayKey,
} from './rules';
import { ADMIN, DAY, GROUPS, JAE, MINA, MIN, NOW, RETIRED, draftFor, goodPayload, iso, isAdmin, question } from './test-fixtures';

import type { QuizPublishContext, QuizRuleDraft } from './rules';

/** A small seeded generator, so the random schedule is reproducible. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe('the flag', () => {
  it('is off by default, on only for "1" or "true", and only on the kpop build', () => {
    expect(editorialQuizFrom(undefined, 'kpop')).toBe(false);
    for (const v of ['', '0', 'false', 'yes', 'on']) expect(editorialQuizFrom(v, 'kpop'), v).toBe(false);
    expect(editorialQuizFrom('1', 'kpop')).toBe(true);
    expect(editorialQuizFrom('true', 'kpop')).toBe(true);
    expect(editorialQuizFrom('1', 'anime')).toBe(false);
    expect(editorialQuizFrom('1', 'hub')).toBe(false);
  });
});

describe('the quiz draft (formats.md 4, kpop form)', () => {
  it('accepts a good draft and keeps what it needs', () => {
    const r = checkQuizPayload(goodPayload());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.questions).toHaveLength(10);
      expect(r.value.slug).toBe('aespa-debut-era-check');
    }
  });

  it('accepts the tags of an anime draft on a question and keeps them out of the quiz row', () => {
    const p = goodPayload();
    p.questions[0] = { ...p.questions[0]!, kind: 'character', spoiler: { arc: 0, scope: 'anime' }, fact_ids: ['aespa-debut-001'] };
    expect(checkQuizPayload(p).ok).toBe(true);
    const row = quizRowFor(MINA, 1, p);
    expect(Object.keys(row.questions[0]!).sort()).toEqual(['correct', 'options', 'question', 'source_url']);
  });

  const err = (p: unknown): string | null => { const r = checkQuizPayload(p); return r.ok ? null : r.error; };
  it('refuses what the owner decisions and the rulebook refuse', () => {
    const g = goodPayload();
    expect(err(null)).toBe('bad_payload');
    expect(err([])).toBe('bad_payload');
    expect(err({ ...g, extra: 1 })).toBe('bad_payload');
    expect(err({ ...g, site: 'anime' })).toBe('bad_site');
    expect(err({ ...g, account: 'Mina Team' })).toBe('bad_account');
    expect(err({ ...g, group_slug: 'A B' })).toBe('bad_group_slug');
    expect(err({ ...g, title: 'abc' })).toBe('bad_title');
    expect(err({ ...g, title: 'x'.repeat(101) })).toBe('bad_title');
    expect(err({ ...g, title: ' padded title here ' })).toBe('bad_title');
    expect(err({ ...g, quiz_type: 'true_false' })).toBe('bad_quiz_type');
    expect(err({ ...g, difficulty: 'impossible' })).toBe('bad_difficulty');
    expect(err({ ...g, language: 'fr' })).toBe('bad_language');
    expect(err({ ...g, title_gives_nothing_away: false })).toBe('title_gives_something_away');
    expect(err({ ...g, description: 'x'.repeat(281) })).toBe('bad_description');
    expect(err({ ...g, notes: 'x'.repeat(501) })).toBe('bad_notes');
  });

  it('exactly 10 questions of 4 different options, a right index, one line of plain text', () => {
    const g = goodPayload();
    expect(err({ ...g, questions: g.questions.slice(0, 9) })).toBe('bad_question_count');
    expect(err({ ...g, questions: [...g.questions, question(11)] })).toBe('bad_question_count');
    const q = (over: Record<string, unknown>) => ({ ...g, questions: [{ ...g.questions[0]!, ...over }, ...g.questions.slice(1)] });
    expect(err(q({ options: ['a', 'b', 'c'] }))).toBe('bad_question');
    expect(err(q({ options: ['a', 'b', 'c', 'A'] }))).toBe('bad_question');
    expect(err(q({ correct: 4 }))).toBe('bad_question');
    expect(err(q({ correct: 1.5 }))).toBe('bad_question');
    expect(err(q({ question: '' }))).toBe('bad_question');
    expect(err(q({ question: 'x'.repeat(301) }))).toBe('bad_question');
    expect(err(q({ fun_fact: 'x'.repeat(281) }))).toBe('bad_question');
    expect(err(q({ source_url: 'https://example.org/not-in-the-draft' }))).toBe('bad_question');
    expect(err(q({ unknown: 1 }))).toBe('bad_question');
    const r = checkQuizPayload(q({ options: ['a', 'b', 'c'] }));
    expect(!r.ok && r.detail).toContain('Question 1');
  });

  it('no dash, no emoji, no line break in any text', () => {
    const g = goodPayload();
    const dash = String.fromCharCode(0x2014);
    const endash = String.fromCharCode(0x2013);
    expect(err({ ...g, title: `Era ${dash} the debut` })).toBe('bad_title');
    expect(err({ ...g, title: `Era ${endash} the debut` })).toBe('bad_title');
    expect(err({ ...g, title: 'The debut era \u{1F525} quiz of aespa' })).toBe('bad_title');
    expect(err({ ...g, questions: [{ ...g.questions[0]!, question: `Which ${dash} one?` }, ...g.questions.slice(1)] })).toBe('bad_question');
    expect(err({ ...g, questions: [{ ...g.questions[0]!, options: ['a\nb', 'b', 'c', 'd'] }, ...g.questions.slice(1)] })).toBe('bad_question');
  });

  it('no image of any kind: the group logo is the cover', () => {
    const g = goodPayload();
    expect(err({ ...g, cover_image_url: 'https://x.test/a.png' })).toBe('image_not_allowed');
    expect(err({ ...g, questions: [{ ...g.questions[0]!, image_url: 'https://x.test/a.png' }, ...g.questions.slice(1)] })).toBe('image_not_allowed');
    expect(err({ ...g, questions: [{ ...g.questions[0]!, options: [{ label: 'a', image_url: 'https://x.test/a.png' }, 'b', 'c', 'd'] }, ...g.questions.slice(1)] })).toBe('image_not_allowed');
  });

  it('sources: https only, listed, no site the rulebook forbids', () => {
    const g = goodPayload();
    expect(err({ ...g, sources: [] })).toBe('bad_sources');
    expect(err({ ...g, sources: [{ id: 'S1', title: 'x', url: 'http://en.wikipedia.org/wiki/Aespa' }] })).toBe('bad_sources');
    expect(err({ ...g, sources: [{ id: 'S1', title: 'x', url: 'https://en.wikipedia.org/wiki/Aespa' }, { id: 'S1', title: 'y', url: 'https://www.wikidata.org/wiki/Q1' }] })).toBe('bad_sources');
    expect(err({ ...g, sources: [{ id: 'S1', title: 'x', url: 'javascript:alert(1)' }] })).toBe('bad_sources');
    for (const host of BLOCKED_SOURCE_HOSTS) {
      const url = `https://${host}/page`;
      const p = { ...g, sources: [{ id: 'S1', title: 'x', url }], questions: g.questions.map((q) => ({ ...q, source_url: url })) };
      expect(err(p), host).toBe('blocked_source');
    }
    const sub = 'https://aespa.fandom.com/wiki/Aespa';
    expect(err({ ...g, sources: [{ id: 'S1', title: 'x', url: sub }], questions: g.questions.map((q) => ({ ...q, source_url: sub })) })).toBe('blocked_source');
  });
});

describe('the title and the slug (kpopquiz-seo 1.5 and 1.6)', () => {
  it('a title that is the query of the hub is refused', () => {
    for (const t of ['BTS quiz', 'bts Quiz', 'BTS test', 'BTS trivia', 'quiz BTS', 'Stray Kids Quiz!']) {
      expect(isHubQueryTitle(t, t.toLowerCase().startsWith('stray') ? 'stray-kids' : 'bts'), t).toBe(true);
    }
    expect(isHubQueryTitle('BTS quiz about the debut', 'bts')).toBe(false);
    expect(isHubQueryTitle('How well do you know BTS', 'bts')).toBe(false);
    expect(checkQuizPayload(goodPayload({ group_slug: 'bts', title: 'BTS Quiz', slug: 'bts-debut-check' }))).toMatchObject({ ok: false, error: 'title_is_hub_query' });
  });

  it('{group}-quiz, {group}-test and {group}-trivia are refused for the draft group, and for any other group once the store says so', () => {
    for (const kind of ['quiz', 'test', 'trivia']) {
      expect(slugRefusal(`bts-${kind}`, 'bts')).toBe('hub_slug');
      expect(checkQuizPayload(goodPayload({ group_slug: 'bts', slug: `bts-${kind}` }))).toMatchObject({ ok: false, error: 'hub_slug' });
      // aespa draft with the slug of the BTS hub: only the store knows that bts is a group
      expect(slugRefusal(`bts-${kind}`, 'aespa')).toBeNull();
      expect(slugRefusal(`bts-${kind}`, 'aespa', (s) => s === 'bts')).toBe('hub_slug');
    }
    expect(slugRefusal('stray-kids-quiz', 'stray-kids')).toBe('hub_slug');
    expect(slugRefusal('bts-quiz-night', 'bts')).toBeNull();
    expect(slugRefusal('bts-fan-quiz', 'bts')).toBeNull();
    expect(slugRefusal('kpop-music-quiz', 'bts', (s) => s === 'bts')).toBeNull();
  });

  it('a slug is lowercase words joined by single hyphens, 80 characters at most', () => {
    for (const bad of ['', 'Upper-Case', 'under_score', '-lead', 'trail-', 'dou--ble', 'a'.repeat(81), 'sp ace']) expect(slugRefusal(bad, 'bts'), bad).toBe('bad_slug');
    expect(slugRefusal('a'.repeat(80), 'bts')).toBeNull();
  });
});

describe('the quiz row the publisher writes', () => {
  it('is the create route payload: multiple_choice, English, 10 questions, no image, the Team account as creator', () => {
    const row = quizRowFor(MINA, 1, goodPayload());
    expect(row).toMatchObject({
      creator_id: MINA, group_id: 1, title: 'How well do you know the aespa debut era?', slug: 'aespa-debut-era-check',
      quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en', question_count: 10, cover_image_url: null,
    });
    expect(row.questions).toHaveLength(10);
    expect(row.questions[0]).toEqual({ question: 'Question number 1 about the group?', options: ['Answer 1a', 'Answer 1b', 'Answer 1c', 'Answer 1d'], correct: 1, source_url: 'https://en.wikipedia.org/wiki/Aespa' });
    expect(row.questions[1]).toHaveProperty('fun_fact', 'Fact 2: a short sentence.');
    expect(row.settings).toEqual({ timer: true, timer_seconds: 15, shuffle: false, show_answers: true, creator_note: 'Ten sourced questions on the first year of aespa.' });
    expect(JSON.stringify(row.questions)).not.toMatch(/image/i);
    expect(row.cover_image_url).toBeNull();
  });

  it('no description gives no creator note', () => {
    const { description: _d, ...rest } = goodPayload();
    expect(quizRowFor(MINA, 1, rest as ReturnType<typeof goodPayload>).settings).toEqual({ timer: true, timer_seconds: 15, shuffle: false, show_answers: true });
  });
});

// ---------------------------------------------------------------------------------------------------------------------------

describe('the publish caps: 10 quizzes a day, 1 per group a day, the 3 a day of the other kinds untouched', () => {
  const due = (id: number, group: number, over: Partial<QuizRuleDraft> = {}): QuizRuleDraft => ({
    id, account_id: MINA, group_id: group, status: 'approved', scheduled_at: iso(NOW - MIN * id), reviewed_by: ADMIN, reviewed_at: iso(NOW - 60 * MIN), published_ref: null,
    payload: draftFor(GROUPS.find((g) => g.id === group)!, id), ...over,
  });
  const ctx = (over: Partial<QuizPublishContext> = {}): QuizPublishContext => ({
    now: NOW, publishedToday: [], isAdmin, activeAccountIds: new Set([MINA, JAE]), slugOwners: new Map(), groupSlugs: new Set(GROUPS.map((g) => g.slug)),
    groupSlugById: new Map(GROUPS.map((g) => [g.id, g.slug] as const)), ...over,
  });

  it('the constants are the owner decisions', () => {
    expect(MAX_QUIZ_PER_DAY).toBe(10);
    expect(MAX_QUIZ_PER_GROUP_PER_DAY).toBe(1);
    expect(MAX_PER_DAY).toBe(3);
  });

  it('10 a day: the eleventh waits for the next UTC day', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ group_id: 100 + i }));
    expect(planQuizPublish([due(1, 1)], ctx({ publishedToday: nine })).pick?.id).toBe(1);
    const ten = [...nine, { group_id: 109 }];
    const capped = planQuizPublish([due(1, 1)], ctx({ publishedToday: ten }));
    expect(capped).toMatchObject({ pick: null, reason: 'daily_cap' });
  });

  it('1 per group a day: a second quiz of a group waits, another group goes first', () => {
    const plan = planQuizPublish([due(1, 1), due(2, 2)], ctx({ publishedToday: [{ group_id: 1 }] }));
    expect(plan.pick?.id).toBe(2);
    expect(plan.skipped).toEqual([{ id: 1, reason: 'group_cap' }]);
    const onlyGroupOne = planQuizPublish([due(1, 1)], ctx({ publishedToday: [{ group_id: 1 }] }));
    expect(onlyGroupOne).toMatchObject({ pick: null, reason: 'nothing_due' });
  });

  it('the quiz count never reads the count of the other kinds, and the other kinds never read the quiz count', () => {
    // 10 quizzes today: the 3 a day of threads is still 0 of 3.
    expect(planPublish([{ id: 1, account_id: MINA, status: 'approved', scheduled_at: iso(NOW - MIN), reviewed_by: ADMIN, reviewed_at: iso(NOW - MIN), published_ref: null }],
      { now: NOW, publishedToday: 0, lastAccountId: null, isAdmin, activeAccountIds: new Set([MINA]) }).pick?.id).toBe(1);
    // 3 threads today: the quiz still goes (the quiz context has no such count at all).
    expect(planQuizPublish([due(1, 1)], ctx()).pick?.id).toBe(1);
    // and "never two in a row from one account" does not apply to quizzes: the same account publishes two quizzes of two groups in a row
    const first = planQuizPublish([due(1, 1), due(2, 2)], ctx());
    expect(first.pick?.id).toBe(2); // the older one
    expect(planQuizPublish([due(1, 1)], ctx({ publishedToday: [{ group_id: 2 }] })).pick?.id).toBe(1); // same account, next group, right after
  });

  it('never in the quiet window around midnight UTC', () => {
    const old = due(1, 1, { scheduled_at: iso(Date.parse('2026-11-02T12:00:00Z')) });
    for (const t of ['2026-11-03T23:50:00Z', '2026-11-03T23:59:59Z', '2026-11-04T00:00:00Z', '2026-11-04T00:29:59Z']) {
      expect(planQuizPublish([old], ctx({ now: Date.parse(t) })), t).toMatchObject({ pick: null, reason: 'quiet_window' });
    }
    expect(planQuizPublish([old], ctx({ now: Date.parse('2026-11-04T00:30:00Z') })).pick?.id).toBe(1);
    expect(planQuizPublish([old], ctx({ now: Date.parse('2026-11-03T23:49:59Z') })).pick?.id).toBe(1);
  });

  it('the oldest due first; a draft the rules refuse is skipped with its reason and never blocks the others', () => {
    const drafts = [
      due(1, 1, { scheduled_at: iso(NOW - 5 * MIN) }),
      due(2, 2, { scheduled_at: iso(NOW - 50 * MIN) }),
      due(3, 3, { reviewed_by: null }),
      due(4, 4, { reviewed_by: JAE }),
      due(5, 5, { account_id: RETIRED }),
      due(6, 6, { group_id: null }),
      due(7, 7, { payload: { nope: true } }),
      due(8, 8, { scheduled_at: iso(NOW + MIN) }),
      due(9, 9, { published_ref: 'claim:x' }),
      due(10, 1, { payload: goodPayload({ group_slug: 'aespa', slug: 'aespa-debut-era-check' }) }),
    ];
    const plan = planQuizPublish(drafts, ctx({ slugOwners: new Map([['aespa-debut-era-check', { creator_id: JAE, title: 'Another quiz' }]]) }));
    expect(plan.pick?.id).toBe(2);
    const reason = (id: number): string | undefined => plan.skipped.find((s) => s.id === id)?.reason;
    expect(reason(3)).toBe('not_reviewed');
    expect(reason(4)).toBe('reviewer_not_admin');
    expect(reason(5)).toBe('account_inactive');
    expect(reason(6)).toBe('no_group');
    expect(reason(7)).toBe('bad_payload');
    expect(reason(8)).toBe('not_due');
    expect(reason(9)).toBe('claimed');
    expect(reason(10)).toBe('slug_taken');
  });

  it('a hub slug or a group that does not match its slug is refused at publication too', () => {
    const hub = due(1, 2, { payload: goodPayload({ group_slug: 'bts', slug: 'bts-quiz', title: 'A question about the debut of BTS' }) });
    expect(planQuizPublish([hub], ctx()).skipped).toEqual([{ id: 1, reason: 'bad_payload' }]); // the payload check already refuses it
    const other = due(2, 1, { payload: goodPayload({ group_slug: 'aespa', slug: 'bts-trivia' }) });
    expect(planQuizPublish([other], ctx()).skipped).toEqual([{ id: 2, reason: 'hub_slug' }]);
    const mismatch = due(3, 2, { payload: goodPayload({ group_slug: 'aespa', slug: 'aespa-mismatch' }) });
    expect(planQuizPublish([mismatch], ctx()).skipped).toEqual([{ id: 3, reason: 'group_mismatch' }]);
  });

  it('a quiz this very draft wrote before a run stopped is adopted, not refused as a taken slug', () => {
    const d = due(1, 1);
    const own = new Map([['aespa-era-check-1', { creator_id: MINA, title: 'How well do you know aespa era 1?' }]]);
    expect(planQuizPublish([d], ctx({ slugOwners: own })).pick?.id).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------

describe('the quiet window and the allowed times', () => {
  it('06:00 to 22:00 UTC, never 23:50 to 00:30', () => {
    const at = (hm: string): number => Date.parse(`2026-11-04T${hm}:00Z`);
    for (const ok of ['06:00', '06:01', '12:00', '21:59', '22:00']) expect(isQuizTimeAllowed(at(ok)), ok).toBe(true);
    for (const no of ['00:00', '00:29', '00:30', '05:59', '22:01', '23:49', '23:50', '23:59']) expect(isQuizTimeAllowed(at(no)), no).toBe(false);
    for (const q of ['23:50', '23:59', '00:00', '00:29']) expect(inQuietWindow(at(q)), q).toBe(true);
    for (const q of ['00:30', '23:49', '12:00']) expect(inQuietWindow(at(q)), q).toBe(false);
  });
});

describe('the random schedule', () => {
  const none = new Set<number>();
  const items = (n: number, groupOf: (i: number) => number = (i) => GROUPS[i % GROUPS.length]!.id) => Array.from({ length: n }, (_, i) => ({ id: i + 1, group_id: groupOf(i) }));
  const dayOfSlot = (iso_: string): string => utcDayKey(Date.parse(iso_));

  it('every time is in the window, outside the quiet hours, on its own quarter hour, after the lead time', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planQuizSchedule(items(12), { now: NOW, days: 5, existing: [], firstGroups: none, rand: seeded(seed) });
      expect(plan.assigned).toHaveLength(12);
      const slots = new Set<string>();
      for (const a of plan.assigned) {
        const t = Date.parse(a.scheduled_at);
        expect(isQuizTimeAllowed(t), a.scheduled_at).toBe(true);
        expect(t).toBeGreaterThanOrEqual(NOW + LEAD_MIN * MIN);
        const slot = Math.floor(t / (15 * MIN));
        expect(slots.has(String(slot)), `two quizzes in the quarter hour of ${a.scheduled_at}`).toBe(false);
        slots.add(String(slot));
      }
    }
  });

  it('the times are random: different seeds give different calendars, the same seed the same one', () => {
    const run = (seed: number): string => JSON.stringify(planQuizSchedule(items(10), { now: NOW, days: 7, existing: [], firstGroups: none, rand: seeded(seed) }).assigned);
    expect(run(1)).toBe(run(1));
    expect(run(1)).not.toBe(run(2));
    const spread = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) for (const a of planQuizSchedule([{ id: 1, group_id: 1 }], { now: NOW, days: 3, existing: [], firstGroups: none, rand: seeded(seed) }).assigned) spread.add(new Date(a.scheduled_at).getUTCHours());
    expect(spread.size).toBeGreaterThan(8); // a hand picked hour would give one
  });

  it('at most 10 a day and 1 per group a day, whatever the batch', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const batch = items(50, (i) => GROUPS[(i * 7 + seed) % 4]!.id); // 50 drafts of only 4 groups
      const plan = planQuizSchedule(batch, { now: NOW, days: 30, existing: [], firstGroups: none, rand: seeded(seed) });
      const perDay = new Map<string, number>();
      const perGroupDay = new Map<string, number>();
      for (const a of plan.assigned) {
        const g = batch.find((b) => b.id === a.id)!.group_id!;
        const d = dayOfSlot(a.scheduled_at);
        perDay.set(d, (perDay.get(d) ?? 0) + 1);
        perGroupDay.set(`${d}/${g}`, (perGroupDay.get(`${d}/${g}`) ?? 0) + 1);
      }
      for (const [d, n] of perDay) expect(n, d).toBeLessThanOrEqual(MAX_QUIZ_PER_DAY);
      for (const [k, n] of perGroupDay) expect(n, k).toBe(1);
      expect(plan.assigned.length + plan.unplaced.length).toBe(50);
    }
  });

  it('4 groups over 30 days: one quiz a group a day gives at most 4 a day, and 50 drafts need 13 days', () => {
    const batch = items(50, (i) => GROUPS[i % 4]!.id);
    expect(planQuizSchedule(batch, { now: NOW, days: 13, existing: [], firstGroups: none, rand: seeded(3) }).assigned).toHaveLength(50);
    const short = planQuizSchedule(batch, { now: NOW, days: 5, existing: [], firstGroups: none, rand: seeded(3) });
    expect(short.assigned.length).toBeLessThanOrEqual(20);
    expect(short.unplaced.every((u) => u.reason === 'no_room')).toBe(true);
    expect(short.assigned.length + short.unplaced.length).toBe(50);
  });

  it('the batch is spread over the N days, not packed on the first', () => {
    const plan = planQuizSchedule(items(12), { now: NOW, days: 6, existing: [], firstGroups: none, rand: seeded(5) });
    const days = new Set(plan.assigned.map((a) => dayOfSlot(a.scheduled_at)));
    expect(days.size).toBe(6);
    const per = new Map<string, number>();
    for (const a of plan.assigned) per.set(dayOfSlot(a.scheduled_at), (per.get(dayOfSlot(a.scheduled_at)) ?? 0) + 1);
    expect([...per.values()].every((n) => n === 2)).toBe(true);
  });

  it('what is already on the calendar takes its place: the day cap, the group of the day, the quarter hour', () => {
    const today = utcDayKey(NOW);
    const existing = Array.from({ length: 9 }, (_, i) => ({ group_id: 100 + i, at: iso(Date.parse(`${today}T${String(13 + (i % 8)).padStart(2, '0')}:${i < 8 ? '00' : '15'}:00Z`)) }));
    const plan = planQuizSchedule(items(3), { now: NOW, days: 1, existing, firstGroups: none, rand: seeded(7) });
    expect(plan.assigned).toHaveLength(1); // 9 of 10 taken today
    expect(plan.unplaced).toHaveLength(2);
    // group of the day: group 1 already published today
    const g1 = planQuizSchedule([{ id: 1, group_id: 1 }], { now: NOW, days: 1, existing: [{ group_id: 1, at: iso(NOW - 3 * 60 * MIN) }], firstGroups: none, rand: seeded(1) });
    expect(g1.assigned).toHaveLength(0);
    expect(g1.unplaced).toEqual([{ id: 1, reason: 'no_room' }]);
    // the slot of an existing quiz is not handed out again
    const busy = Array.from({ length: 5 }, (_, i) => ({ group_id: 100 + i, at: iso(Date.parse(`${today}T14:0${i}:00Z`)) }));
    for (let seed = 1; seed <= 30; seed++) {
      const p = planQuizSchedule(items(2), { now: NOW, days: 1, existing: busy, firstGroups: none, rand: seeded(seed) });
      for (const a of p.assigned) expect(Date.parse(a.scheduled_at) >= Date.parse(`${today}T14:00:00Z`) && Date.parse(a.scheduled_at) < Date.parse(`${today}T14:15:00Z`)).toBe(false);
    }
  });

  it('a day that is over for today (after 21:30 UTC) starts the next day; nothing is ever in the past', () => {
    const late = Date.parse('2026-11-04T21:40:00Z');
    const plan = planQuizSchedule(items(3), { now: late, days: 3, existing: [], firstGroups: none, rand: seeded(2) });
    expect(plan.assigned).toHaveLength(3);
    for (const a of plan.assigned) expect(Date.parse(a.scheduled_at)).toBeGreaterThan(late);
    expect(plan.assigned.some((a) => dayOfSlot(a.scheduled_at) === '2026-11-04')).toBe(false);
    const night = Date.parse('2026-11-04T23:55:00Z');
    expect(planQuizSchedule(items(1), { now: night, days: 2, existing: [], firstGroups: none, rand: seeded(2) }).assigned.every((a) => isQuizTimeAllowed(Date.parse(a.scheduled_at)))).toBe(true);
  });

  it('the groups with no published quiz come first, in time', () => {
    const batch = [
      { id: 1, group_id: 1 }, { id: 2, group_id: 2 }, { id: 3, group_id: 3 }, { id: 4, group_id: 4 }, { id: 5, group_id: 5 }, { id: 6, group_id: 6 },
    ];
    const first = new Set([5, 6]); // two groups with no published quiz, the last two of the batch
    const plan = planQuizSchedule(batch, { now: NOW, days: 3, existing: [], firstGroups: first, rand: seeded(11) });
    const order = plan.assigned.map((a) => batch.find((b) => b.id === a.id)!.group_id);
    expect(order.slice(0, 2).sort()).toEqual([5, 6]);
    const when = (g: number): number => Date.parse(plan.assigned.find((a) => batch.find((b) => b.id === a.id)!.group_id === g)!.scheduled_at);
    for (const g of [1, 2, 3, 4]) for (const f of [5, 6]) expect(when(f), `group ${f} before group ${g}`).toBeLessThan(when(g));
  });

  it('a draft with no group is never scheduled', () => {
    const plan = planQuizSchedule([{ id: 1, group_id: null }, { id: 2, group_id: 1 }], { now: NOW, days: 2, existing: [], firstGroups: none, rand: seeded(4) });
    expect(plan.unplaced).toEqual([{ id: 1, reason: 'no_group' }]);
    expect(plan.assigned).toHaveLength(1);
  });

  it('a single approval goes to the earliest day with room; the default spread is a week', () => {
    expect(DEFAULT_SCHEDULE_DAYS).toBe(7);
    const plan = planQuizSchedule([{ id: 1, group_id: 1 }], { now: NOW, days: DEFAULT_SCHEDULE_DAYS, existing: [], firstGroups: none, rand: seeded(8) });
    expect(dayOfSlot(plan.assigned[0]!.scheduled_at)).toBe(utcDayKey(NOW));
  });

  it('days is clamped to 1..60', () => {
    expect(planQuizSchedule(items(1), { now: NOW, days: 0, existing: [], firstGroups: none, rand: seeded(1) }).assigned).toHaveLength(1);
    const many = planQuizSchedule(items(12, () => 1), { now: NOW, days: 1000, existing: [], firstGroups: none, rand: seeded(1) });
    const last = Math.max(...many.assigned.map((a) => Date.parse(a.scheduled_at)));
    expect(last).toBeLessThan(NOW + 61 * DAY);
  });
});

describe('the review batch', () => {
  it('a quarter of the batch is read, at least one', () => {
    expect(sampleSize(0)).toBe(0);
    expect(sampleSize(1)).toBe(1);
    expect(sampleSize(4)).toBe(1);
    expect(sampleSize(10)).toBe(3);
    expect(sampleSize(50)).toBe(13);
  });

  it('the sample is drawn from the batch with the batch id as the seed: the same batch always shows the same sample', () => {
    const ids = Array.from({ length: 20 }, (_, i) => 100 + i);
    const a = drawSample(ids, 7);
    expect(a).toHaveLength(5);
    expect(drawSample(ids, 7)).toEqual(a);
    expect(drawSample([...ids].reverse(), 7)).toEqual(a);
    expect(a.every((id) => ids.includes(id))).toBe(true);
    expect(new Set(a).size).toBe(a.length);
    expect(drawSample(ids, 8)).not.toEqual(a);
  });

  it('two errors or more reject the batch', () => {
    expect(REJECT_AT_ERRORS).toBe(2);
    expect(batchVerdict(0)).toBe('approved');
    expect(batchVerdict(1)).toBe('approved');
    expect(batchVerdict(2)).toBe('rejected');
    expect(batchVerdict(9)).toBe('rejected');
  });
});

describe('no em dash or en dash in anything the lane writes', () => {
  it('the copy of the fixtures and the row', () => {
    const text = JSON.stringify([goodPayload(), quizRowFor(MINA, 1, goodPayload())]);
    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });
});

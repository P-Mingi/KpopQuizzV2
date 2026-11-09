import { describe, expect, it } from 'vitest';

import { MINA, NOW, GROUPS, memoryQuizStore } from '@/lib/editorial/quiz/test-fixtures';
import { checkQuizPayload } from '@/lib/editorial/quiz/payload';

import { buildAwardDraft, daysLabel, pickFacts, plainName, planAwardPrep, runAwardPrep } from './award-prep';
import { AWARD_SHOWS } from './calendar';
import { awardResultsFor } from './results';
import { awardPrepFrom } from './flag';

import type { AwardFact } from './award-prep';
import type { AwardShow } from './calendar';

// Audit 04 section 4 (P1-6): the award-prep engine at T-10, T-3 and T+1, a dry run that writes nothing, fail closed.

const DAY = 86_400_000;
const at = (iso: string): number => Date.parse(iso);
const MMA = AWARD_SHOWS.find((s) => s.id === 'mma-2026')!;
const MAMA = AWARD_SHOWS.find((s) => s.id === 'mama-2026')!;
const AAA = AWARD_SHOWS.find((s) => s.id === 'aaa-2026')!;
const SBS = AWARD_SHOWS.find((s) => s.id === 'sbs-gayo-daejeon-2026')!;

describe('the flag', () => {
  it('AWARD_PREP is off unless set, and only on kpopquiz.org', () => {
    expect(awardPrepFrom(undefined, 'kpop')).toBe(false);
    expect(awardPrepFrom('', 'kpop')).toBe(false);
    expect(awardPrepFrom('1', 'kpop')).toBe(true);
    expect(awardPrepFrom('1', 'anime')).toBe(false);
  });
});

describe('planAwardPrep: T-10, T-3, T+1', () => {
  it('nothing before T-10, a prep draft from T-10 up to T-3, then nothing until the show', () => {
    const plan = (iso: string) => planAwardPrep([MMA], at(iso));
    expect(plan('2026-11-03T23:59:00Z').skipped).toEqual([{ show: 'mma-2026', reason: 'before_window' }]);
    expect(plan('2026-11-04T00:00:00Z').actions).toEqual([{ key: 'award:mma-2026:prep', show: 'mma-2026', phase: 'prep', slug: 'mma-awards-quiz' }]);
    expect(plan('2026-11-11T12:00:00Z').actions).toHaveLength(1);   // T-3 at noon
    expect(plan('2026-11-11T23:59:59Z').actions).toHaveLength(1);   // the end of T-3
    expect(plan('2026-11-12T00:00:00Z').actions).toEqual([]);       // T-2: too late, the owner needed it earlier
    expect(plan('2026-11-12T00:00:00Z').skipped).toEqual([{ show: 'mma-2026', reason: 'outside_window' }]);
  });
  it('T+1: no new draft, only the watch window (and only for a show with a winners_url)', () => {
    const watching = { ...MMA, winners_url: 'https://example.com/winners/' };
    expect(planAwardPrep([watching], at('2026-11-16T09:00:00Z')).actions).toEqual([{ key: 'award:mma-2026:watch', show: 'mma-2026', phase: 'watch', slug: 'mma-awards-quiz' }]);
    expect(planAwardPrep([MMA], at('2026-11-16T09:00:00Z')).actions).toEqual([]);
    expect(planAwardPrep([watching], at(`2026-11-15T00:00:00Z`) + 15 * DAY).actions).toEqual([]);
  });
  it('a show that is only reported never drafts; one that exists is skipped (idempotent)', () => {
    expect(planAwardPrep([AAA], at('2026-11-27T09:00:00Z')).skipped).toEqual([{ show: 'aaa-2026', reason: 'not_confirmed' }]);
    expect(planAwardPrep([MMA], at('2026-11-05T09:00:00Z'), (slug) => slug === 'mma-awards-quiz').skipped).toEqual([{ show: 'mma-2026', reason: 'exists' }]);
  });
  it('names: evergreen, no year', () => {
    expect(plainName('Melon Music Awards 2026 (MMA2026, the 18th)')).toBe('Melon Music Awards');
    expect(plainName('2026 MAMA Awards')).toBe('MAMA Awards');
    expect(plainName('41st Golden Disc Awards')).toBe('Golden Disc Awards');
    expect(daysLabel(['2026-11-14', '2026-11-15'])).toBe('November 14 and 15');
    expect(daysLabel(['2026-12-31', '2027-01-01'])).toBe('December 31 and January 1');
  });
});

describe('buildAwardDraft', () => {
  it.each([MMA, MAMA])('$id: ten questions, 5 winners then 5 show facts, publish_by = the first show day, passes checkQuizPayload', (show) => {
    const draft = buildAwardDraft(show, awardResultsFor(show.id)!, { account: 'mina_team' });
    expect(draft).not.toBeNull();
    expect(draft!.questions).toHaveLength(10);
    expect(draft!.publish_by).toBe(show.days[0]);
    expect(draft!.slug).toBe(show.quiz_slug);
    expect(draft!.title).not.toMatch(/\b20\d\d\b/);
    expect(checkQuizPayload(draft).ok).toBe(true);
    // The right answer is the fact's answer and the options are the answer plus its three real distractors.
    const facts = awardResultsFor(show.id)!.facts;
    for (const q of draft!.questions) {
      const f = facts.find((x) => x.question === q.question)!;
      expect(q.options[q.correct]).toBe(f.answer);
      expect([...q.options].sort()).toEqual([f.answer, ...f.distractors].sort());
    }
  });
  it('is deterministic: the same facts build the same draft', () => {
    expect(buildAwardDraft(MMA, awardResultsFor('mma-2026')!)).toEqual(buildAwardDraft(MMA, awardResultsFor('mma-2026')!));
  });
  it('fails closed: too few facts, a fact outside the allowed categories, a source not in the file, a show with no awards asking for winners', () => {
    const r = awardResultsFor('mma-2026')!;
    expect(buildAwardDraft(MMA, { ...r, facts: r.facts.slice(0, 9) })).toBeNull();
    const fan: AwardFact[] = r.facts.map((f, i) => (i === 0 ? { ...f, category: 'show_facts' as const, kind: 'show' as const } : f));
    expect(pickFacts({ ...MMA, allowed_categories: ['show_facts'] }, fan)).toBeNull();
    expect(buildAwardDraft(MMA, { ...r, facts: r.facts.map((f, i) => (i === 3 ? { ...f, source_url: 'https://example.com/other' } : f)) })).toBeNull();
    expect(pickFacts(SBS, r.facts)).toBeNull(); // SBS gives no awards: winner facts are refused, and show facts alone are fewer than 10
  });
  it('a nominee fact is used only when the show publishes its nominees', () => {
    const r = awardResultsFor('mma-2026')!;
    const nominee: AwardFact = { id: 'n1', kind: 'nominee', category: 'main_prize', question: 'Which of these is nominated for Rookie of the Year?', answer: 'A', distractors: ['B', 'C', 'D'], source_url: r.sources[0]!.url, read_on: '2026-11-09' };
    const withNominee = { ...r, facts: [nominee, ...r.facts] };
    expect(buildAwardDraft(MMA, withNominee)!.questions.some((q) => q.question === nominee.question)).toBe(false);
    const published: AwardShow = { ...MMA, nominees_url: 'https://example.com/nominees/' };
    expect(buildAwardDraft(published, withNominee)!.questions.some((q) => q.question === nominee.question)).toBe(true);
  });
});

describe('runAwardPrep', () => {
  const groups = [...GROUPS, { id: 99, slug: 'general-kpop', name: 'General K-pop' }];
  const deps = (over: Record<string, unknown> = {}) => ({
    now: at('2026-11-05T09:00:00Z'), dry: false, store: memoryQuizStore({ groups }), shows: [MMA, MAMA, AAA, SBS], results: awardResultsFor, account: 'mina_team', ...over,
  });

  it('files the MMA draft as a full-review batch with no admin, and nothing for the shows that are not due', async () => {
    const d = deps();
    const r = await runAwardPrep(d as never);
    expect(r.imported).toBe(1);
    expect(r.rejected).toEqual([]);
    const store = d.store;
    expect(store.drafts).toHaveLength(1);
    expect(store.drafts[0]!.created_by).toBeNull();
    expect(store.drafts[0]!.status).toBe('draft');
    expect(store.batches).toHaveLength(1);
    expect(store.batches[0]!.size).toBe(1);
    expect(store.batches[0]!.sample_size).toBe(1);   // 100 percent, not 25
    expect((store.drafts[0]!.payload as { publish_by: string }).publish_by).toBe('2026-11-14');
    expect(r.skipped.map((s) => `${s.show}:${s.reason}`).sort()).toEqual(['aaa-2026:before_window', 'mama-2026:before_window', 'sbs-gayo-daejeon-2026:before_window']);
  });
  it('is idempotent: a second run files nothing', async () => {
    const d = deps();
    await runAwardPrep(d as never);
    const again = await runAwardPrep(d as never);
    expect(again.imported).toBe(0);
    expect(d.store.drafts).toHaveLength(1);
    expect(again.skipped).toContainEqual({ show: 'mma-2026', reason: 'exists' });
  });
  it('a dry run plans and builds the draft but writes nothing', async () => {
    const d = deps({ dry: true });
    const r = await runAwardPrep(d as never);
    expect(r.dry).toBe(true);
    expect(r.drafts).toEqual([{ key: 'award:mma-2026:prep', slug: 'mma-awards-quiz', questions: 10 }]);
    expect(r.imported).toBe(0);
    expect(d.store.drafts).toHaveLength(0);
    expect(d.store.batches).toHaveLength(0);
  });
  it('a show with no results file gets no draft', async () => {
    const r = await runAwardPrep(deps({ results: () => null }) as never);
    expect(r.imported).toBe(0);
    expect(r.skipped).toContainEqual({ show: 'mma-2026', reason: 'no_facts' });
  });
  it('the placeholder account is refused by the import (not an active Team account): nothing is filed', async () => {
    const d = deps({ account: undefined });
    const r = await runAwardPrep(d as never);
    expect(r.imported).toBe(0);
    expect(r.rejected.map((x) => x.error)).toEqual(['bad_account']);
    expect(d.store.drafts).toHaveLength(0);
    expect(MINA).toBeTruthy();
    expect(NOW).toBeTruthy();
  });
});

describe('the cron route', () => {
  it('with the flag off (the default) it answers skipped flag_off and touches nothing', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'kpop');
    vi.stubEnv('CRON_SECRET', 'o1-test-secret');
    vi.stubEnv('AWARD_PREP', '');
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/cron/award-prep/route');
    const res = await GET(new NextRequest('https://example.test/api/cron/award-prep', { headers: { authorization: 'Bearer o1-test-secret' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: 'flag_off' });
    const denied = await GET(new NextRequest('https://example.test/api/cron/award-prep'));
    expect(denied.status).toBe(401);
    vi.unstubAllEnvs();
  });
});

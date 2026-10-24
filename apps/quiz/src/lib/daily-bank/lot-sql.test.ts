import { describe, expect, it } from 'vitest';

import { buildLotSql } from './lot-sql';

import type { LotQuiz } from './lot-sql';

// Mission U lot 2 (owner, 2026-10-25): the SQL of a kpop lot inserts, checks and rolls back
// kpopquiz.org rows only, before and after Run O1 adds site_id.

const quiz = (scheduled_date: string, title: string, group_slug: string | null = null): LotQuiz => ({
  scheduled_date, title, description: 'What the quiz covers.', group_slug, category: 'knowledge', quiz_type: 'multiple_choice', difficulty: 'easy',
  questions: [{ question: "Which group's song?", options: ['A', 'B', 'C', 'D'], correct: 1, fun_fact: 'A fact.', source: 'https://en.wikipedia.org/wiki/A' }],
});
const lot = [quiz('2026-11-14', "K-pop Agency Founders"), quiz('2026-11-13', 'ZEROBASEONE: In Bloom', 'zerobaseone')];
const idOf = new Map([['zerobaseone', 72]]);
const KPOP = "coalesce(to_jsonb(qb) ->> 'site_id', 'kpop') = 'kpop'";

describe('buildLotSql', () => {
  const out = buildLotSql('2', lot, idOf, 'Louis', '2026-11-05');

  it('names the files after the month of the first date (lot 1 keeps its October name)', () => {
    expect(out.name).toBe('daily-bank-2026-11-lot2.sql');
    expect(out.rollbackName).toBe('daily-bank-2026-11-lot2-rollback.sql');
    expect(buildLotSql('1', [quiz('2026-10-24', 'X')], idOf).name).toBe('daily-bank-2026-10-lot1.sql');
  });

  it('inserts in date order with no site_id, so the kpop default applies', () => {
    expect(out.sql).toContain('insert into public.quiz_bank (title, description, group_id, quiz_type, difficulty, category, questions, scheduled_date, status, verified_at, verification_notes)');
    expect(out.sql.indexOf("'ZEROBASEONE: In Bloom'")).toBeLessThan(out.sql.indexOf("'K-pop Agency Founders'"));
    expect(out.sql).not.toMatch(/insert into public\.quiz_bank \([^)]*site_id/);
    expect(out.sql).toContain("'2026-11-13'::date, 'verified', now()");
    expect(out.sql).toContain('checked by Louis on 2026-11-05.');
    expect(out.sql).toContain("Which group''s song?");
  });

  it('stops the transaction when a row of the lot is not a kpop row', () => {
    const check = out.sql.slice(out.sql.indexOf('do $$'), out.sql.indexOf('end $$;'));
    expect(check).toContain(`and not (${KPOP})`);
    // Only the rows this transaction inserted: an anime row that shares a title stays out of it.
    expect(check).toContain("qb.verified_at = now() and qb.title in ('ZEROBASEONE: In Bloom', 'K-pop Agency Founders')");
    expect(check).toContain("raise exception 'daily bank lot 2: a row of this lot is not a kpop row, nothing applied'");
    expect(out.sql.indexOf('do $$')).toBeGreaterThan(out.sql.indexOf('insert into'));
    expect(out.sql.indexOf('do $$')).toBeLessThan(out.sql.indexOf('commit;'));
  });

  it('checks dates and rolls back among kpop rows only', () => {
    expect(out.sql).toMatch(new RegExp(`status in \\('verified', 'scheduled'\\) and ${KPOP.replace(/[()|.*+?^$[\]\\{}]/g, '\\$&')}\\ngroup by scheduled_date`));
    expect(out.rollback).toContain(`published_quiz_id is null and ${KPOP};`);
    expect(out.rollback).toContain("title in ('ZEROBASEONE: In Bloom', 'K-pop Agency Founders')");
  });

  it('only lot 1 clears the far-future dates, and then among kpop rows', () => {
    expect(out.sql).not.toContain('2029-01-01');
    expect(buildLotSql('1', [quiz('2026-10-24', 'X')], idOf).sql).toContain(`scheduled_date >= '2029-01-01' and ${KPOP};`);
  });

  it('keeps the review placeholders when no review is recorded, and writes no dash', () => {
    const draft = buildLotSql('2', lot, idOf);
    expect(draft.sql).toContain('-- REVIEW NOT RECORDED');
    expect(draft.sql).toContain('checked by {REVIEWER} on {REVIEW_DATE}.');
    expect(`${out.sql}${out.rollback}${draft.sql}`).not.toMatch(/[\u2013\u2014]/);
  });
});

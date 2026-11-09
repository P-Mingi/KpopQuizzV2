import { describe, expect, it } from 'vitest';

import { buildCurve, checkProposals, expectedCtr, isBrandQuery, measureBatch, parseGscCsv, pickBatch, topQueries, typedNumbers } from './ctr-batch';

// Audit 04 P1-5: the position 4 to 10 procedure on fixtures (no real export yet: the batch waits for the owner's Search Console files).

const QUERIES = `Top queries,Clicks,Impressions,CTR,Position
bts quiz,50,1000,5%,5.2
bts test,20,400,5%,5.4
kpopquiz,90,300,30%,1.0
stray kids quiz,10,500,2%,7.1
cortis quiz,9,300,3%,6.8
aespa quiz,40,400,10%,4.4
blackpink quiz,60,600,10%,4.1
ive quiz,2,100,2%,8.2
twice quiz,3,100,3%,7.9
tiny query,1,5,20%,5.0
`;

describe('parseGscCsv', () => {
  it('reads a Search Console export: percent CTR as a share, quoted cells, a BOM', () => {
    const rows = parseGscCsv('﻿Top pages,Clicks,Impressions,CTR,Position\n"https://kpopquiz.org/a,b",5,"1,000",0.5%,4.5\n');
    expect(rows).toEqual([{ key: 'https://kpopquiz.org/a,b', clicks: 5, impressions: 1000, ctr: 0.005, position: 4.5 }]);
  });
  it('an export without the columns is empty, not a guess', () => {
    expect(parseGscCsv('foo,bar\n1,2\n')).toEqual([]);
    expect(parseGscCsv('')).toEqual([]);
  });
});

describe('the CTR curve', () => {
  const curve = buildCurve(parseGscCsv(QUERIES));
  it('is the median CTR per rounded position, brand and thin queries left out, never rising with the position', () => {
    expect(isBrandQuery('kpopquiz')).toBe(true);
    expect(isBrandQuery('kpop quiz')).toBe(false);
    expect(curve).toHaveLength(10);
    for (let i = 1; i < curve.length; i++) expect(curve[i]!).toBeLessThanOrEqual(curve[i - 1]!);
    expect(expectedCtr(curve, 5.2)).toBeCloseTo(0.05, 5);
    expect(expectedCtr(curve, 4.1)).toBeCloseTo(0.1, 5);
  });
  it('forces a rise to flat', () => {
    const c = buildCurve([
      { key: 'a', clicks: 0, impressions: 100, ctr: 0.04, position: 4 },
      { key: 'b', clicks: 0, impressions: 100, ctr: 0.09, position: 5 },
    ]);
    expect(c[4]).toBeLessThanOrEqual(c[3]!);
  });
});

const PAGES = (() => {
  const rows = ['https://kpopquiz.org/a', 'https://kpopquiz.org/b', 'https://kpopquiz.org/c', 'https://kpopquiz.org/d', 'https://kpopquiz.org/e'];
  return rows.map((key, i) => ({ key, clicks: 100 - i * 20, impressions: [2000, 1500, 800, 400, 250][i]!, ctr: [0.01, 0.015, 0.02, 0.03, 0.01][i]!, position: [5, 6, 7, 8, 5][i]! }));
})();
const CURVE = [0.3, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02];

describe('pickBatch', () => {
  it('300+ impressions, position 4 to 10.9, CTR under 0.75 of the curve; scored by the clicks left behind', () => {
    const r = pickBatch(PAGES, CURVE, { topN: 0 });
    // e has 250 impressions: out. d (3.0% vs 3% x 0.75 = 2.25%): not under, out.
    expect(r.batch.map((c) => c.page)).toEqual(['https://kpopquiz.org/a', 'https://kpopquiz.org/b', 'https://kpopquiz.org/c']);
    expect(r.batch[0]!.score).toBeCloseTo(2000 * (0.06 - 0.01), 6);
    expect(r.control).toEqual([]);
  });
  it('the next 20 form the control group, the batch is the top 20', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ key: `https://kpopquiz.org/p${i}`, clicks: 1, impressions: 1000 - i, ctr: 0.001, position: 6 }));
    const r = pickBatch(many, CURVE, { topN: 0 });
    expect(r.batch).toHaveLength(20);
    expect(r.control).toHaveLength(20);
    expect(r.batch[0]!.page).toBe('https://kpopquiz.org/p0');
    expect(r.control[0]!.page).toBe('https://kpopquiz.org/p20');
  });
  it('a page whose title changed in the last 28 days is out, and the top pages by clicks join only with the owner OK', () => {
    const recent = pickBatch(PAGES, CURVE, { topN: 0, recentlyChanged: new Set(['https://kpopquiz.org/a']) });
    expect(recent.batch.map((c) => c.page)).not.toContain('https://kpopquiz.org/a');
    const guarded = pickBatch(PAGES, CURVE, { topN: 1 });
    expect(guarded.excludedTop).toEqual(['https://kpopquiz.org/a']);
    expect(guarded.batch.map((c) => c.page)).not.toContain('https://kpopquiz.org/a');
    expect(pickBatch(PAGES, CURVE, { topN: 1, includeTop: true }).batch.map((c) => c.page)).toContain('https://kpopquiz.org/a');
  });
});

describe('topQueries', () => {
  it('the top non-brand queries of a page by impressions', () => {
    const rows = [
      { page: 'p', query: 'kpopquiz', clicks: 9, impressions: 900, position: 1 },
      { page: 'p', query: 'bts quiz', clicks: 1, impressions: 300, position: 5 },
      { page: 'p', query: 'bts test', clicks: 1, impressions: 100, position: 6 },
      { page: 'q', query: 'x', clicks: 1, impressions: 999, position: 6 },
    ];
    expect(topQueries(rows, 'p').map((r) => r.query)).toEqual(['bts quiz', 'bts test']);
  });
});

describe('checkProposals', () => {
  const good = { page: '/bts-quiz', title: 'BTS Quiz: Test Your Level, Easy to Hard', description: 'Take a BTS quiz at your level, from easy member questions to hard era deep cuts. Free to play, no sign-up, and every answer is explained after.', headTerm: 'bts quiz' };
  it('a clean proposal passes', () => {
    expect(good.title.length).toBeLessThanOrEqual(49);
    expect(checkProposals([good])).toEqual([]);
  });
  it.each([
    ['a title over 49 characters', { title: 'BTS Quiz: Test Your Level With A Very Long Title Here' }, 'over 49'],
    ['a short description', { description: 'Too short for a snippet.' }, 'outside 120 to 160'],
    ['a long description', { description: 'x'.repeat(170) }, 'outside 120 to 160'],
    ['a dash', { title: 'BTS Quiz \u2013 Easy to Hard' }, 'dash'],
    ['a typed number', { title: 'BTS Quiz: 450+ Free Tests' }, 'typed number'],
    ['a typed count', { title: 'BTS Quiz: 30 Questions' }, 'typed number'],
    ['an unreviewed year', { title: 'BTS Quiz 2026: Easy to Hard' }, 'year 2026'],
    ['a dropped head term', { title: 'How Well Do You Know Bangtan? Try It' }, 'drops the head term'],
  ])('refuses %s', (_n, over, msg) => {
    expect(checkProposals([{ ...good, ...over }]).join('\n')).toContain(msg);
  });
  it('refuses a duplicate among the proposals and against live titles', () => {
    expect(checkProposals([good, { ...good, page: '/other' }]).join('\n')).toContain('duplicates the one proposed');
    expect(checkProposals([good], { existingTitles: ['bts quiz: test your level, easy to hard'] }).join('\n')).toContain('duplicates a live title');
  });
  it('a reviewed year is allowed; ordinals and names with digits are not typed numbers', () => {
    expect(checkProposals([{ ...good, title: 'BTS Quiz 2026: Easy to Hard' }], { reviewedYears: [2026] })).toEqual([]);
    expect(typedNumbers('5th gen and 2NE1 and 1 question, 4,200 songs, 450+, 12 groups')).toEqual(['4,200', '450+', '12']);
  });
});

describe('measureBatch', () => {
  const P = (clicks: number, impressions: number, position = 6) => ({ clicks, impressions, position });
  it('win: +15% over the control with the position within 1.0; loss: -10% or worse; else keep', () => {
    const control = [{ before: P(10, 1000), after: P(11, 1000) }]; // control +10%
    const r = measureBatch([
      { page: 'win', before: P(10, 1000), after: P(14, 1000, 6.5) },   // +40% vs +10% = +30
      { page: 'loss', before: P(10, 1000), after: P(8, 1000) },        // -20% vs +10% = -30
      { page: 'keep', before: P(10, 1000), after: P(12, 1000) },       // +20% vs +10% = +10
      { page: 'moved', before: P(10, 1000), after: P(14, 1000, 8) },   // won on CTR but moved 2 positions
    ], control);
    expect(r.controlRatio).toBeCloseTo(0.1, 6);
    expect(Object.fromEntries(r.measures.map((m) => [m.page, m.verdict]))).toEqual({ win: 'win', loss: 'loss', keep: 'keep', moved: 'keep' });
    expect(r.revert).toEqual(['loss']);
  });
  it('a season swing that lifts the control as much does not make a win', () => {
    const r = measureBatch([{ page: 'p', before: P(10, 1000), after: P(14, 1000) }], [{ before: P(10, 1000), after: P(14, 1000) }]);
    expect(r.measures[0]!.verdict).toBe('keep');
  });
});

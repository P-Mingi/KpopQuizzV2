// O1 audit 03 P1-9 and P2-4: the quiz merge and removal tables are sound and drive the redirects, the 410 rewrites and the nightly crawl
// seeds. Owner, 2026-11-09: two merges approved (K01 and only-real-monstiez), no removal.
import { describe, expect, it } from 'vitest';

import { REDIRECT_SEEDS } from './prod-crawl';
import { QUIZ_GONE, QUIZ_MERGES, quizGoneRewrites, quizMergeRedirects, quizRedirectProblems } from './quiz-redirects';

describe('quiz redirect tables', () => {
  it('hold exactly the merges the owner approved (2026-11-09), no removal, and are sound', () => {
    expect(QUIZ_MERGES).toEqual({ 'this-is-only-for-true-gllits': 'this-is-only-for-true-gllits-2', 'only-real-monstiez': 'babymonster-quiz' });
    expect(QUIZ_GONE).toEqual([]);
    expect(quizRedirectProblems()).toEqual([]);
    expect(quizMergeRedirects()).toEqual([
      { source: '/q/this-is-only-for-true-gllits', destination: '/q/this-is-only-for-true-gllits-2', statusCode: 301 },
      { source: '/q/only-real-monstiez', destination: '/q/babymonster-quiz', statusCode: 301 },
    ]);
    expect(quizGoneRewrites()).toEqual([]);
    expect(REDIRECT_SEEDS.filter((s) => s.path.startsWith('/q/'))).toEqual([
      { path: '/q/this-is-only-for-true-gllits', to: '/q/this-is-only-for-true-gllits-2', why: 'quiz-redirects.ts merge' },
      { path: '/q/only-real-monstiez', to: '/q/babymonster-quiz', why: 'quiz-redirects.ts merge' },
    ]);
  });

  it('the next.config redirects carry them as a 301', async () => {
    const { default: nextConfig } = await import('../../../next.config');
    const redirects = await nextConfig.redirects!();
    for (const [from, to] of Object.entries(QUIZ_MERGES)) {
      expect(redirects).toContainEqual({ source: `/q/${from}`, destination: `/q/${to}`, statusCode: 301 });
    }
  });

  it('a merge is one 301 hop to the exact successor (the K01 pair as the shape)', () => {
    const merges = { 'this-is-only-for-true-gllits': 'this-is-only-for-true-gllits-2' };
    expect(quizRedirectProblems(merges, [])).toEqual([]);
    expect(quizMergeRedirects(merges)).toEqual([{ source: '/q/this-is-only-for-true-gllits', destination: '/q/this-is-only-for-true-gllits-2', statusCode: 301 }]);
  });

  it('a removed quiz is rewritten to the 410 handler, URL kept', () => {
    expect(quizGoneRewrites(['old-quiz'])).toEqual([{ source: '/q/old-quiz', destination: '/api/legacy/gone' }]);
  });

  it('refuses a chain, a self merge, a gone target, a double entry and a bad slug', () => {
    expect(quizRedirectProblems({ a: 'b', b: 'c' }, [])).toEqual([expect.stringContaining('chain')]);
    expect(quizRedirectProblems({ a: 'a' }, [])).toEqual([expect.stringContaining('itself')]);
    expect(quizRedirectProblems({ a: 'b' }, ['b'])).toEqual([expect.stringContaining('gone')]);
    expect(quizRedirectProblems({ a: 'b' }, ['a'])).toEqual([expect.stringContaining('both merged and gone')]);
    expect(quizRedirectProblems({ 'A b': 'c' }, [])).toEqual([expect.stringContaining('not a quiz slug')]);
    expect(quizRedirectProblems({}, ['x/y'])).toEqual([expect.stringContaining('not a quiz slug')]);
  });
});

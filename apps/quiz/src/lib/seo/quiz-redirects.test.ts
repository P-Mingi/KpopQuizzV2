// O1 audit 03 P1-9 and P2-4: the quiz merge and removal tables are sound, empty today, and drive the redirects, the 410 rewrites and the
// nightly crawl seeds.
import { describe, expect, it } from 'vitest';

import { REDIRECT_SEEDS } from './prod-crawl';
import { QUIZ_GONE, QUIZ_MERGES, quizGoneRewrites, quizMergeRedirects, quizRedirectProblems } from './quiz-redirects';

describe('quiz redirect tables', () => {
  it('are empty until the owner approves a merge or a removal, and sound', () => {
    expect(QUIZ_MERGES).toEqual({});
    expect(QUIZ_GONE).toEqual([]);
    expect(quizRedirectProblems()).toEqual([]);
    expect(quizMergeRedirects()).toEqual([]);
    expect(quizGoneRewrites()).toEqual([]);
    expect(REDIRECT_SEEDS.filter((s) => s.path.startsWith('/q/'))).toEqual([]);
  });

  it('a merge is one permanent hop to the exact successor (the K01 pair as the shape)', () => {
    const merges = { 'this-is-only-for-true-gllits': 'this-is-only-for-true-gllits-2' };
    expect(quizRedirectProblems(merges, [])).toEqual([]);
    expect(quizMergeRedirects(merges)).toEqual([{ source: '/q/this-is-only-for-true-gllits', destination: '/q/this-is-only-for-true-gllits-2', permanent: true }]);
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

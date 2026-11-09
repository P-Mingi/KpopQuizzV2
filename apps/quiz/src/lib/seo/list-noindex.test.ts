// O1 audit 03 P1-5: the list-noindex path is ready and EMPTY until the owner's Search Console exports are triaged.
import { describe, expect, it } from 'vitest';

import { isListNoindex, LIST_NOINDEX_CANDIDATES, LIST_NOINDEX_DECIDED, listRobots } from './list-noindex';

describe('list noindex candidates', () => {
  it('are the six lists of the audit, and not the upgraded popular-this-week', () => {
    expect([...LIST_NOINDEX_CANDIDATES].sort()).toEqual(['/kpop-quiz-2026', '/most-liked', '/new', '/quizzes/popular-this-month', '/quizzes/popular-today', '/trending']);
    expect(LIST_NOINDEX_CANDIDATES as readonly string[]).not.toContain('/quizzes/popular-this-week');
  });

  it('nothing is decided yet: no page changes its head and none leaves the sitemap', () => {
    expect(LIST_NOINDEX_DECIDED).toEqual([]);
    for (const p of LIST_NOINDEX_CANDIDATES) {
      expect(isListNoindex(p), p).toBe(false);
      expect(listRobots(p), p).toEqual({});
    }
  });
});

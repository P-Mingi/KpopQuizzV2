// O1 audit 03 P1-5: the list-noindex path is fed by the triage of the 2026-11-09 Performance export.
import { describe, expect, it } from 'vitest';

import { isListNoindex, LIST_NOINDEX_CANDIDATES, LIST_NOINDEX_DECIDED, listRobots } from './list-noindex';

describe('list noindex candidates', () => {
  it('are the six lists of the audit, and not the upgraded popular-this-week', () => {
    expect([...LIST_NOINDEX_CANDIDATES].sort()).toEqual(['/kpop-quiz-2026', '/most-liked', '/new', '/quizzes/popular-this-month', '/quizzes/popular-today', '/trending']);
    expect(LIST_NOINDEX_CANDIDATES as readonly string[]).not.toContain('/quizzes/popular-this-week');
  });

  it('decided: the candidates with no click in the 2026-11-09 export; /most-liked waits for the owner', () => {
    expect([...LIST_NOINDEX_DECIDED].sort()).toEqual(['/kpop-quiz-2026', '/new', '/quizzes/popular-this-month', '/quizzes/popular-today', '/trending']);
    for (const p of LIST_NOINDEX_DECIDED) {
      expect(isListNoindex(p), p).toBe(true);
      expect(listRobots(p), p).toEqual({ robots: { index: false, follow: true } });
    }
    expect(isListNoindex('/most-liked')).toBe(false);
    expect(listRobots('/most-liked')).toEqual({});
    expect(isListNoindex('/quizzes/popular-this-week')).toBe(false);
  });
});

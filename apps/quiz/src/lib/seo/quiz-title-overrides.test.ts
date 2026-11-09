import { describe, expect, it } from 'vitest';

import { TITLE_MAX } from './quiz-meta';
import { QUIZ_TITLE_FROZEN, QUIZ_TITLE_OVERRIDES, quizPageTitle } from './quiz-title-overrides';

const group = { name: 'ILLIT', slug: 'illit' };

describe('quizPageTitle', () => {
  it('an ordinary quiz gets the group and "quiz" when its title lacks them', () => {
    expect(quizPageTitle('x-1', 'are u a real GLLIT?!!', 3, group)).toBe('are u a real GLLIT? ILLIT quiz, 3 questions');
  });
  it('the lists are lists of unique slugs, the frozen one at most 20 long', () => {
    expect(new Set(QUIZ_TITLE_FROZEN).size).toBe(QUIZ_TITLE_FROZEN.length);
    expect(QUIZ_TITLE_FROZEN.length).toBeLessThanOrEqual(20);
  });
  it('every override fits, has no dash, no typed number of fans and no unreviewed year', () => {
    for (const [slug, t] of Object.entries(QUIZ_TITLE_OVERRIDES)) {
      expect(t.length, slug).toBeLessThanOrEqual(TITLE_MAX);
      expect(t, slug).not.toMatch(/[–—]/);
      expect(t, slug).not.toMatch(/\b20\d\d\b/);
    }
  });
});

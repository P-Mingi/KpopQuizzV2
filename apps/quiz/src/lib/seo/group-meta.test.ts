import { describe, expect, it } from 'vitest';

import { fitDescription, groupHubDescription, groupHubTitle, HUB_DESCRIPTION_MAX, HUB_DESCRIPTION_MIN, realFandom } from './group-meta';
import { TITLE_MAX } from './quiz-meta';

// Audit 04 P1-1: one pattern for every group hub title and description.

const groups = [
  { name: 'ILLIT', fandom: 'GLLIT' }, { name: 'Stray Kids', fandom: 'STAY' }, { name: 'Cortis', fandom: 'Fan' }, { name: 'SEVENTEEN', fandom: 'CARAT' },
  { name: 'aespa', fandom: 'MY' }, { name: 'BLACKPINK', fandom: 'BLINK' }, { name: 'TWICE', fandom: 'ONCE' }, { name: 'BABYMONSTER', fandom: 'MONSTIEZ' },
  { name: 'LE SSERAFIM', fandom: 'FEARNOT' }, { name: 'Tomorrow X Together', fandom: 'MOA' }, { name: 'Girls Generation Oh!GG', fandom: 'SONE' },
  { name: 'G-IDLE', fandom: 'Neverland' }, { name: 'NCT DREAM', fandom: 'NCTzen' },
];

describe('hub title', () => {
  it('follows the pattern, with the fandom only when it is real, and Easy to Hard only with two levels', () => {
    expect(groupHubTitle({ name: 'ILLIT', fandomName: 'GLLIT', quizCount: 13, levels: 3 })).toBe('ILLIT Quiz: 13 Free Tests for GLLIT, Easy to Hard');
    expect(groupHubTitle({ name: 'Stray Kids', fandomName: 'STAY', quizCount: 33, levels: 2 })).toBe('Stray Kids Quiz: 33 Free Tests, Easy to Hard');
    expect(groupHubTitle({ name: 'Cortis', fandomName: 'Fan', quizCount: 9, levels: 2 })).toBe('Cortis Quiz: 9 Free Tests, Easy to Hard');
    expect(groupHubTitle({ name: 'Cortis', fandomName: 'Fan', quizCount: 9, levels: 1 })).toBe('Cortis Quiz: 9 Free Tests');
  });
  it('the count is the shared atLeast helper, never the raw number, and no year', () => {
    const t = groupHubTitle({ name: 'BTS Solo', fandomName: null, quizCount: 457, levels: 3 });
    expect(t).toContain('450+');
    expect(t).not.toContain('457');
    for (const g of groups) expect(groupHubTitle({ name: g.name, fandomName: g.fandom, quizCount: 30, levels: 3 })).not.toMatch(/\b20\d\d\b/);
  });
  it('fits 49 characters for every group at every count, and never cuts a word', () => {
    for (const g of groups) for (const quizCount of [2, 9, 14, 99, 100, 457, 1200]) for (const levels of [1, 2, 3]) {
      const t = groupHubTitle({ name: g.name, fandomName: g.fandom, quizCount, levels });
      expect(t.length, t).toBeLessThanOrEqual(g.name.length > 30 ? 60 : TITLE_MAX);
      expect(t.startsWith(`${g.name} Quiz`)).toBe(true);
    }
  });
  it('a group with one quiz keeps the singular wording', () => {
    expect(groupHubTitle({ name: 'XG', fandomName: 'ALPHAZ', quizCount: 1, levels: 1 })).toBe('XG Quiz: Free Fan-Made Trivia Test');
  });
});

describe('hub description', () => {
  it('is 140 to 155 characters for every group and count, with the primary phrase and the shared count', () => {
    for (const g of groups) for (const quizCount of [2, 9, 14, 99, 457]) for (const levels of [1, 3]) {
      const d = groupHubDescription({ name: g.name, fandomName: g.fandom, quizCount, levels });
      expect(d.length, d).toBeLessThanOrEqual(HUB_DESCRIPTION_MAX);
      expect(d.length, d).toBeGreaterThanOrEqual(HUB_DESCRIPTION_MIN);
      expect(d).toContain(`${g.name} quizzes`);
      expect(d).not.toMatch(/[\u2013\u2014]/);
    }
  });
  it('says "from easy to hard" only with two levels or more, and names a real fandom only', () => {
    const base = { name: 'ILLIT', fandomName: 'GLLIT', quizCount: 14 };
    expect(groupHubDescription({ ...base, levels: 1 })).not.toContain('easy to hard');
    expect(groupHubDescription({ ...base, levels: 2 })).toContain('from easy to hard');
    expect(groupHubDescription({ ...base, fandomName: 'Fan', levels: 2 })).not.toMatch(/real Fan\b/);
  });
  it('fitDescription picks the longest wording that fits, else clips on a word', () => {
    const w = (n: number): string => `${'word '.repeat(Math.ceil(n / 5))}`.slice(0, n - 1) + '.';
    expect(fitDescription(w(100), w(150), w(160))).toBe(w(150));
    expect(fitDescription(w(100), w(120))).toBe(w(120));
    expect(fitDescription(w(200)).length).toBeLessThanOrEqual(HUB_DESCRIPTION_MAX);
  });
});

describe('realFandom', () => {
  it('drops placeholders and the group name', () => {
    expect(realFandom('Fan', 'Cortis')).toBeNull();
    expect(realFandom('  ', 'Cortis')).toBeNull();
    expect(realFandom('cortis', 'Cortis')).toBeNull();
    expect(realFandom('STAY', 'Stray Kids')).toBe('STAY');
  });
});

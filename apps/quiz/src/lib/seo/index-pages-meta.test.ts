import { describe, expect, it } from 'vitest';

import { HUB_DESCRIPTION_MAX, HUB_DESCRIPTION_MIN } from './group-meta';
import { blindtestMeta, groupsIndexMeta, quizzesIndexMeta } from './index-pages-meta';
import { TITLE_MAX } from './quiz-meta';

// Audit 04 P1-3: the three index pages. Counts are formatted by their sources; the pages never type one.

const ok = (m: { title: string; description: string }, primary: RegExp): void => {
  expect(m.title.length, m.title).toBeLessThanOrEqual(TITLE_MAX);
  expect(m.description.length, m.description).toBeLessThanOrEqual(HUB_DESCRIPTION_MAX);
  expect(m.title).toMatch(primary);
  expect(m.description).toMatch(primary);
  expect(`${m.title} ${m.description}`).not.toMatch(/[\u2013\u2014]| - /);
};

describe('/quizzes', () => {
  it('is no longer the home twin: "Browse N K-pop Quizzes by Group and Level"', () => {
    const m = quizzesIndexMeta('450+');
    expect(m.title).toBe('Browse 450+ K-pop Quizzes by Group and Level');
    expect(m.description).toBe('Find your next K-pop quiz: filter 450+ free fan-made quizzes by group, type and level, then sort by trending, newest or most played. No sign-up needed.');
    expect(m.description.length).toBeGreaterThanOrEqual(HUB_DESCRIPTION_MIN);
    ok(m, /K-pop quiz/i);
  });
  it('without stats it says no number at all', () => {
    const m = quizzesIndexMeta(null);
    expect(m.title).toBe('Browse K-pop Quizzes by Group and Level');
    expect(m.description).not.toMatch(/\d/);
  });
  it('the count is identical in the title and the description', () => {
    for (const c of ['34', '450+', '1,200+', '10,000+']) {
      const m = quizzesIndexMeta(c);
      expect(m.title).toContain(c);
      expect(m.description).toContain(c);
      expect(m.title.length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });
});

describe('/blindtest', () => {
  it('title, description (and the H1 "K-pop blind test") share the primary phrase; no "guess the song"', () => {
    const m = blindtestMeta({ songs: '4,200+', groups: '85' });
    expect(m.title).toBe('K-pop Blind Test: 4,200+ Songs from 85 Groups');
    expect(m.description).toContain('4,200+ songs across 85 groups');
    ok(m, /K-pop blind test/i);
    expect(m.title.toLowerCase()).not.toContain('guess the song');
    expect(m.description.length).toBeGreaterThanOrEqual(HUB_DESCRIPTION_MIN);
  });
  it('without stats: no number except the clip length, same primary phrase', () => {
    const m = blindtestMeta(null);
    ok(m, /K-pop blind test/i);
    expect(m.description.replace('10-second', '')).not.toMatch(/\d/);
  });
});

describe('/groups', () => {
  it('names the A to Z list and prints the same count as the page intro', () => {
    const m = groupsIndexMeta(55);
    expect(m.title).toBe('K-pop Groups A to Z: 55 Groups with Quizzes');
    expect(m.description).toContain('55 in all');
    expect(m.description.length).toBeGreaterThanOrEqual(HUB_DESCRIPTION_MIN);
    ok(m, /K-pop groups/i);
  });
  it('without a count: the fallback has no number', () => {
    for (const n of [null, 0]) {
      const m = groupsIndexMeta(n);
      expect(m.title).toBe('K-pop Groups A to Z, by Generation');
      expect(m.description).not.toMatch(/\d/);
    }
  });
});

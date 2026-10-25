import { describe, expect, it } from 'vitest';

import { generateSlug } from '@/lib/utils';

import { avoidHubSlug, hubSlugGroup } from './hub-slugs';

// SEO Mission 2 (rulebook 1.6): a new quiz never takes "{group}-quiz", "{group}-test" or
// "{group}-trivia", the slugs of the hubs' query.

const GROUPS = new Set(['bts', 'stray-kids', 'illit', 'gi-dle']);
const isGroup = (s: string): boolean => GROUPS.has(s);

describe('hubSlugGroup', () => {
  it('reads the group of a hub-shaped slug', () => {
    expect(hubSlugGroup('stray-kids-quiz')).toEqual({ group: 'stray-kids', kind: 'quiz' });
    expect(hubSlugGroup('bts-trivia')).toEqual({ group: 'bts', kind: 'trivia' });
    expect(hubSlugGroup('bts-quiz-2')).toBeNull();
    expect(hubSlugGroup('quiz')).toBeNull();
  });
});

describe('avoidHubSlug', () => {
  it.each([
    ['BTS quiz', 'bts-fan-quiz'],
    ['BTS Test', 'bts-fan-test'],
    ['BTS trivia!', 'bts-fan-trivia'],
    ['Stray Kids quiz', 'stray-kids-fan-quiz'],
    ['(G)I-DLE quiz', 'gi-dle-fan-quiz'],
  ])('%s gets %s', async (title, want) => {
    expect(await avoidHubSlug(generateSlug(title), isGroup)).toBe(want);
  });

  it.each([
    ['BTS ARMY level test', 'bts-army-level-test'],
    ['BTS Wings era quiz', 'bts-wings-era-quiz'],
    ['K-pop quiz', 'k-pop-quiz'],
    ['BTS fan quiz', 'bts-fan-quiz'],
    ['Only real ARMY can pass this BTS quiz', 'only-real-army-can-pass-this-bts-quiz'],
  ])('%s keeps %s', async (title, want) => {
    expect(await avoidHubSlug(generateSlug(title), isGroup)).toBe(want);
  });

  it('accepts an async group check (the create route reads the groups table)', async () => {
    expect(await avoidHubSlug('illit-quiz', async (s) => GROUPS.has(s))).toBe('illit-fan-quiz');
  });
});

// Run O1, lane O1 (lot a, finishing): the words of the hub growth blocks (ways to play, "be the first", templates, thin nudge)
// follow the site. kpop renders what it rendered before this change: the file of __o1_kpop_growth__/ was written ONCE from the
// base commit 894cb7c (the functions as they were, before any "words" parameter), never from the head; a plain run compares.
import { describe, expect, it } from 'vitest';

import { siteConfig } from '@/lib/site/registry';
import { wordsOf } from '@/lib/site/words';

import { firstSignals, hubTemplates, thinNudge, waysToPlay } from './growth';

const FULL = {
  slug: 'stray-kids', name: 'Stray Kids', quizzes: 12, songs: 40,
  nameAll: { href: '/stray-kids-name-all-members', members: 8, perfectPct: 31 },
  whichMember: { href: '/which-stray-kids-member-are-you', results: 5400 },
  thisOrThat: { votes: 1200 }, live: true,
};
const CASES = {
  full: FULL,
  noLive: { ...FULL, live: false },
  one: { ...FULL, quizzes: 1, nameAll: null, thisOrThat: null, whichMember: null, live: false },
  songsOnly: { ...FULL, nameAll: null, whichMember: null, thisOrThat: null, live: false },
  nothing: { ...FULL, quizzes: 0 },
  nullFoot: { ...FULL, nameAll: { href: '/x-name-all-members', members: 5, perfectPct: null }, whichMember: { href: '/w', results: null }, thisOrThat: { votes: null } },
};

function kpopOutput(): unknown {
  return {
    ways: Object.fromEntries(Object.entries(CASES).map(([k, v]) => [k, waysToPlay(v)])),
    first: [
      firstSignals({ name: 'KATSEYE', songs: 12, btPlays: 40 }),
      firstSignals({ name: 'KATSEYE', songs: 0, btPlays: null }),
      firstSignals({ name: 'KATSEYE', songs: 3, btPlays: 4 }),
    ],
    templates: hubTemplates('katseye'),
    nudge: [
      thinNudge({ slug: 'katseye', name: 'KATSEYE', fandom: 'Gabriel', quizzes: 1, plays: 80 }),
      thinNudge({ slug: 'katseye', name: 'KATSEYE', fandom: null, quizzes: 2, plays: 3 }),
      thinNudge({ slug: 'katseye', name: 'KATSEYE', fandom: 'Fans', quizzes: 2, plays: null }),
      thinNudge({ slug: 'katseye', name: 'KATSEYE', fandom: 'ARMY', quizzes: 5, plays: 80 }),
    ],
  };
}

describe('growth blocks, kpop words', () => {
  it('kpop: the outputs of the base commit, byte for byte', async () => {
    await expect(`${JSON.stringify(kpopOutput(), null, 1)}\n`).toMatchFileSnapshot('./__o1_kpop_growth__/growth.json');
  });
});

describe('growth blocks, anime words', () => {
  const W = wordsOf(siteConfig('anime').vocabulary);
  const KPOP_WORD = /\b(members?|songs?|groups?|idols?|bias|k-?pop)\b/i;

  it('the words are the vocabulary of the registry', () => {
    expect(W).toEqual({ member: 'character', members: 'characters', song: 'opening', songs: 'openings' });
  });

  it('ways to play, be the first and templates say character and opening, never member or song', () => {
    const out = [
      ...waysToPlay(FULL, W), ...waysToPlay({ ...FULL, nameAll: null, live: false }, W),
      ...firstSignals({ name: 'Naruto', songs: 12, btPlays: 40 }, W),
      ...hubTemplates('naruto', W),
    ];
    const shown = ['title', 'body', 'foot', 'text', 'sub'] as const;
    const text = out.flatMap((o) => shown.map((k) => (o as unknown as Record<string, unknown>)[k]).filter((v): v is string => typeof v === 'string')).join('\n');
    expect(text).toContain('All 8 characters in 60 seconds.');
    expect(text).toContain('Which character are you?');
    expect(text).toContain('40 Stray Kids openings, ten-second clips.');
    expect(text).toContain('Two Stray Kids openings, pick one.');
    expect(text).toContain('12 Naruto openings are already in the blindtest');
    expect(text).toContain('Characters basics');
    expect(text).toContain('Guess the character from clues');
    expect(text).not.toMatch(KPOP_WORD);
  });
});

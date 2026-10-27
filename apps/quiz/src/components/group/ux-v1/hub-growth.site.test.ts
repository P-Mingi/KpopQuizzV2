// Run O1, lane O1 (lot a, finishing): the growth blocks of a series hub (ways to play, "be the first" with its templates) say
// character and opening, never member or song. kpop keeps its tree: o1-kpop-tree.test.ts compares hub-v12 and hub-v12-empty.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { siteConfig } from '@/lib/site/registry';
import { wordsOf } from '@/lib/site/words';

const data = vi.hoisted(() => ({ ways: null as unknown }));
vi.mock('@/lib/ux-v1/p3/growth-data', () => ({
  getHubGrowth: async () => ({ ways: data.ways, recentPlays: null, btPlays: 40, firstCreator: null, fansPicked: null }),
}));
vi.mock('./loader', () => ({ HubFansPickedLoader: () => null }));

import { HubGrowth } from './hub-growth';

const GROUP = { id: 9, slug: 'naruto', name: 'Naruto', fandom_name: 'Fans' };
const WORDS = wordsOf(siteConfig('anime').vocabulary);
const BANNED = /\b(members?|songs?|groups?|idols?|k-?pop)\b/i;
const text = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ');

describe('HubGrowth, anime words', () => {
  it('a hub with quizzes: the ways to play name the openings and the characters', async () => {
    data.ways = { slug: 'naruto', name: 'Naruto', quizzes: 5, songs: 9, nameAll: null, whichMember: { href: '/which-naruto-character-are-you', results: null }, thisOrThat: null, live: false };
    const html = renderToStaticMarkup(await HubGrowth({ group: GROUP, published: 5, songs: 9, children: null, words: WORDS }));
    expect(text(html)).toContain('9 Naruto openings, ten-second clips.');
    expect(text(html)).toContain('Which character are you?');
    expect(text(html)).not.toMatch(BANNED);
  });

  it('an empty hub: be the first and the templates', async () => {
    data.ways = { slug: 'naruto', name: 'Naruto', quizzes: 0, songs: 9, nameAll: null, whichMember: null, thisOrThat: null, live: false };
    const html = renderToStaticMarkup(await HubGrowth({ group: GROUP, published: 0, songs: 9, children: null, words: WORDS }));
    expect(text(html)).toContain('No Naruto quiz yet. Be the first.');
    expect(text(html)).toContain('9 Naruto openings are already in the blindtest');
    expect(text(html)).toContain('Characters basics');
    expect(text(html)).toContain('Guess the character from clues');
    expect(text(html)).not.toMatch(BANNED);
  });

  it('without words it is the kpop wording', async () => {
    data.ways = { slug: 'bts', name: 'BTS', quizzes: 0, songs: 9, nameAll: null, whichMember: null, thisOrThat: null, live: false };
    const html = renderToStaticMarkup(await HubGrowth({ group: { ...GROUP, slug: 'bts', name: 'BTS' }, published: 0, songs: 9, children: null }));
    expect(text(html)).toContain('9 BTS songs are already in the blindtest');
    expect(text(html)).toContain('Members basics');
  });
});

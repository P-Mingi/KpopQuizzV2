// Run O1, lane O1 (lot a, finishing): the Name them all blocks take the words of the site. kpop renders what it rendered before
// this change (the files of __o1_kpop_name_all__/, written ONCE from the base commit 894cb7c, never from the head: a plain run
// compares).
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { siteAddress } from '@/lib/site/brand';
import { siteConfig } from '@/lib/site/registry';

import { NameAllAbout } from './about';
import { NameAllGame } from './game';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const MEMBERS = ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'Han', 'Felix', 'Seungmin', 'I.N'].map((name) => ({ name, spellings: [name, name.toLowerCase(), `${name} (alt)`] }));
const SET = { group: { id: 7, slug: 'stray-kids', name: 'Stray Kids', fandom: 'STAY' }, members: MEMBERS };
const NAMES = new Map([['bts', 'BTS'], ['twice', 'TWICE'], ['stray-kids', 'Stray Kids']]);
const STATS = { rounds: 1234, perfectPct: 31, namedFirst: 'Bang Chan' };
const about = (stats: typeof STATS | null, wma: string[], bt: string[]): string =>
  renderToString(h(NameAllAbout, { set: SET, stats, wmaSlugs: wma, blindtestSlugs: bt, names: NAMES }));

describe('Name them all, kpop words', () => {
  it('kpop: the about block of the base commit (with stats, links, other groups)', async () => {
    await expect(`${about(STATS, ['stray-kids'], ['stray-kids'])}\n`).toMatchFileSnapshot('./__o1_kpop_name_all__/about-full.html');
  });
  it('kpop: the about block of the base commit (no stats, no extra link)', async () => {
    await expect(`${about(null, [], [])}\n`).toMatchFileSnapshot('./__o1_kpop_name_all__/about-bare.html');
  });
  it('kpop: the game intro of the base commit', async () => {
    const html = renderToString(h(NameAllGame, { group: { slug: 'stray-kids', name: 'Stray Kids' }, members: MEMBERS, stats: STATS, path: '/stray-kids-name-all-members' }));
    await expect(`${html}\n`).toMatchFileSnapshot('./__o1_kpop_name_all__/game-intro.html');
  });
});

describe('Name them all, anime words', () => {
  const A = siteConfig('anime');
  const WORDS = {
    member: A.vocabulary.member, members: A.vocabulary.memberPlural, topic: A.vocabulary.topic, brand: A.brand.name, host: siteAddress(A), origin: A.url,
    acceptedAbout: 'Full names, short names and nicknames are all accepted', acceptedIntro: 'Full names, short names and nicknames all count',
  };
  const BANNED = /\bmembers?\b|Hangul|Stage names|kpopquiz|KpopQuiz|K-?pop|\bgroups?\b/i;
  const text = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ');

  it('the about block says characters, the series, and the brand of the site', () => {
    const html = renderToString(h(NameAllAbout, { set: SET, stats: STATS, wmaSlugs: ['stray-kids'], blindtestSlugs: ['stray-kids'], names: NAMES, words: WORDS }));
    expect(text(html)).not.toMatch(BANNED);
    expect(text(html)).toContain('Stray Kids has 8 characters.');
    expect(text(html)).toContain('More Stray Kids on OtakuQuiz');
    expect(text(html)).toContain('Which Stray Kids character are you?');
    expect(text(html)).toContain('Name the characters of another series');
  });

  it('the game intro says characters and takes no kpop host', () => {
    const html = renderToString(h(NameAllGame, { group: { slug: 'stray-kids', name: 'Stray Kids' }, members: MEMBERS, stats: STATS, path: '/x', words: WORDS }));
    expect(text(html)).not.toMatch(BANNED);
    expect(text(html)).toContain('Name all 8 Stray Kids characters');
    expect(text(html)).toContain('Full names, short names and nicknames all count');
  });
});

// Server-free render of /kpop-games (SEO Mission 2, part A): the very component the route
// renders, fed the shapes lib/games/data.ts returns, checked as HTML. Pins one H1, the answer
// block in the server HTML, the table, the min-gates, the metadata lengths and the JSON-LD
// against the visible text. It does not prove CSS or the real rows (see the PR's live check).

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react');
  return { default: ({ href, children, prefetch: _p, ...rest }: { href: string; children?: React.ReactNode; prefetch?: boolean }) => h('a', { href, ...rest }, children) };
});

import { KpopGamesPage, kpopGamesMetadata, kpopGamesView } from '@/components/games/kpop-games-page';
import { TITLE_MAX } from '@/lib/seo/quiz-meta';

import { ANSWER_MAX_WORDS, ANSWER_MIN_WORDS, DESCRIPTION_MAX, DESCRIPTION_MIN, wordCount } from './registry';

import type { KpopGamesData } from './data';

const STATS = { quizzes: 469, groupsWithQuizzes: 61, groupsListed: 95, songs: 4236, songGroups: 84, plays: 73965, asOf: '2026-10-15T12:00:00Z' };

function data(over: Partial<KpopGamesData> = {}): KpopGamesData {
  const groups = ['bts', 'stray-kids', 'twice', 'aespa', 'ive', 'itzy'].map((slug, i) => ({ slug, name: slug.toUpperCase(), quizzes: 10 - i, plays: 1000 - i }));
  return {
    facts: {
      v1: true,
      v12: true,
      liveOpen: true,
      stats: STATS,
      playlistGroups: 79,
      nameAll: [{ slug: 'bts', name: 'BTS' }, { slug: 'twice', name: 'TWICE' }],
      wma: [{ slug: 'bts', name: 'BTS' }],
      formats: {
        choice: { quizzes: 375, groups: 55, medianQuestions: 10 },
        trueFalse: { quizzes: 70, groups: 30, medianQuestions: 10 },
        clues: { quizzes: 13, groups: 9, medianQuestions: 8 },
      },
    },
    stats: STATS,
    gridGroups: groups,
    playlistSlugs: new Set(groups.map((g) => g.slug)),
    difficulty: {
      'blind-test': { right: 5060, asked: 6340, attempts: 634, since: '2026-10-05T00:00:00Z' },
      'daily-blind-test': { right: 576, asked: 1070, attempts: 107, since: '2026-07-22T00:00:00Z' },
      quizzes: { right: 380169, asked: 535000, attempts: 57259, since: '2026-03-10T00:00:00Z' },
    },
    failed: [],
    ...over,
  };
}

const render = (d: KpopGamesData): string => renderToStaticMarkup(KpopGamesPage({ data: d }));
const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;
const text = (html: string): string => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const lds = (html: string): Array<Record<string, unknown>> =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>);

describe('/kpop-games render', () => {
  it('one H1 "K-pop games", then the answer block, then the table, in that order', () => {
    const html = render(data());
    const v = kpopGamesView(data());
    expect(count(html, /<h1[ >]/g)).toBe(1);
    expect(html).toContain('<h1 class="ux-h1">K-pop games</h1>');
    expect(html).toContain(`<p class="kg-answer">${v.answer}</p>`);
    expect(wordCount(v.answer)).toBeGreaterThanOrEqual(ANSWER_MIN_WORDS);
    expect(wordCount(v.answer)).toBeLessThanOrEqual(ANSWER_MAX_WORDS);
    expect(v.answer).toContain(`${v.games.length} free K-pop games`);
    expect(v.answer).toContain('October 2026');
    const i = (s: string): number => html.indexOf(s);
    expect(i('aria-label="Breadcrumb"')).toBeLessThan(i('<h1'));
    expect(i('<h1')).toBeLessThan(i('kg-answer'));
    expect(i('kg-answer')).toBeLessThan(i('<table'));
  });

  it('the table lists every game, each name a link', () => {
    const html = render(data());
    const { games } = kpopGamesView(data());
    expect(games).toHaveLength(9);
    const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
    expect(count(body, /<tr>/g)).toBe(games.length);
    for (const g of games) expect(body).toContain(`<th scope="row"><a href="${g.href.replace(/&/g, '&amp;')}">${g.name}</a></th>`);
    for (const g of games) expect(html).toContain(`id="${g.id}"`);
  });

  it('the asked sections, with the hardest game from real averages and the group grid', () => {
    const html = render(data());
    const t = text(html);
    for (const h of ['K-pop games to play with friends', 'K-pop games by group', 'Which K-pop game is the hardest?', 'Frequently asked questions', 'What is a K-pop blind test?']) {
      expect(html).toContain(`>${h.replace(/'/g, '&#x27;')}</h2>`);
    }
    expect(t).toContain('Blindtest of the day is the hardest so far: players get 54% of the songs right, over 107 daily scores since July 2026.');
    expect(html).toContain('href="/bts-quiz#games"');
    expect(t).toContain('BTS games');
    expect(t).toContain('Not enough data yet: Ranked blindtest, Live blindtest, Name them all, K-pop true or false.');
    expect(t).toContain('A game is compared only after 100 attempts.');
  });

  it('min-gate: no difficulty data, no grid: those sections are not rendered', () => {
    const html = render(data({ difficulty: null, gridGroups: [] }));
    expect(html).not.toContain('Which K-pop game is the hardest?');
    expect(html).not.toContain('K-pop games by group');
    expect(count(html, /<h1[ >]/g)).toBe(1);
  });

  it('JSON-LD: BreadcrumbList, CollectionPage and its ItemList repeat the visible values', () => {
    const html = render(data());
    const v = kpopGamesView(data());
    const ld = lds(html);
    expect(ld.map((l) => l['@type'])).toEqual(['BreadcrumbList', 'CollectionPage']);
    const crumbs = (ld[0]!.itemListElement as Array<{ name: string; item: string }>);
    expect(crumbs.map((c) => c.name)).toEqual(['Home', 'K-pop games']);
    expect(crumbs[1]!.item).toBe('https://kpopquiz.org/kpop-games');
    const page = ld[1]!;
    expect(page.name).toBe('K-pop games');
    expect(page.description).toBe(v.answer);
    expect(page.url).toBe('https://kpopquiz.org/kpop-games');
    const list = page.mainEntity as { '@type': string; numberOfItems: number; itemListElement: Array<{ position: number; name: string; url: string }> };
    expect(list['@type']).toBe('ItemList');
    expect(list.numberOfItems).toBe(v.games.length);
    expect(list.itemListElement.map((x) => x.name)).toEqual(v.games.map((g) => g.name));
    expect(list.itemListElement.map((x) => x.position)).toEqual(v.games.map((_, i) => i + 1));
    expect(list.itemListElement[0]!.url).toBe('https://kpopquiz.org/blindtest');
  });

  it('metadata: the title and the description fit, the canonical is the clean URL', () => {
    const m = kpopGamesMetadata(data());
    expect(m.title).toBe('K-pop Games: 9 Free Games to Play Online');
    expect(String(m.title).length).toBeLessThanOrEqual(TITLE_MAX);
    const d = String(m.description);
    expect(d.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(m.alternates?.canonical).toBe('/kpop-games');
    // a page with fewer games on another build still fits
    const small = kpopGamesMetadata(data({ facts: { ...data().facts, v1: false, v12: false } }));
    expect(small.title).toBe('K-pop Games: 5 Free Games to Play Online');
    expect(String(small.description).length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(String(small.description).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('no em or en dash anywhere in the page', () => {
    for (const d of [data(), data({ stats: null, facts: { ...data().facts, stats: null } })]) {
      expect(render(d)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});

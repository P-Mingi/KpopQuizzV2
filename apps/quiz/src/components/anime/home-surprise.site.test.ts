// Surprise me on the OtakuQuiz home (owner, 2026-10-29 and 2026-10-30; TWINS row 1, code A8): the hub's component with the anime-h2 prefix,
// drawing from the anime quizzes only (lib/site/hub/data/surprise.ts getSiteSurprisePool, tested in catalog-blocks.test.ts), right under the
// hero buttons and before the quiz of the day. kpopquiz.org's home keeps its tree: no block, and the same entries in the same places.
import { createElement as h, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HubSurpriseCard } from '@/lib/site/hub/data/types';

const pool = vi.hoisted(() => ({ value: null as unknown, calls: [] as string[], throws: false }));
vi.mock('@/lib/site/hub/data/surprise', () => ({
  getSiteSurprisePool: async (site: string) => {
    pool.calls.push(site);
    if (pool.throws) throw new Error('database unreachable');
    return pool.value;
  },
}));

// The home around it (as trend-cover.site.test.ts): the header and the quiz of the day are markers, so their order can be read.
vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null }));
vi.mock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
vi.mock('@/components/home/ux-v1/islands', () => ({ HomeHeader: () => h('header', { className: 'p1-hhead' }), ContinuePlaying: () => null, BlindtestBand: () => null, QotdNote: () => null }));
vi.mock('@/components/home/ux-v1/qotd-row', () => ({ QotdRow: () => h('section', { className: 'p1-qotd' }) }));
vi.mock('@/lib/ux-v1/p1/home-data', () => ({
  getHomeQotd: async () => ({ id: 'qotd-1' }),
  getHomeGroups: async () => ({ groups: [], visibleGroups: 0 }),
  getHomeCommunity: async () => ({ rows: [], verse: null }),
  getHomeBand: async () => ({ date: '2026-10-30', fans: 0 }),
  getHomeLists: async () => ({ trending: [], best: [], fresh: [] }),
}));

const card = (id: string, slug: string, series: string, site: 'kpop' | 'anime' = 'anime', origin = 'https://bunnyverse.org/anime'): HubSurpriseCard => ({
  id, site, siteName: site === 'anime' ? 'OtakuQuiz' : 'KpopQuiz', tile: series.slice(0, 2).toUpperCase(), title: `Quiz ${id}`, group: series, href: `${origin}/q/${slug}`,
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  pool.value = [card('a1', 'naruto-ninja-quiz', 'Naruto'), card('a2', 'one-piece-crew-quiz', 'One Piece')];
  pool.calls = [];
  pool.throws = false;
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function block(): Promise<string> {
  const { AnimeHomeSurprise } = await import('./home-surprise');
  const el = await AnimeHomeSurprise();
  return el ? renderToStaticMarkup(el) : '';
}

describe('the block', () => {
  it('is the hub component under anime-h2, with the anime copy, reading the anime pool', async () => {
    const html = await block();
    expect(pool.calls).toEqual(['anime']);
    expect(html).toMatch(/^<div class="anime-h2-surprise"><div class="anime-h2-lede-row"><p class="anime-h2-lede">Not sure what to play\?<\/p><button type="button" class="anime-h2-ghost anime-h2-btn"><svg [^>]*>[\s\S]*<\/svg>Surprise me<\/button><\/div><\/div>$/);
    expect(html).not.toContain('hub-h2');
    // Nothing is picked before a click: no pick row, no link in the server HTML.
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('<a ');
  });

  it('is left out with no pool, and when the read fails', async () => {
    pool.value = null;
    expect(await block()).toBe('');
    pool.value = [];
    expect(await block()).toBe('');
    pool.throws = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await block()).toBe('');
  });
});

describe('the picks', () => {
  it('link to the quiz page on OtakuQuiz with its base path, name the series, and are anime quizzes only', async () => {
    const { loadAnimeSurprise, toAnimePick } = await import('@/lib/anime/home-surprise');
    expect(toAnimePick(card('a1', 'naruto-ninja-quiz', 'Naruto'), '/anime')).toEqual({
      id: 'a1', tile: 'NA', title: 'Quiz a1', href: '/anime/q/naruto-ninja-quiz', site: 'anime', pickLabel: 'Random pick from Naruto',
    });
    // A dev origin (NEXT_PUBLIC_NET_ORIGINS) gives the same path.
    expect(toAnimePick(card('a2', 'x', 'Bleach', 'anime', 'http://localhost:3063/anime'), '/anime').href).toBe('/anime/q/x');
    pool.value = [card('a1', 'naruto-ninja-quiz', 'Naruto'), card('k1', 'bts-quiz', 'BTS', 'kpop', 'https://kpopquiz.org')];
    const picks = await loadAnimeSurprise('/anime');
    expect(picks.map((p) => p.id)).toEqual(['a1']);
    expect(picks.every((p) => p.site === 'anime' && p.href.startsWith('/anime/q/'))).toBe(true);
  });
});

describe('its place on the home', () => {
  async function home(afterHeader?: React.ReactNode): Promise<React.ReactElement> {
    const { UxHome } = await import('@/components/home/ux-v1/ux-home');
    return UxHome(afterHeader === undefined ? {} : { afterHeader });
  }

  it('sits right under the hero, before the quiz of the day', async () => {
    // The page passes <AnimeHomeSurprise />, an async server component; it is resolved first here (renderToStaticMarkup is synchronous).
    const { AnimeHomeSurprise } = await import('./home-surprise');
    const html = renderToStaticMarkup(await home(await AnimeHomeSurprise()));
    const at = (needle: string): number => html.indexOf(needle);
    expect(at('class="p1-hhead"')).toBeGreaterThan(-1);
    expect(at('class="anime-h2-surprise"')).toBeGreaterThan(at('class="p1-hhead"'));
    expect(at('class="p1-qotd"')).toBeGreaterThan(at('class="anime-h2-surprise"'));
  });

  it('kpopquiz.org passes none: no block, and the same ten entries in the page, the quiz of the day fourth (its page data keeps its bytes)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', '');
    const kpop = await home();
    const html = renderToStaticMarkup(kpop);
    expect(html).not.toContain('anime-h2');
    expect(pool.calls).toEqual([]);
    const children = (kpop.props as { children: unknown[] }).children;
    expect(children).toHaveLength(10);
    const fourth = children[3];
    expect(isValidElement(fourth) && (fourth.type as { name?: string }).name).toBe('QotdRow');
    // With a block, it shares that one entry with the quiz of the day.
    const anime = await home(h('i', { className: 'marker' }));
    expect((anime.props as { children: unknown[] }).children).toHaveLength(10);
  });
});

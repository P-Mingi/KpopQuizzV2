// Run O1, lane O1: the v11 home (header, groups rail title, community rows) speaks the site's genre and shows the kpop
// Discord only on kpop. kpop renders what it rendered before (the files of __o1_kpop_home__/, written once from the base
// commit a22664c, never from the head: a plain run compares); anime names no K-pop, no Discord and no group of kpop.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const RAIL = { slug: 'a-group', name: 'A Group', photo: null, initials: 'AG', quizzes: 3, isNew: false };
vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null }));
vi.mock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
vi.mock('./islands', () => ({ HomeHeader: () => null, ContinuePlaying: () => null, BlindtestBand: () => null, QotdNote: () => null }));
vi.mock('@/lib/ux-v1/p1/home-data', () => ({
  getHomeQotd: async () => null,
  getHomeGroups: async () => ({ groups: [RAIL], visibleGroups: 12 }),
  getHomeCommunity: async () => ({ rows: [], verse: null }),
  getHomeBand: async () => ({ date: '2026-10-20', fans: 5 }),
  getHomeLists: async () => ({ trending: [], best: [], fresh: [] }),
}));

async function onSite<T>(site: 'kpop' | 'anime', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const KPOP_WORDS = /K-?pop|kpopquiz|Discord|BTS|BLACKPINK/i;

describe('HomeHeader (signed out)', () => {
  it('kpop: the markup of the base commit', async () => {
    const { HomeHeader } = await onSite('kpop', () => import('./home-header'));
    await expect(renderToString(h(HomeHeader))).toMatchFileSnapshot('./__o1_kpop_home__/header.html');
  });
  it('anime: its own genre, no K-pop', async () => {
    const { HomeHeader } = await onSite('anime', () => import('./home-header'));
    const html = renderToString(h(HomeHeader));
    expect(html).not.toMatch(KPOP_WORDS);
    expect(html).toMatch(/Anime Quiz/);
    expect(html).toMatch(/Browse anime quizzes/);
  });
});

describe('CommunityRows', () => {
  it('kpop: the markup of the base commit, with the two Discord links', async () => {
    const { CommunityRows } = await onSite('kpop', () => import('./community-rows'));
    await expect(renderToString(h(CommunityRows, { rows: [] }))).toMatchFileSnapshot('./__o1_kpop_home__/community-rows.html');
  });
  it('anime: no Discord line', async () => {
    const { CommunityRows } = await onSite('anime', () => import('./community-rows'));
    expect(renderToString(h(CommunityRows, { rows: [] }))).not.toMatch(KPOP_WORDS);
  });
});

describe('UxHome', () => {
  it('kpop: the markup of the base commit', async () => {
    const { UxHome } = await onSite('kpop', () => import('./ux-home'));
    await expect(renderToString(await UxHome({}))).toMatchFileSnapshot('./__o1_kpop_home__/home.html');
  });
  it('anime: its series rail points at /series and names no kpop word', async () => {
    const { UxHome } = await onSite('anime', () => import('./ux-home'));
    const html = renderToString(await UxHome({}));
    expect(html).not.toMatch(KPOP_WORDS);
    expect([...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1])).toContain('/series');
    expect([...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1])).not.toContain('/groups');
    expect(html).toContain('Series');
  });
});

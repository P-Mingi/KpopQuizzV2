// Run O1, lane O1 (lot a, finishing): the top navigation follows the site's vocabulary. kpop renders the markup it rendered
// before this change (the files of __o1_kpop_nav__/, written ONCE from the base commit 894cb7c, never from the head: a plain
// run compares).
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

let path = '/';
vi.mock('next/navigation', () => ({ usePathname: () => path }));

async function nav(site: 'kpop' | 'anime', pathname: string): Promise<string> {
  path = pathname;
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const { UxNavLinks } = await import('./ux-nav-links');
  return renderToString(h(UxNavLinks));
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PATHS = ['/', '/quizzes', '/groups', '/bts-quiz', '/leaderboard', '/blindtest/group-bts'] as const;

describe('UxNavLinks', () => {
  for (const p of PATHS) {
    it(`kpop ${p}: the markup of the base commit`, async () => {
      const name = p === '/' ? 'home' : p.slice(1).replace(/\//g, '-');
      await expect(`${await nav('kpop', p)}\n`).toMatchFileSnapshot(`./__o1_kpop_nav__/${name}.html`);
    });
  }
});

describe('UxNavLinks, anime', () => {
  it('names its topic (Series, /series), has no Groups link, and shows only doors the site has', async () => {
    const html = await nav('anime', '/series');
    const links = [...html.matchAll(/<a data-nav="([a-z]+)"[^>]*?href="([^"]+)"[^>]*>(?:<svg.*?<\/svg>)?([^<]*)<\/a>/g)].map((m) => [m[1], m[2], m[3]]);
    expect(links).toEqual([
      ['home', '/', 'Home'], ['quizzes', '/quizzes', 'Quizzes'], ['groups', '/series', 'Series'],
      ['blindtest', '/blindtest', 'Blindtest'], ['community', '/community', 'Community'], ['leaderboard', '/leaderboard', 'Leaderboard'],
    ]);
    expect(html).not.toMatch(/\/groups|Groups/);
    expect(html).toMatch(/<a data-nav="groups" aria-current="page" href="\/series"/);
  });

  it('a series hub lights the Series item', async () => {
    expect(await nav('anime', '/one-piece-quiz')).toMatch(/<a data-nav="groups" aria-current="page"/);
  });
});

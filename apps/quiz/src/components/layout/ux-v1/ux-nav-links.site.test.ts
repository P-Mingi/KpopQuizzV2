// Run O1, lane O1 (lot a, finishing): the top navigation follows the site's vocabulary. kpop renders the markup it rendered
// before this change, except the owner request of 2026-11-25 (Groups under Quizzes, Leaderboard under Community: the files of __o1_kpop_nav__/ were rewritten once for it; a plain
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
    it(`kpop ${p}: the markup (the owner tree of 2026-11-25)`, async () => {
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
      ['community', '/community', 'Community'], ['leaderboard', '/leaderboard', 'Leaderboard'],
    ]);
    expect(html).not.toMatch(/blindtest|Blindtest/i);
    expect(html).not.toMatch(/\/groups|Groups/);
    expect(html).toMatch(/<a data-nav="groups" aria-current="page" href="\/series"/);
  });

  it('a series hub lights the Series item', async () => {
    expect(await nav('anime', '/one-piece-quiz')).toMatch(/<a data-nav="groups" aria-current="page"/);
  });
});

describe('UxNavLinks, kpop dropdowns (owner request 2026-11-25)', () => {
  it('Groups sits under the Quizzes toggle and Leaderboard under Community, every link in the server HTML', async () => {
    const html = await nav('kpop', '/');
    expect(html).toMatch(/<div class="ux-nd"><a data-nav="quizzes"[^>]*href="\/quizzes"/);
    expect(html).toMatch(/<button type="button" class="ux-nd-t" aria-expanded="false" aria-controls="[^"]+" aria-label="Quizzes menu"/);
    expect(html).toMatch(/<ul id="[^"]+" class="ux-nd-m"><li><a data-nav="groups"[^>]*href="\/groups"/);
    expect(html).toMatch(/<div class="ux-nd"><a data-nav="community"[^>]*href="\/community"/);
    expect(html).toMatch(/<ul id="[^"]+" class="ux-nd-m"><li><a data-nav="leaderboard"[^>]*href="\/leaderboard"/);
    // No top-level Groups or Leaderboard pill: both only inside a list.
    expect(html.match(/<nav[^>]*>.*<\/nav>/)![0].replace(/<ul .*?<\/ul>/g, '')).not.toMatch(/data-nav="(groups|leaderboard)"/);
  });

  it('a sub-page lights its parent (aria-current true) and its own item (page)', async () => {
    const g = await nav('kpop', '/groups');
    expect(g).toMatch(/<a data-nav="quizzes" aria-current="true"/);
    expect(g).toMatch(/<a data-nav="groups" aria-current="page"/);
    const l = await nav('kpop', '/leaderboard');
    expect(l).toMatch(/<a data-nav="community" aria-current="true"/);
    expect(l).toMatch(/<a data-nav="leaderboard" aria-current="page"/);
    expect(await nav('kpop', '/quizzes')).toMatch(/<a data-nav="quizzes" aria-current="page"/);
  });
});

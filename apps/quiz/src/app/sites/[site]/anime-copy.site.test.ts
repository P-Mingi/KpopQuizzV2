// Run O1, lane O1: the anime pages that were copies of the kpop ones (about, editorial policy, privacy, contact, terms) and
// the 404 of anime and hub name no K-pop, no KpopQuiz, no kpop host, no Discord, no stats page and no mailbox of kpopquiz.org.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/stats/site-stats', async (orig) => ({
  ...(await orig<object>()),
  getPublicStatsOrNull: async () => ({ quizzes: 120, groupsWithQuizzes: 12, groupsListed: 12, songs: 40, songGroups: 6, plays: 900, asOf: '2026-10-20' }),
}));

async function onSite<T>(site: 'anime' | 'hub', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const BANNED = /K-?pop|kpopquiz|Kpop_Verse|Discord/i;

describe('the anime pages that were kpop copies', () => {
  const pages: Array<[string, () => Promise<{ default: () => unknown; metadata?: unknown }>]> = [
    ['about', () => import('./(anime)/about/page') as never],
    ['editorial policy', () => import('./(anime)/editorial-policy/page') as never],
    ['contact', () => import('./(anime)/contact/page') as never],
    ['terms', () => import('./(anime)/terms/page') as never],
    ['privacy', () => import('./privacy/page') as never],
  ];
  for (const [name, load] of pages) {
    it(`${name}: no kpop word, host or mailbox${name === 'contact' ? ' (the Reddit link is the one allowed leftover)' : ''}`, async () => {
      const mod = await onSite('anime', load);
      const out = await (mod.default as () => unknown)();
      const html = renderToString(out as React.ReactElement) + JSON.stringify((mod as { metadata?: unknown }).metadata ?? {});
      const banned = name === 'contact' ? /K-?pop(?!_)|kpopquiz|Discord/i : BANNED;
      expect(html).not.toMatch(banned);
      expect(html).not.toMatch(DASHES);
      if (/mailto:/.test(html)) expect(html).toContain('@otakuquiz.org');
    });
  }

  it('privacy on the hub names FanQuiz and its own mailbox', async () => {
    const mod = await onSite('hub', () => import('./privacy/page'));
    const html = renderToString(mod.default() as React.ReactElement);
    expect(html).toContain('FanQuiz');
    expect(html).toContain('mailto:contact@fanquiz.org');
    expect(html).not.toMatch(/kpopquiz|KpopQuiz/);
  });
});

describe('the 404 of anime and hub', () => {
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: no kpop group, no Discord line, no link to a page it does not have`, async () => {
      const { default: NotFound } = await onSite(site, () => import('./not-found'));
      const html = renderToString(h(NotFound));
      expect(html).not.toMatch(/BTS|BLACKPINK|TWICE|K-?pop|Discord/i);
      const hrefs = [...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs).toContain('/');
      if (site === 'hub') {
        expect(hrefs).toEqual(['/']);
        expect(html).not.toContain('action="/search"');
      } else {
        expect(hrefs).toEqual(['/', '/quizzes', '/create']);
      }
    });
  }
});

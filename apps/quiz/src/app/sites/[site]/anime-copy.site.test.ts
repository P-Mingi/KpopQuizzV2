// Run O1, lane O1: the anime pages that were copies of the kpop ones (about, editorial policy, contact, terms) and
// the 404 of anime and hub name no K-pop, no KpopQuiz, no kpop host, no Discord, no stats page and no mailbox of kpopquiz.org.
// Lot (d), H1 (owner, 2026-10-24): /privacy is no longer one of them. Anime and hub both serve the network policy, which names the
// three sites (KpopQuiz, OtakuQuiz, FanQuiz) and their sign-in methods; its test is the last describe of this file.
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
});

// The network policy (owner, 2026-10-24): the same text on the hub and on the anime build, naming the three sites from the registry,
// with the mailbox of the hub; the only place of the anime build that may name KpopQuiz and Discord (the sign-in methods of KpopQuiz).
describe('the network privacy policy on the hub and on anime', () => {
  it('names the three sites with their domains and the mailbox of the hub, and no dash', async () => {
    const { REGISTRY } = await import('@/lib/site/registry');
    for (const site of ['hub', 'anime'] as const) {
      const mod = await onSite(site, () => import('./privacy/page'));
      const html = renderToString(mod.default() as React.ReactElement);
      for (const s of Object.values(REGISTRY)) {
        expect(html, `${site}: ${s.brand.name}`).toContain(s.brand.name);
        expect(html, `${site}: ${s.domain}`).toContain(s.domain);
      }
      expect(html).toContain('mailto:contact@fanquiz.org');
      expect(html).not.toContain('@kpopquiz.org');
      expect(html).not.toContain('@otakuquiz.org');
      expect(html).not.toMatch(DASHES);
    }
  });

  it('is one text: the anime page and the hub page render the same markup (class prefix aside), canonical on the hub', async () => {
    const hub = await onSite('hub', () => import('./privacy/page'));
    const hubHtml = renderToString(hub.default() as React.ReactElement);
    const anime = await onSite('anime', () => import('./privacy/page'));
    expect(renderToString(anime.default() as React.ReactElement).replace(/anime-h1-/g, 'hub-h1-')).toBe(hubHtml);
    expect(anime.generateMetadata().alternates?.canonical).toBe('https://fanquiz.org/privacy');
    expect(hub.generateMetadata().alternates?.canonical).toBe('https://fanquiz.org/privacy');
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

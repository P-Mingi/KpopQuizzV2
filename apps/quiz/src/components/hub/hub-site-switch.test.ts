// LAUNCH-POLISH-3 A (owner, 2026-11-23): the hub has the site switcher in every header it draws itself. The home's bar is pinned in
// app/sites/[site]/home-hub.test.ts (the top bar); here the bar of the daily games pages (DleChrome, English and French, also the credits page; the
// menu speaks French on the French pages, integrator 2026-11-23),
// the helper, and the source of every hub header: the switcher is the brand, the logo link stays only as the fallback of a build with no model.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 });
vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/lib/verse/visibility', () => ({ verseHidden: () => true }));
vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  const id = (): 'kpop' | 'hub' | 'anime' => (process.env.NEXT_PUBLIC_SITE_ID || 'kpop') as 'kpop' | 'hub' | 'anime';
  return { ...real, get SITE_ID() { return id(); }, get SITE() { return real.REGISTRY[id()]; } };
});

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function chrome(locale: 'en' | 'fr'): Promise<string> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
  const { DleChrome } = await import('./dle/dle-chrome');
  return renderToStaticMarkup(createElement(DleChrome, { locale, enPath: '/daily', current: true, children: createElement('main', null, 'page') }));
}
const bar = (html: string): string => html.slice(html.indexOf('<header class="hub-dle-head"'), html.indexOf('</header>'));

describe('the bar of the daily games pages on the hub', () => {
  it.each(['en', 'fr'] as const)('draws the switcher as the brand (%s): Bunnyverse current, KpopQuiz and OtakuQuiz links, no logo link', async (locale) => {
    const nav = bar(await chrome(locale));
    expect(nav).toContain('data-testid="site-switch"');
    expect(nav).toMatch(/<button[^>]*class="ux-sw-btn"[^>]*>.*Bunny<b class="hub-h2-brand-tail">verse<\/b>/);
    expect(nav).toMatch(/<span class="ux-sw-i" aria-current="page" data-site="hub">.*<b>Bunnyverse<\/b>.*data-end="check"/);
    expect((nav.match(/aria-current="page"/g) ?? []).length).toBe(2); // the row of Bunnyverse and the tab of the current page
    expect(nav).toMatch(/<a class="ux-sw-i" href="\/auth\/passport\/out\?to=kpop&amp;next=%2F&amp;via=f\.pp" rel="nofollow" data-site="kpop">/);
    expect(nav).toMatch(/<a class="ux-sw-i" href="https:\/\/bunnyverse\.org\/anime\/" rel="nofollow" data-site="anime">/);
    expect(nav).not.toContain('class="hub-dle-brand"');
  });
  it.each([
    ['en', 'Switch site', ['K-pop quizzes', 'Anime quizzes', 'Every site, one passport']],
    ['fr', 'Changer de site', ['Quiz K-pop', 'Quiz anime', 'Tous les sites, un seul passeport']],
  ] as const)('speaks the language of the page (%s): the label of the menu and the line under each site name', async (locale, label, lines) => {
    const nav = bar(await chrome(locale));
    expect(nav).toContain(`aria-label="${label}"`);
    expect(nav).toContain(`<p class="ux-sw-lab" aria-hidden="true">${label}</p>`);
    expect([...nav.matchAll(/<small>([^<]*)<\/small>/g)].map((m) => m[1])).toEqual(lines);
    for (const n of ['KpopQuiz', 'OtakuQuiz', 'Bunnyverse']) expect(nav).toContain(`<b>${n}</b>`);
  });
  it('keeps the logo link when there is no model (a build with no switcher)', async () => {
    vi.resetModules();
    const { HubSiteSwitch } = await import('./hub-site-switch');
    const html = renderToStaticMarkup(createElement(HubSiteSwitch, { fallback: createElement('a', { className: 'hub-dle-brand', href: '/' }, 'logo') }));
    expect(html).toBe('<a class="hub-dle-brand" href="/">logo</a>');
  });
});

describe('every header the hub draws itself', () => {
  it('goes through HubSiteSwitch, with the logo link as the fallback', () => {
    for (const f of ['home/home-nav.tsx', 'dle/dle-chrome.tsx']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src, f).toContain('<HubSiteSwitch fallback={(');
      expect(src.match(/<HubSiteSwitch/g), f).toHaveLength(1);
    }
  });
  it('is the only place that draws a hub header: no other file of the hub holds a <header or a logo link of the brand', () => {
    const files = ['home/home-ui.tsx', 'home/home-hero.tsx', 'home/home-footer.tsx', 'dle/dle-game-page.tsx', 'dle/burrow-page.tsx'];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src, f).not.toContain('<header');
      expect(src, f).not.toContain('className="hub-h2-brand"');
      expect(src, f).not.toContain('className="hub-dle-brand"');
    }
  });
});

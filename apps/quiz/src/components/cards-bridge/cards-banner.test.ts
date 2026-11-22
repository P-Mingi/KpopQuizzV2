// Lane KCBANNER: the KpopCards banner is ONE component for the hub home and kpopquiz.org. Flags off on the kpop build: nothing at all; flags on: the
// same markup as the hub (only the href differs), with its own scoped styles (the kpop build reads no sheet of styles/sites/).
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/site/registry', async (original) => {
  const real = await original<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return process.env.NEXT_PUBLIC_SITE_ID || 'kpop'; }, get SITE() { return real.REGISTRY[(process.env.NEXT_PUBLIC_SITE_ID || 'kpop') as 'kpop' | 'hub']; } };
});

const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

function env(vars: Record<string, string>, site: 'kpop' | 'hub' = 'kpop'): void {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the KpopCards banner on kpopquiz.org', () => {
  it('flags off: nothing is drawn and the module is never loaded', async () => {
    for (const vars of [{}, { NET_CARDS: '1' }, { NET_CARDS_BRIDGES: '1' }, { NET_CARDS: '0', NET_CARDS_BRIDGES: '1' }]) {
      env(vars);
      const moduleLoaded = vi.fn();
      vi.doMock('@/components/cards-bridge/cards-banner', () => { moduleLoaded(); throw new Error('loaded'); });
      expect(await (await import('@/lib/cards-bridge/home')).loadCardsHome(), JSON.stringify(vars)).toBeNull();
      expect(moduleLoaded).not.toHaveBeenCalled();
      vi.doUnmock('@/components/cards-bridge/cards-banner');
    }
  });

  it('flags on: the same markup as the hub band, apart from the href (the signed-in jump to bunnyverse.org/kpopcards)', async () => {
    env({ NET_CARDS: '1', NET_CARDS_BRIDGES: '1' });
    const kpop = renderToStaticMarkup((await (await import('@/lib/cards-bridge/home')).loadCardsHome())!);
    env({ NET_CARDS: '1', NET_CARDS_BRIDGES: '1' }, 'hub');
    const { HomeCards } = await import('@/components/hub/home/home-cards');
    const hub = renderToStaticMarkup(h(HomeCards));
    const jump = '/auth/passport/out?to=hub&amp;next=%2Fkpopcards&amp;via=k.pp';
    expect(kpop).toContain(`href="${jump}"`);
    expect(hub).toContain('href="/kpopcards"');
    expect(hub).toBe(`<div class="hub-h2-band hub-h2-wrap">${kpop.replace(jump, '/kpopcards')}</div>`);
    for (const text of ['KpopCards', 'Free K-pop photocards.', 'A free pack every', 'Open KpopCards', 'Holo', 'Gold', 'KPOPCARDS']) expect(kpop, text).toContain(text);
    expect(kpop).toMatch(/<style>[^<]*#kpopcards/);
  });

  it('the styles are self-contained: every selector is under the id, no hub class, no stylesheet token, no dash, no photo', async () => {
    const { CARDS_BANNER_CSS } = await import('./banner-styles');
    const src = readFileSync(new URL('./cards-banner.tsx', import.meta.url), 'utf8');
    for (const line of CARDS_BANNER_CSS.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('@') || t.startsWith('/*') || t.startsWith('}') || t.startsWith('`') || t.includes('CARDS_BANNER_CSS = ')) continue;
      expect(t, t).toMatch(/^#kpopcards/);
    }
    expect(CARDS_BANNER_CSS).not.toMatch(/hub-h2|data-site|var\(--ux-|var\(--hub-/);
    expect(CARDS_BANNER_CSS).not.toMatch(DASH);
    expect(src).not.toMatch(DASH);
    const html = renderToStaticMarkup((await import('./cards-banner')).CardsBanner({ href: '/x' }));
    expect([...html.matchAll(/<img [^>]*>/g)]).toHaveLength(1);
    expect(html).not.toMatch(DASH);
  });
});

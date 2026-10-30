// Run O1, lot (c), lane B6: the server render of the network components. Nothing interactive is in the server HTML: NetLink
// (not editorial) and the "Your sites" section render nothing until /api/n/me answered in the browser.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ux-v1/icon', () => ({ Icon: () => h('i') }));

async function load(site: 'kpop' | 'anime' | 'hub'): Promise<{
  NetLink: typeof import('./net-link').NetLink;
  NetFooterLine: typeof import('./net-footer-line').NetFooterLine;
  NetSitesMenu: typeof import('./net-sites-menu').NetSitesMenu;
}> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return {
    ...(await import('./net-link')),
    ...(await import('./net-footer-line')),
    ...(await import('./net-sites-menu')),
  };
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('NetLink', () => {
  it('editorial: a plain followed <a> to the canonical url, no query, no rel', async () => {
    const { NetLink } = await load('kpop');
    const html = renderToString(h(NetLink, { dst: 'hub', path: '/', linkId: 'foot', editorial: true, className: 'x', children: 'Hub' }));
    expect(html).toBe('<a class="x" href="https://bunnyverse.org/">Hub</a>');
  });
  it('not editorial: nothing in the server HTML', async () => {
    const { NetLink } = await load('kpop');
    expect(renderToString(h(NetLink, { dst: 'anime', path: '/', linkId: 'menu', children: 'Anime' }))).toBe('');
    expect(renderToString(h(NetLink, { dst: 'anime', path: '/', linkId: 'menu', own: true, children: 'Anime' }))).toBe('');
  });
});

describe('NetFooterLine', () => {
  it('kpop and anime: one followed link to the hub home, no query, no K-pop word on anime', async () => {
    for (const site of ['kpop', 'anime'] as const) {
      const { NetFooterLine } = await load(site);
      const html = renderToString(h(NetFooterLine));
      expect([...html.matchAll(/<a\b[^>]*>/g)]).toHaveLength(1);
      expect(html).toContain('href="https://bunnyverse.org/"');
      expect(html).not.toMatch(/rel=|\?|nofollow/);
      expect(html).not.toMatch(/[\u2013\u2014]/);
      if (site === 'anime') expect(html).not.toMatch(/k-?pop/i);
    }
  });
  it('hub: nothing', async () => {
    const { NetFooterLine } = await load('hub');
    expect(renderToString(h(NetFooterLine))).toBe('');
  });
});

describe('NetSitesMenu', () => {
  it('renders nothing on the server', async () => {
    const { NetSitesMenu } = await load('kpop');
    expect(renderToString(h(NetSitesMenu))).toBe('');
  });
});

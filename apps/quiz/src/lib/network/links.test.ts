// Run O1, lot (c), lane B6: bridgeHref and editorialHref (types.ts NetLinkFns), on the kpop and the anime build.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VIA_RE } from './types';

async function links(site: 'kpop' | 'anime'): Promise<typeof import('./links')> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return import('./links');
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('bridgeHref', () => {
  it('is the same-origin jump with the site letter and the link id, in the order of apis.md 2.1', async () => {
    const { bridgeHref } = await links('kpop');
    expect(bridgeHref('anime', '/series/naruto', 'menu')).toBe('/auth/passport/out?to=anime&next=%2Fseries%2Fnaruto&via=k.menu');
    expect((await links('anime')).bridgeHref('kpop', '/', 'ch')).toBe('/auth/passport/out?to=kpop&next=%2F&via=a.ch');
  });
  it('is never an absolute URL and its via code matches VIA_RE', async () => {
    const { bridgeHref } = await links('kpop');
    const href = bridgeHref('hub', '/passport', 'menu');
    expect(href.startsWith('/auth/passport/out?')).toBe(true);
    expect(new URL(href, 'https://x.test').searchParams.get('via')).toMatch(VIA_RE);
  });
  it('turns a path that is not site-relative into the home', async () => {
    const { bridgeHref } = await links('kpop');
    for (const bad of ['//evil.test/x', 'https://evil.test', 'x', '', '/a b', '/\\evil']) {
      expect(bridgeHref('anime', bad, 'menu')).toContain('next=%2F&');
    }
  });
});

describe('editorialHref', () => {
  it('is the canonical url of the target and the path, with no query or fragment', async () => {
    const { editorialHref } = await links('kpop');
    expect(editorialHref('hub', '/')).toBe('https://fanquiz.org/');
    expect(editorialHref('anime', '/about?x=1#y')).toBe('https://otakuquiz.org/about');
  });
});

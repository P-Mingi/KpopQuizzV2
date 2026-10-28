// FandomVerse (review of 2026-10-28): the passport share text names the site by siteAddress of lib/site/brand.ts, so OtakuQuiz
// says fandomverse.org/anime (its domain alone is the hub's address) and kpop says kpopquiz.org as before. The link is the
// passport under the base path of the build.
import { afterEach, describe, expect, it, vi } from 'vitest';

async function tweet(site: 'kpop' | 'anime'): Promise<URL> {
  vi.resetModules();
  if (site !== 'kpop') {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
    vi.stubEnv('__NEXT_ROUTER_BASEPATH', '/anime');
  }
  const open = vi.fn();
  vi.stubGlobal('window', { open, location: { origin: site === 'kpop' ? 'https://kpopquiz.org' : 'https://fandomverse.org' } });
  const { sharePassport } = await import('./share');
  expect(await sharePassport('mika', 'twitter')).toBe('opened');
  return new URL((open.mock.calls[0] as unknown as [string])[0]);
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('sharePassport names the site of the build', () => {
  it('kpop: kpopquiz.org, as before', async () => {
    const u = await tweet('kpop');
    expect(u.searchParams.get('text')).toBe('My K-pop passport on kpopquiz.org');
    expect(u.searchParams.get('url')).toBe('https://kpopquiz.org/u/mika?utm_source=twitter&utm_medium=passport-card');
  });

  it('anime: fandomverse.org/anime, and the link under /anime', async () => {
    const u = await tweet('anime');
    expect(u.searchParams.get('text')).toBe('My K-pop passport on fandomverse.org/anime');
    expect(u.searchParams.get('url')).toBe('https://fandomverse.org/anime/u/mika?utm_source=twitter&utm_medium=passport-card');
  });
});

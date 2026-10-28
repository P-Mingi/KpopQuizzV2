// FandomVerse (lane 1): the base path of a site in a sub-folder of another site's domain, read from its registry url
// (docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md). The registry values of the run are stubbed where the zone matters, so the test
// says the same thing before and after the registry carries https://fandomverse.org/anime.
import { describe, expect, it } from 'vitest';

import {
  basePathOf, joinSiteUrl, originOf, prefixBasePath, stripBasePath, withBasePath, withoutBasePath, zoneChildrenOf,
} from './base-path';
import { REGISTRY, netBase, netOrigin, siteForOrigin } from './registry';

import type { SiteConfig, SiteId } from './types';

/** The registry as FandomVerse sets it: the hub at the root of fandomverse.org, OtakuQuiz in /anime, kpop on its own domain. */
function fandomVerse(): Record<SiteId, SiteConfig> {
  return {
    kpop: REGISTRY.kpop,
    anime: { ...REGISTRY.anime, url: 'https://fandomverse.org/anime', domain: 'fandomverse.org' },
    hub: { ...REGISTRY.hub, url: 'https://fandomverse.org', domain: 'fandomverse.org' },
  };
}

describe('basePathOf and originOf read the one registry value', () => {
  it('a site at the root has no base path; a site in a sub-folder has its folder', () => {
    expect(basePathOf('https://kpopquiz.org')).toBe('');
    expect(basePathOf('https://fandomverse.org')).toBe('');
    expect(basePathOf('https://fandomverse.org/anime')).toBe('/anime');
    expect(originOf('https://fandomverse.org/anime')).toBe('https://fandomverse.org');
    expect(originOf('http://localhost:3024')).toBe('http://localhost:3024');
  });

  it('refuses a url that is not an origin with an optional folder (a trailing slash, a query, upper case)', () => {
    for (const bad of ['https://fandomverse.org/', 'https://fandomverse.org/anime/', 'https://fandomverse.org/anime?x', 'fandomverse.org', 'https://FandomVerse.org']) {
      expect(() => basePathOf(bad), bad).toThrow(/site url/);
    }
  });

  it('every registry url of this branch parses', () => {
    for (const s of Object.values(REGISTRY)) expect(() => basePathOf(s.url), s.id).not.toThrow();
  });
});

describe('joinSiteUrl: absolute URLs of a site path', () => {
  it('kpop and the hub keep today\'s bytes, the home with its slash', () => {
    expect(joinSiteUrl('https://kpopquiz.org', '/')).toBe('https://kpopquiz.org/');
    expect(joinSiteUrl('https://kpopquiz.org', '/q/x')).toBe('https://kpopquiz.org/q/x');
    expect(joinSiteUrl('https://fandomverse.org', '/')).toBe('https://fandomverse.org/');
  });

  it('a site in a sub-folder: its home is the url itself (Next answers /anime/ with a 308), every other path is appended', () => {
    expect(joinSiteUrl('https://fandomverse.org/anime', '/')).toBe('https://fandomverse.org/anime');
    expect(joinSiteUrl('https://fandomverse.org/anime', '/?utm_source=x')).toBe('https://fandomverse.org/anime?utm_source=x');
    expect(joinSiteUrl('https://fandomverse.org/anime', '/q/who-is-l')).toBe('https://fandomverse.org/anime/q/who-is-l');
    expect(joinSiteUrl('http://localhost:3024/anime', '/series')).toBe('http://localhost:3024/anime/series');
  });
});

describe('prefixBasePath and stripBasePath: browser paths and site paths', () => {
  it('prefixes a root-relative path once, the home as the base itself', () => {
    expect(prefixBasePath('/anime', '/api/quiz/1/play')).toBe('/anime/api/quiz/1/play');
    expect(prefixBasePath('/anime', '/')).toBe('/anime');
    expect(prefixBasePath('/anime', '/?q=1')).toBe('/anime?q=1');
    expect(prefixBasePath('/anime', '/anime/q/x')).toBe('/anime/q/x');
    expect(prefixBasePath('/anime', '/anime')).toBe('/anime');
    expect(prefixBasePath('/anime', '/anime-mix-quiz')).toBe('/anime/anime-mix-quiz');
  });

  it('leaves alone what is not a root-relative path, and everything when there is no base path', () => {
    for (const p of ['https://fandomverse.org/x', '//evil.example/x', '#top', 'relative', '']) expect(prefixBasePath('/anime', p)).toBe(p);
    expect(prefixBasePath('', '/q/x')).toBe('/q/x');
  });

  it('strips the base path of a browser path, and only of a path inside it', () => {
    expect(stripBasePath('/anime', '/anime/q/x')).toBe('/q/x');
    expect(stripBasePath('/anime', '/anime')).toBe('/');
    expect(stripBasePath('/anime', '/anime?x=1')).toBe('/?x=1');
    expect(stripBasePath('/anime', '/animex')).toBe('/animex');
    expect(stripBasePath('', '/anime/q/x')).toBe('/anime/q/x');
  });

  it('outside a Next build (no inlined base path) the build helpers are the identity, as on kpop and the hub', () => {
    expect(withBasePath('/api/quiz/1/play')).toBe('/api/quiz/1/play');
    expect(withBasePath('/')).toBe('/');
    expect(withoutBasePath('/q/x')).toBe('/q/x');
  });
});

describe('zones of a domain', () => {
  it('the hub of fandomverse.org has OtakuQuiz in its sub-folder; OtakuQuiz and kpopquiz.org have none', () => {
    const r = fandomVerse();
    expect(zoneChildrenOf(r.hub, r).map((s) => s.id)).toEqual(['anime']);
    expect(zoneChildrenOf(r.anime, r)).toEqual([]);
    expect(zoneChildrenOf(r.kpop, r)).toEqual([]);
  });

  it('three sites on three domains (the values before FandomVerse) have no zone', () => {
    const r: Record<SiteId, SiteConfig> = {
      kpop: REGISTRY.kpop,
      anime: { ...REGISTRY.anime, url: 'https://anime.example' },
      hub: { ...REGISTRY.hub, url: 'https://hub.example' },
    };
    for (const id of ['kpop', 'anime', 'hub'] as const) expect(zoneChildrenOf(r[id], r), id).toEqual([]);
  });
});

describe('origins outside production keep a bare origin; the base URL adds the registry sub-folder', () => {
  const PROXY = 'hub=http://localhost:3024,anime=http://localhost:3024';

  it('netBase is the origin of netOrigin and the base path of the registry url', () => {
    for (const id of ['kpop', 'anime', 'hub'] as const) {
      const env = { NEXT_PUBLIC_NET_ORIGINS: PROXY };
      expect(netBase(id, env)).toBe(`${originOf(netOrigin(id, env))}${basePathOf(REGISTRY[id].url)}`);
      expect(netBase(id, { VERCEL_ENV: 'production', NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBe(REGISTRY[id].url);
    }
  });

  it('an origin names the site at the root of its domain, with or without an override (the beacon only asks "a site of the network?")', () => {
    expect(siteForOrigin(REGISTRY.hub.url, {})).toBe('hub');
    // Hub first in the proxy setup: the override of anime is matched with its sub-folder, which an Origin never has.
    expect(siteForOrigin('http://localhost:3024', { NEXT_PUBLIC_NET_ORIGINS: 'hub=http://localhost:3024' })).toBe('hub');
    expect(siteForOrigin('https://evil.example', { NEXT_PUBLIC_NET_ORIGINS: PROXY })).toBeNull();
  });
});

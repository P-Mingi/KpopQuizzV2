// FandomVerse (owner, 2026-10-28; lane 3): the base paths and origins of the sign-in and passport routes. hub is
// https://fandomverse.org, anime https://fandomverse.org/anime (basePath '/anime', same origin), kpop stays kpopquiz.org.
// The topology is given here as a preview deployment (NEXT_PUBLIC_NET_ORIGINS), so the tests hold before and after the
// registry urls move to fandomverse.org; the production answers are pinned against the registry itself.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { basePathOf as basePathOfUrl, originOf } from '@/lib/site/base-path';
import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import { safeReturnTo } from './return-to';
import {
  SITE_BASE_PATH, basePathOf, joinBase, safeAppPath, sameOrigin, siteBase, siteOrigin, siteUrl, stripBase, withBase,
} from './site-base';

const FV = { VERCEL_ENV: 'preview', NEXT_PUBLIC_NET_ORIGINS: 'kpop=https://kpopquiz.org,hub=https://fandomverse.org,anime=https://fandomverse.org' };
const PROD = { VERCEL_ENV: 'production', NEXT_PUBLIC_NET_ORIGINS: FV.NEXT_PUBLIC_NET_ORIGINS };

/** Inputs an attacker controls, in every spelling that has turned a return path into another place before. */
const HOSTILE = [
  'https://fandomverse.org.evil.com/x', 'https://evil.com/fandomverse.org', '//fandomverse.org.evil.com', '//evil.com', '/\\evil.com',
  '\\\\evil.com', '/\t/evil.com', 'javascript:alert(1)', 'data:text/html,x', 'https://fandomverse.org/x', 'https://kpopquiz.org/x',
  '/anime//evil.com', '/anime/\\evil.com', '/anime/../passport', '/%2e%2e/passport', '/anime/%2e%2e/passport', '/anime/.%2e/passport',
  '/..%2f..%2fpassport', '/anime/..', '/./../x', 'fandomverse.org/anime', '', `/${'a'.repeat(2048)}`,
  // dot segments that normalise into a protocol-relative path (security review, 2026-10-28)
  '/.//evil.com', '/a/..//evil.com', '/%2e//evil.com', '/anime/.//evil.com', '/anime/a/..//evil.com', '/anime/%2e//evil.com',
];

describe('the base path of each build', () => {
  it('anime is served under /anime, kpop and the hub at the root', () => {
    expect(SITE_BASE_PATH).toEqual({ kpop: '', anime: '/anime', hub: '' });
    for (const id of SITE_IDS) expect(basePathOf(id)).toBe(SITE_BASE_PATH[id]);
  });

  it('one source: the table equals the base path and origin lib/site/base-path.ts reads from the registry urls', () => {
    // SITE_BASE_PATH is derived inline from the registry urls because this module reaches client bundles (create-funnel),
    // which must not import lib/site/base-path.ts (ARCHITECTURE-FANDOMVERSE.md); this test keeps the two from drifting apart.
    for (const id of SITE_IDS) {
      expect(SITE_BASE_PATH[id]).toBe(basePathOfUrl(REGISTRY[id].url));
      expect(siteOrigin(id, { VERCEL_ENV: 'production' })).toBe(originOf(REGISTRY[id].url));
    }
  });

  it('one source, no second list: SITE_BASE_PATH is read from REGISTRY[id].url, never written out, and never imports base-path.ts', () => {
    const text = readFileSync(new URL('./site-base.ts', import.meta.url), 'utf8');
    const decl = /export const SITE_BASE_PATH\b[\s\S]*?;\n/.exec(text)?.[0] ?? '';
    expect(decl).toContain('REGISTRY[id].url');
    expect(decl).not.toMatch(/['"]\/[a-z]/);
    expect(decl).not.toMatch(/\b(?:kpop|anime|hub)\s*:/);
    expect(text).not.toMatch(/from\s+['"]@\/lib\/site\/base-path['"]/);
  });

  it('withBase: an app path becomes the browser path of the build', () => {
    expect(withBase('anime', '/')).toBe('/anime');
    expect(withBase('anime', '/q/x')).toBe('/anime/q/x');
    expect(withBase('anime', '/?a=1')).toBe('/anime?a=1');
    expect(withBase('anime', '/#top')).toBe('/anime#top');
    expect(withBase('anime', '/login?returnTo=%2Fdaily')).toBe('/anime/login?returnTo=%2Fdaily');
    for (const site of ['kpop', 'hub'] as const) {
      for (const p of ['/', '/q/x', '/?a=1', '/passport#x']) expect(withBase(site, p)).toBe(p);
    }
  });

  it('the /login guest link of a world build: joinBase over safeReturnTo, never protocol-relative', () => {
    for (const raw of ['/.//evil.com', '/a/..//evil.com', '/%2e//evil.com', '//evil.com', '/\\evil.com']) {
      expect(joinBase('/anime', safeReturnTo(raw))).toBe('/anime');
      expect(joinBase('', safeReturnTo(raw))).toBe('/');
    }
    expect(joinBase('/anime', safeReturnTo('/daily'))).toBe('/anime/daily');
  });

  it('joinBase fails closed: anything that is not a same-site path answers the home of the build', () => {
    for (const bad of ['', 'x', '//evil.com', '/\\evil.com', 'https://evil.com']) {
      expect(joinBase('/anime', bad)).toBe('/anime');
      expect(joinBase('', bad)).toBe('/');
    }
  });

  it('stripBase: a browser path inside the base becomes an app path, any other path is left as it is', () => {
    expect(stripBase('anime', '/anime')).toBe('/');
    expect(stripBase('anime', '/anime/q/x')).toBe('/q/x');
    expect(stripBase('anime', '/anime?a=1')).toBe('/?a=1');
    expect(stripBase('anime', '/anime#h')).toBe('/#h');
    expect(stripBase('anime', '/animex')).toBe('/animex');
    expect(stripBase('anime', '/anime-quiz')).toBe('/anime-quiz');
    expect(stripBase('anime', '/q/x')).toBe('/q/x');
    expect(stripBase('hub', '/anime/q/x')).toBe('/anime/q/x');
    expect(stripBase('kpop', '/anime')).toBe('/anime');
  });

  it('withBase(stripBase(p)) is p for every browser path inside /anime, and stripBase(withBase(p)) is p for every app path', () => {
    for (const p of ['/anime', '/anime/q/x', '/anime?a=1', '/anime#h', '/anime/x?y=1#z']) expect(withBase('anime', stripBase('anime', p))).toBe(p);
    for (const p of ['/', '/q/x', '/?a=1', '/#h', '/x?y=1#z', '/anime-mix-quiz']) expect(stripBase('anime', withBase('anime', p))).toBe(p);
  });
});

describe('safeAppPath: the return path of a sign-in or a jump', () => {
  it('keeps a same-site path as an app path, with its query and fragment; a browser path of anime loses its base', () => {
    expect(safeAppPath('/daily?a=1#t', '/', 'anime')).toBe('/daily?a=1#t');
    expect(safeAppPath('/anime/daily?a=1', '/', 'anime')).toBe('/daily?a=1');
    expect(safeAppPath('/anime', '/', 'anime')).toBe('/');
    expect(safeAppPath('/passport', '/', 'hub')).toBe('/passport');
    expect(safeAppPath('/anime/q/x', '/', 'hub')).toBe('/anime/q/x');
  });

  it('on kpop and the hub it answers exactly what safeReturnTo answers (nothing changes there)', () => {
    for (const raw of [...HOSTILE, '/', '/q/x?y=1#z', '/anime', '/anime/q', null, undefined]) {
      expect(safeAppPath(raw, '/f', 'kpop')).toBe(safeReturnTo(raw, '/f', 'kpop'));
      expect(safeAppPath(raw, '/f', 'hub')).toBe(safeReturnTo(raw, '/f', 'hub'));
    }
  });

  it('for every hostile input, the browser path of the anime answer stays on fandomverse.org inside /anime', () => {
    for (const raw of HOSTILE) {
      const browser = withBase('anime', safeAppPath(raw, '/', 'anime'));
      const where = new URL(browser, 'https://fandomverse.org');
      expect(where.origin, raw).toBe('https://fandomverse.org');
      expect(where.pathname === '/anime' || where.pathname.startsWith('/anime/'), `${raw} -> ${browser}`).toBe(true);
    }
  });

  it('for every hostile input, the hub answer stays on fandomverse.org', () => {
    for (const raw of HOSTILE) {
      const browser = withBase('hub', safeAppPath(raw, '/', 'hub'));
      expect(new URL(browser, 'https://fandomverse.org').origin, raw).toBe('https://fandomverse.org');
      expect(browser.startsWith('/') && !browser.startsWith('//')).toBe(true);
    }
  });
});

describe('origins and bases of the FandomVerse topology', () => {
  it('hub https://fandomverse.org, anime https://fandomverse.org/anime, kpop https://kpopquiz.org', () => {
    expect(siteBase('hub', FV)).toBe('https://fandomverse.org');
    expect(siteBase('anime', FV)).toBe('https://fandomverse.org/anime');
    expect(siteBase('kpop', FV)).toBe('https://kpopquiz.org');
    expect(siteOrigin('anime', FV)).toBe('https://fandomverse.org');
    expect(siteUrl('anime', FV, '/auth/callback')).toBe('https://fandomverse.org/anime/auth/callback');
    expect(siteUrl('anime', FV, '/')).toBe('https://fandomverse.org/anime');
    expect(siteUrl('hub', FV, '/passport')).toBe('https://fandomverse.org/passport');
  });

  it('hub and anime share one origin (one cookie jar), kpop has its own', () => {
    expect(sameOrigin('hub', 'anime', FV)).toBe(true);
    expect(sameOrigin('kpop', 'hub', FV)).toBe(false);
    expect(sameOrigin('kpop', 'anime', FV)).toBe(false);
  });

  it('on a production deployment the overrides are ignored: the origin of the registry url, then the basePath, never doubled', () => {
    for (const id of SITE_IDS) {
      expect(siteOrigin(id, PROD)).toBe(new URL(REGISTRY[id].url).origin);
      expect(siteBase(id, PROD)).toBe(`${new URL(REGISTRY[id].url).origin}${SITE_BASE_PATH[id]}`);
    }
    expect(siteBase('anime', PROD).match(/\/anime/g)).toHaveLength(1);
    expect(siteBase('kpop', PROD)).toBe('https://kpopquiz.org');
  });

  it('an override that is not a bare origin is refused loudly (no path, no look-alike smuggled as a base)', () => {
    for (const bad of ['anime=https://evil.com/fandomverse.org', 'anime=https://fandomverse.org/anime', 'hub=fandomverse.org', 'hub=http://fandomverse.org']) {
      expect(() => siteBase('anime', { NEXT_PUBLIC_NET_ORIGINS: bad })).toThrow();
    }
  });
});

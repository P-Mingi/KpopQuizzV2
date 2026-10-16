// Run O1 contract: the route map and the rewrite design (docs/o1/contracts/routes.md).
// The rewrites are resolved with Next's own matcher (getPathMatch, modifyRouteRegex and
// prepareDestination, the calls of next/dist/server/lib/router-utils), so what passes here
// is what `next start` does with the same list.

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';

import { KNOWN_ROUTES, UX_V12_ROUTES, isKnownRouteWith } from '@/lib/route-allowlist';

import { REGISTRY } from './registry';
import {
  KPOP_DATA_SAMPLES, KPOP_ONLY_SAMPLES, PER_SITE_ROOT_FILES, compileRoutePattern, internalPath, isKnownRouteFor,
  isServedSite, middlewareStep, redirectsFor, rewritesFor, siteStaticParams,
} from './routing';
import { SITE_IDS } from './types';

import type { SiteRewrite } from './routing';
import type { SiteId } from './types';

const APP_DIR = fileURLToPath(new URL('../../app', import.meta.url));
const FLAG_SETS = [
  { v1: false, v12: false }, { v1: true, v12: false }, { v1: false, v12: true }, { v1: true, v12: true },
] as const;

/** Every route of the repo, as check-route-allowlist.mts computes it (dynamic segment = 'sample'). */
function repoRoutes(): string[] {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry === 'page.tsx' || entry === 'route.ts' || entry === 'route.tsx') {
        const segs = relative(APP_DIR, dir).split('/').filter(Boolean)
          .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
          .map((s) => (s.startsWith('[') ? 'sample' : s));
        out.add('/' + segs.join('/'));
      } else if (statSync(full).isDirectory()) {
        walk(full);
      }
    }
  };
  walk(APP_DIR);
  return [...out].sort();
}

/** First matching rewrite, resolved the way Next resolves a custom rewrite. */
function resolve(rewrites: readonly SiteRewrite[], pathname: string): string | null {
  for (const r of rewrites) {
    const match = getPathMatch(r.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (re: string) => modifyRouteRegex(re),
    });
    const params = match(pathname);
    if (params) {
      const { parsedDestination } = prepareDestination({
        appendParamsToQuery: true, destination: r.destination, params, query: {},
      });
      return parsedDestination.pathname;
    }
  }
  return null;
}

describe('kpop: today\'s answers, nothing added', () => {
  const samples = [
    ...repoRoutes(), ...KNOWN_ROUTES, ...UX_V12_ROUTES, ...KPOP_ONLY_SAMPLES, ...KPOP_DATA_SAMPLES,
    '/bts-quiz', '/twice-trivia', '/which-bts-member-are-you', '/bts-name-all-members',
    '/sites/anime', '/sites/kpop', '/unknown-page', '/q', '/create-preview', '/blind-test/x',
  ];

  it('isKnownRouteFor(kpop) equals isKnownRouteWith for every route of the repo and every flag set', () => {
    expect(samples.length).toBeGreaterThan(150);
    for (const flags of FLAG_SETS) {
      for (const p of samples) {
        expect(isKnownRouteFor('kpop', p, flags), `${p} ${JSON.stringify(flags)}`).toBe(isKnownRouteWith(p, flags));
      }
    }
  });

  it('the kpop build adds no rewrite, keeps its redirects and runs today\'s middleware', () => {
    expect(rewritesFor('kpop')).toEqual([]);
    expect(redirectsFor('kpop')).toBeNull();
    for (const p of samples) expect(middlewareStep('kpop', p)).toBe('kpop');
  });

  it('no /sites page is generated or served on kpop', () => {
    expect(siteStaticParams('kpop')).toEqual([]);
    for (const s of SITE_IDS) expect(isServedSite(s, 'kpop')).toBe(false);
  });
});

describe('anime and hub rewrites (Next matcher)', () => {
  const cases: [SiteId, string, string | null][] = [
    ['anime', '/', '/sites/anime'],
    ['anime', '/series', '/sites/anime/series'],
    ['anime', '/one-piece-quiz', '/sites/anime/one-piece-quiz'],
    ['anime', '/bts-quiz', '/sites/anime/bts-quiz'],
    ['anime', '/death-note-trivia', '/sites/anime/death-note-trivia'],
    ['anime', '/one-piece-openings-quiz', '/sites/anime/blindtest/series-one-piece'],
    ['anime', '/which-spy-x-family-character-are-you', '/sites/anime/which-character/spy-x-family'],
    ['anime', '/q/who-is-l', '/sites/anime/q/who-is-l'],
    ['anime', '/name-all/one-piece/straw-hats', '/sites/anime/name-all/one-piece/straw-hats'],
    ['anime', '/guess-the-kpop-idol', '/sites/anime/guess-the-kpop-idol'],
    ['anime', '/verse', '/sites/anime/verse'],
    ['anime', '/verse/bts/studio', '/sites/anime/verse/bts/studio'],
    ['anime', '/sites/anime', '/sites/anime/sites/anime'],
    ['anime', '/robots.txt', '/sites/anime/robots.txt'],
    ['anime', '/sitemap.xml', '/sites/anime/sitemap.xml'],
    ['anime', '/llms.txt', '/sites/anime/llms.txt'],
    ['anime', '/apiary', '/sites/anime/apiary'],
    ['anime', '/authors', '/sites/anime/authors'],
    ['anime', '/api/n/me', null],
    ['anime', '/api', null],
    ['anime', '/auth/confirm', null],
    ['anime', '/auth/passport/out', null],
    ['anime', '/_next/static/chunks/main.js', null],
    ['anime', '/_next/image', null],
    ['anime', '/_vercel/insights/script.js', null],
    ['anime', '/__nextjs_original-stack-frame', null],
    ['anime', '/favicon.ico', null],
    ['anime', '/og-default.png', null],
    ['anime', '/fonts/Pretendard-Regular-latin.woff2', null],
    ['anime', '/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt', null],
    ['anime', '/site.webmanifest', null],
    ['hub', '/', '/sites/hub'],
    ['hub', '/passport', '/sites/hub/passport'],
    ['hub', '/q/anything', '/sites/hub/q/anything'],
    ['hub', '/one-piece-openings-quiz', '/sites/hub/one-piece-openings-quiz'],
    ['hub', '/sites/hub', '/sites/hub/sites/hub'],
    ['hub', '/robots.txt', '/sites/hub/robots.txt'],
    ['hub', '/api/passport/redeem', null],
    ['hub', '/auth/start', null],
  ];

  it.each(cases)('%s %s', (site, path, want) => {
    expect(resolve(rewritesFor(site), path)).toBe(want);
  });

  it('every rewrite source is accepted by Next and every destination is internal', () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const r of rewritesFor(site)) {
        expect(() => getPathMatch(r.source, { strict: true })).not.toThrow();
        expect(r.destination.startsWith(`/sites/${site}`)).toBe(true);
      }
    }
  });

  it('non-kpop builds drop every kpop redirect', () => {
    expect(redirectsFor('anime')).toEqual([]);
    expect(redirectsFor('hub')).toEqual([]);
  });

  it('internalPath', () => {
    expect(internalPath('anime', '/')).toBe('/sites/anime');
    expect(internalPath('hub', '/privacy')).toBe('/sites/hub/privacy');
  });
});

describe('the route map of anime and hub', () => {
  const flags = { v1: true, v12: true };

  it('kpop-only pages are not routes of anime or hub', () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const p of KPOP_ONLY_SAMPLES) {
        expect(isKnownRouteFor(site, p, flags), `${site} ${p}`).toBe(false);
      }
    }
  });

  it('kpop data routes are anime route shapes (data 404) and unknown on the hub', () => {
    for (const p of KPOP_DATA_SAMPLES) {
      expect(isKnownRouteFor('anime', p, flags), p).toBe(true);
      expect(isKnownRouteFor('hub', p, flags), p).toBe(false);
    }
  });

  it('anime routes of BACKLOG 5.1 are known', () => {
    for (const p of [
      '/', '/series', '/one-piece-quiz', '/anime-mix-quiz', '/death-note-trivia', '/q/who-is-l',
      '/which-naruto-character-are-you', '/naruto-openings-quiz', '/blindtest', '/blindtest/series-naruto',
      '/name-all/naruto/akatsuki', '/daily', '/opening-of-the-day', '/create', '/me', '/u/mina_92',
      '/settings', '/settings/profile', '/login', '/onboarding', '/notifications', '/search',
      '/community', '/community/threads/1', '/about', '/editorial-policy', '/privacy', '/terms',
      '/contact', '/admin', '/admin/review', '/auth/confirm', '/auth/arrive', '/api/n/me',
      '/robots.txt', '/sitemap.xml', '/llms.txt',
    ]) {
      expect(isKnownRouteFor('anime', p, flags), p).toBe(true);
    }
  });

  it('hub routes of BACKLOG 5.1 are known, quiz routes are not', () => {
    for (const p of ['/', '/privacy', '/passport', '/u/mina_92', '/settings', '/settings/worlds', '/login', '/directory', '/auth/arrive', '/api/passport/redeem']) {
      expect(isKnownRouteFor('hub', p, flags), p).toBe(true);
    }
    for (const p of ['/q/anything', '/series', '/one-piece-quiz', '/blindtest', '/create', '/daily', '/me', '/search']) {
      expect(isKnownRouteFor('hub', p, flags), p).toBe(false);
    }
  });

  it('every pattern of the registry compiles, and the pattern syntax is strict', () => {
    for (const site of ['anime', 'hub'] as const) {
      const allow = REGISTRY[site].routes.allow;
      expect(Array.isArray(allow)).toBe(true);
      if (Array.isArray(allow)) for (const p of allow) expect(() => compileRoutePattern(p)).not.toThrow();
    }
    expect(compileRoutePattern('/{series}-quiz').test('/one-piece-quiz')).toBe(true);
    expect(compileRoutePattern('/{series}-quiz').test('/a/b-quiz')).toBe(false);
    expect(compileRoutePattern('/admin/**').test('/admin')).toBe(true);
    expect(compileRoutePattern('/admin/**').test('/admin/review/1')).toBe(true);
    expect(compileRoutePattern('/admin/**').test('/administrator')).toBe(false);
    expect(compileRoutePattern('/').test('/')).toBe(true);
    expect(() => compileRoutePattern('admin')).toThrow();
    expect(() => compileRoutePattern('/a/**/b')).toThrow();
  });

  it('per-site root files are the three files the rewrites serve', () => {
    expect(PER_SITE_ROOT_FILES).toEqual(['/robots.txt', '/sitemap.xml', '/llms.txt']);
  });
});

describe('middleware step and the sites/[site] guard', () => {
  it('non-kpop builds pass every public path to the rewrites and refresh the session on the protected ones', () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const p of ['/', '/verse', '/verse/x/studio', '/blind-test/x', '/create-preview', '/unknown', '/q/x']) {
        expect(middlewareStep(site, p), `${site} ${p}`).toBe('pass');
      }
      for (const p of ['/login', '/onboarding', '/settings', '/settings/profile', '/admin', '/admin/review']) {
        expect(middlewareStep(site, p), `${site} ${p}`).toBe('session');
      }
      expect(middlewareStep(site, '/loginx')).toBe('pass');
    }
  });

  it('only the build\'s own site is generated and served', () => {
    expect(siteStaticParams('anime')).toEqual([{ site: 'anime' }]);
    expect(siteStaticParams('hub')).toEqual([{ site: 'hub' }]);
    expect(isServedSite('anime', 'anime')).toBe(true);
    expect(isServedSite('hub', 'anime')).toBe(false);
    expect(isServedSite('kpop', 'anime')).toBe(false);
    expect(isServedSite('anime', 'hub')).toBe(false);
  });
});

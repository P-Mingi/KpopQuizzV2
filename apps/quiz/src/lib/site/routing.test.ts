// Run O1 contract: the route map and the rewrite design (docs/o1/contracts/routes.md).
// The rewrites are resolved with Next's own matcher (getPathMatch, modifyRouteRegex and
// prepareDestination, the calls of next/dist/server/lib/router-utils), so what passes here
// is what `next start` does with the same list.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';

import { KNOWN_ROUTES, UX_V1_ROUTES, UX_V12_ROUTES, isKnownRouteWith } from '@/lib/route-allowlist';

import { REGISTRY } from './registry';
import {
  INDEXNOW_KEY_FILE_RE, KPOP_DATA_SAMPLES, KPOP_ONLY_SAMPLES, PER_SITE_BRAND_FILES, PER_SITE_ROOT_FILES,
  SESSION_PATTERNS, TWIN_SAMPLES, afterFilesFor, brandPath, compileRoutePattern, fallbackFor, internalPath,
  isKnownRouteFor, isServedSite, isSessionPathFor, isSitesPath, middlewareStep, redirectsFor, rewritesFor,
  siteStaticParams,
} from './routing';
import { SITE_IDS } from './types';

import type { SiteRewrite } from './routing';
import type { SiteId } from './types';

const APP_DIR = fileURLToPath(new URL('../../app', import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL('../../../public', import.meta.url));
const MIDDLEWARE_FILE = fileURLToPath(new URL('../../middleware.ts', import.meta.url));
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

/**
 * The path a list of beforeFiles rewrites leaves, resolved the way Next resolves them
 * (next/dist/server/lib/router-utils/resolve-routes.js): every rule in order, once, each one
 * seeing the path the previous ones left, no filesystem check in between (before_files_rewrite
 * routes carry no `check`). null when no rule matched.
 */
function resolve(rewrites: readonly SiteRewrite[], pathname: string): string | null {
  let current = pathname;
  let rewritten = false;
  for (const r of rewrites) {
    const match = getPathMatch(r.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (re: string) => modifyRouteRegex(re),
    });
    const params = match(current);
    if (params) {
      const { parsedDestination } = prepareDestination({
        appendParamsToQuery: true, destination: r.destination, params, query: {},
      });
      current = parsedDestination.pathname ?? current;
      rewritten = true;
    }
  }
  return rewritten ? current : null;
}

describe('kpop: today\'s answers, nothing added', () => {
  const samples = [
    ...repoRoutes(), ...KNOWN_ROUTES, ...UX_V12_ROUTES, ...KPOP_ONLY_SAMPLES, ...KPOP_DATA_SAMPLES, ...TWIN_SAMPLES,
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

  it('the kpop build adds no rewrite, keeps its redirects and runs today\'s middleware but on /sites', () => {
    expect(rewritesFor('kpop')).toEqual([]);
    expect(afterFilesFor('kpop')).toEqual([]);
    expect(fallbackFor('kpop')).toEqual([]);
    expect(redirectsFor('kpop')).toBeNull();
    const outside = samples.filter((p) => !isSitesPath(p));
    expect(outside.length).toBeGreaterThan(150);
    for (const p of outside) expect(middlewareStep('kpop', p), p).toBe('kpop');
    for (const p of ['/sitesx', '/site', '/sites-quiz', '/q/sites']) expect(middlewareStep('kpop', p), p).toBe('kpop');
  });

  it('kpop /sites paths get today\'s allowlist answer, the build guard\'s /sites/ entry aside', () => {
    // On o1/integration a /sites path is unknown to isKnownRoute unless a suffix rule knows it, so
    // the kpop branch rewrites a page path to NOT_FOUND_REWRITE and lets a file path go on. The
    // spike's '/sites/' entry of KNOWN_ROUTES (for the build guard) would let them past that
    // answer: the not-found step keeps it.
    const refused = ['/sites', '/sites/', '/sites/anime', '/sites/kpop', '/sites/hub', '/sites/anime/x/y',
      '/sites/anime/robots.txt', '/sites/x.php', '/sites/which-bts-member-are-you', '/sites/me', '/sites/q/x'];
    for (const p of refused) {
      expect(isSitesPath(p), p).toBe(true);
      expect(middlewareStep('kpop', p), p).toBe('not-found');
    }
    for (const p of ['/sites/anime/bts-quiz', '/sites/twice-trivia', '/sites/a/b/c-quiz']) {
      expect(middlewareStep('kpop', p), p).toBe('kpop');
    }
    // The unlisted first segment and /sites itself are read by no entry but the guard's one.
    for (const r of [...KNOWN_ROUTES, ...UX_V1_ROUTES]) {
      if (r === '/sites/') continue;
      for (const seg of ['/sites', '/o1-unlisted']) {
        expect(r.startsWith(seg) || (seg.startsWith(r) && r.length > 1), `${r} reads ${seg}`).toBe(false);
      }
    }
    // Where the allowlist has no /sites/ entry (o1/F0, o1/integration), the step is exactly its answer.
    if (!(KNOWN_ROUTES as readonly string[]).includes('/sites/')) {
      for (const flags of FLAG_SETS) {
        for (const p of [...refused, '/sites/anime/bts-quiz', '/sites/twice-trivia', ...samples.filter(isSitesPath)]) {
          expect(middlewareStep('kpop', p) === 'not-found', `${p} ${JSON.stringify(flags)}`).toBe(!isKnownRouteWith(p, flags));
        }
      }
    }
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
    ['anime', '/sites', '/sites/anime/sites'],
    ['anime', '/sites/anime/one-piece-openings-quiz', '/sites/anime/sites/anime/one-piece-openings-quiz'],
    ['anime', '/sites/anime/robots.txt', '/sites/anime/sites/anime/robots.txt'],
    ['anime', '/sites/hub/logo.png', '/sites/anime/sites/hub/logo.png'],
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
    ['anime', '/favicon.ico', '/brand/anime/favicon.ico'],
    ['anime', '/og-default.png', '/brand/anime/og-default.png'],
    ['anime', '/apple-touch-icon.png', '/brand/anime/apple-touch-icon.png'],
    ['anime', '/site.webmanifest', '/brand/anime/site.webmanifest'],
    ['anime', '/brand/anime/favicon.ico', null],
    ['anime', '/fonts/Pretendard-Regular-latin.woff2', null],
    ['anime', '/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt', null],
    ['anime', '/x.png', null],
    ['anime', '/q/x.png', null],
    ['hub', '/', '/sites/hub'],
    ['hub', '/passport', '/sites/hub/passport'],
    ['hub', '/q/anything', '/sites/hub/q/anything'],
    ['hub', '/one-piece-openings-quiz', '/sites/hub/one-piece-openings-quiz'],
    ['hub', '/sites/hub', '/sites/hub/sites/hub'],
    ['hub', '/robots.txt', '/sites/hub/robots.txt'],
    ['hub', '/api/passport/redeem', null],
    ['hub', '/auth/start', null],
    ['hub', '/favicon.ico', '/brand/hub/favicon.ico'],
    ['hub', '/site.webmanifest', '/brand/hub/site.webmanifest'],
  ];

  it.each(cases)('%s %s', (site, path, want) => {
    expect(resolve(rewritesFor(site), path)).toBe(want);
  });

  it('every rewrite source is accepted by Next and every destination is the site\'s own', () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const r of [...rewritesFor(site), ...afterFilesFor(site), ...fallbackFor(site)]) {
        expect(() => getPathMatch(r.source, { strict: true })).not.toThrow();
        expect(r.destination.startsWith(`/sites/${site}`) || r.destination.startsWith(`/brand/${site}/`), r.destination).toBe(true);
      }
      // Only the catch-all and the home rule read a public path; the root-file and brand rules
      // read a dotted path the catch-all skips; the pretty rules read the prefixed path.
      for (const r of rewritesFor(site).slice(2)) {
        expect(PER_SITE_ROOT_FILES.includes(r.source) || PER_SITE_BRAND_FILES.includes(r.source) || r.source.startsWith(`/sites/${site}/`), r.source).toBe(true);
      }
      for (const f of PER_SITE_BRAND_FILES) {
        expect(rewritesFor(site).filter((r) => r.source === f), f).toEqual([{ source: f, destination: brandPath(site, f) }]);
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

/**
 * Where a request of an anime or hub build ends, in Next's order (resolve-routes.js of next
 * 16.2.1): the beforeFiles rules, the exact filesystem match (`files`: public files and static
 * handlers), the afterFiles rules, the dynamic routes (`dynamic`, and every /sites/<site> path:
 * the site's pages and [...rest]), then the fallback rules.
 */
function answer(site: SiteId, pathname: string, files: ReadonlySet<string>, dynamic: (p: string) => boolean): string {
  const p1 = resolve(rewritesFor(site), pathname) ?? pathname;
  if (files.has(p1)) return `file ${p1}`;
  const p2 = resolve(afterFilesFor(site), p1);
  if (p2) return `site ${p2}`;
  if (p1.startsWith(`/sites/${site}`)) return `site ${p1}`;
  if (dynamic(p1)) return `route ${p1}`;
  const p3 = resolve(fallbackFor(site), p1);
  return p3 ? `site ${p3}` : `none ${p1}`;
}

describe('after the filesystem: no unmatched path reaches a kpop page (Next matcher)', () => {
  const files = new Set(['/fonts/x.woff2', '/brand/anime/favicon.svg', '/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt', '/auth/confirm']);
  // The dynamic routes a path could meet once no rule took it: the shared API and auth handlers,
  // and the kpop pages the afterFiles rule must keep out of reach ((site)/[slug], (site)/q/[slug]).
  // Framework paths (/_next, /_vercel, the dev overlay) are served before any page route.
  const dynamic = (p: string): boolean => !p.startsWith('/_') && (
    /^\/api\/(?:og|quiz|game|fancard)\/[^/]+$/.test(p) || /^\/api\/n\/me$/.test(p) || /^\/[^/]+$/.test(p) || /^\/q\/[^/]+$/.test(p));
  const cases: [SiteId, string, string][] = [
    ['anime', '/', 'site /sites/anime'],
    ['anime', '/q/who-is-l', 'site /sites/anime/q/who-is-l'],
    ['anime', '/robots.txt', 'site /sites/anime/robots.txt'],
    ['anime', '/x.png', 'site /sites/anime/x.png'],
    ['anime', '/wp-login.php', 'site /sites/anime/wp-login.php'],
    ['anime', '/q/x.png', 'site /sites/anime/q/x.png'],
    ['anime', '/u/a.b', 'site /sites/anime/u/a.b'],
    ['anime', '/api', 'site /sites/anime/api'],
    ['anime', '/auth', 'site /sites/anime/auth'],
    ['anime', '/favicon.ico', 'site /sites/anime/brand/anime/favicon.ico'],
    ['anime', '/apple-touch-icon.png', 'site /sites/anime/brand/anime/apple-touch-icon.png'],
    ['anime', '/favicon.svg', 'file /brand/anime/favicon.svg'],
    ['anime', '/fonts/x.woff2', 'file /fonts/x.woff2'],
    ['anime', '/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt', 'file /4b2f9a7ce8d1465fb0a3e6c95d47128a.txt'],
    ['anime', '/auth/confirm', 'file /auth/confirm'],
    ['anime', '/api/n/me', 'route /api/n/me'],
    ['anime', '/api/og/one-piece-quiz', 'route /api/og/one-piece-quiz'],
    ['anime', '/api/does-not-exist', 'site /sites/anime/api/does-not-exist'],
    ['anime', '/auth/nope', 'site /sites/anime/auth/nope'],
    ['anime', '/sites/anime/x.png', 'site /sites/anime/sites/anime/x.png'],
    ['anime', '/_next/static/chunks/x.js', 'none /_next/static/chunks/x.js'],
    ['anime', '/_vercel/insights/script.js', 'none /_vercel/insights/script.js'],
    ['anime', '/__nextjs_original-stack-frame', 'none /__nextjs_original-stack-frame'],
    ['hub', '/favicon.ico', 'site /sites/hub/brand/hub/favicon.ico'],
    ['hub', '/x.png', 'site /sites/hub/x.png'],
    ['hub', '/admin', 'site /sites/hub/admin'],
    ['hub', '/api/does-not-exist', 'site /sites/hub/api/does-not-exist'],
  ];

  it.each(cases)('%s %s', (site, path, want) => {
    expect(answer(site, path, files, dynamic)).toBe(want);
  });

  it('no static route of the repo has a dotted path that Next\'s filesystem check would serve on anime or hub', () => {
    // The filesystem check runs before afterFiles: a dotted kpop route (a feed.xml, an icon) would
    // answer on anime and hub. Today the only one is kpop's /llms.txt, which rule 3 rewrites first.
    const dotted = repoRoutes().filter((r) => /\.[A-Za-z0-9]{1,12}$/.test(r));
    for (const r of dotted) {
      expect(PER_SITE_ROOT_FILES.includes(r) || r.startsWith('/sites/') || r.startsWith('/api/') || r.startsWith('/auth/'), r).toBe(true);
    }
  });

  it('the afterFiles and fallback rules are the site\'s only, and kpop has none', () => {
    for (const site of ['anime', 'hub'] as const) {
      expect(afterFilesFor(site)).toHaveLength(1);
      expect(fallbackFor(site)).toHaveLength(1);
    }
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

  it('CR-001: the twins of the browse, help and board pages are anime routes and never hub routes', () => {
    for (const p of TWIN_SAMPLES) {
      expect(isKnownRouteFor('anime', p, flags), `anime ${p}`).toBe(true);
      expect(isKnownRouteFor('hub', p, flags), `hub ${p}`).toBe(false);
      expect(isKnownRouteWith(p, flags), `kpop ${p}`).toBe(true);
    }
    expect(KPOP_ONLY_SAMPLES.some((p) => TWIN_SAMPLES.includes(p))).toBe(false);
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

  it('the brand files are every root file of public/ but the IndexNow key files', () => {
    const root = readdirSync(PUBLIC_DIR).filter((f) => statSync(join(PUBLIC_DIR, f)).isFile()).map((f) => `/${f}`);
    const keys = root.filter((f) => INDEXNOW_KEY_FILE_RE.test(f));
    expect(keys).toEqual([`/${REGISTRY.kpop.seo.indexNowKey}.txt`]);
    expect([...PER_SITE_BRAND_FILES].sort()).toEqual(root.filter((f) => !keys.includes(f)).sort());
    expect(new Set(PER_SITE_BRAND_FILES).size).toBe(PER_SITE_BRAND_FILES.length);
    for (const f of PER_SITE_BRAND_FILES) expect(PER_SITE_ROOT_FILES.includes(f), f).toBe(false);
  });

  it('the registry brand paths of anime and hub are brand files of their own folder', () => {
    for (const site of ['anime', 'hub'] as const) {
      const b = REGISTRY[site].brand;
      for (const path of [b.logo, b.favicon, b.ogTemplate, REGISTRY[site].seo.organization.logo]) {
        expect(path.startsWith(`/brand/${site}/`), path).toBe(true);
        expect(PER_SITE_BRAND_FILES.includes(path.slice(`/brand/${site}`.length)), path).toBe(true);
      }
    }
  });
});

describe('middleware step and the sites/[site] guard', () => {
  it('non-kpop builds pass every public path to the rewrites and refresh the session on their own protected ones', () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const p of ['/', '/verse', '/verse/x/studio', '/blind-test/x', '/create-preview', '/unknown', '/q/x',
        '/loginx', '/login/x', '/settingsx', '/adminx', '/sites/anime', '/page-not-found']) {
        expect(middlewareStep(site, p), `${site} ${p}`).toBe('pass');
      }
      for (const p of ['/login', '/settings', '/settings/profile']) {
        expect(middlewareStep(site, p), `${site} ${p}`).toBe('session');
      }
    }
    for (const p of ['/onboarding', '/onboarding/x', '/admin', '/admin/review']) {
      expect(middlewareStep('anime', p), `anime ${p}`).toBe('session');
    }
    // R F0 r1 M1: the hub has no /onboarding and no /admin, so they are its 404s, never a 307 to /login.
    for (const p of ['/onboarding', '/onboarding/x', '/admin', '/admin/network', '/admin/review']) {
      expect(middlewareStep('hub', p), `hub ${p}`).toBe('pass');
    }
  });

  it('a session path is a protected path of today\'s middleware and a route of the site', () => {
    // SESSION_PATTERNS is middleware.ts's needsAuth() without the Verse studio: /login itself and
    // every PROTECTED_PATH_PREFIXES entry with what is below it.
    const src = readFileSync(MIDDLEWARE_FILE, 'utf8');
    const listed = /const PROTECTED_PATH_PREFIXES = \[([^\]]*)\]/.exec(src)?.[1] ?? '';
    const prefixes = [...listed.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(src).toContain("if (pathname === '/login') return true;");
    expect([...SESSION_PATTERNS].sort()).toEqual(['/login', ...prefixes.map((p) => `${p}/**`)].sort());
    const flags = { v1: true, v12: true };
    for (const site of ['anime', 'hub'] as const) {
      for (const p of ['/login', '/onboarding', '/onboarding/x', '/settings', '/settings/x', '/admin', '/admin/x', '/me', '/u/x']) {
        expect(isSessionPathFor(site, p), `${site} ${p}`).toBe(
          SESSION_PATTERNS.some((pat) => compileRoutePattern(pat).test(p)) && isKnownRouteFor(site, p, flags),
        );
      }
    }
    expect(isSessionPathFor('kpop', '/login')).toBe(false);
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

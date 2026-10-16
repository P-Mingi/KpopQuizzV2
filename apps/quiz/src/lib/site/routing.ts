// Run O1 contract o1-contract-v1 (docs/o1/contracts/routes.md). One codebase, three sites.
//
// The design (RUN-O1-PROMPT section 9, override 1): no kpop page file is edited to serve
// another site. Every anime and hub page lives under app/sites/[site]/..., outside the
// (site) group. On a non-kpop build only, next.config.ts adds the beforeFiles rewrites of
// rewritesFor(site), which send every public path to /sites/<site>/... (never /_next, /api,
// /auth or a static file), so a kpop page can never answer there. The kpop build adds no
// rewrite, no redirect change and no middleware step: kpopQuiz.org is byte-identical.
//
// ORCH wires this module into next.config.ts, middleware.ts and route-allowlist.ts once,
// after GH (seo/redirects-exact) merges, with the few lines the spike (branch o1/F0s) shows.
// Until then nothing imports it on the kpop path.
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts and the
// edge middleware import it.

import { isKnownRouteWith } from '../route-allowlist';

import { REGISTRY, SITE_ID } from './registry';

import type { RoutePattern, SiteId } from './types';

/** The folder of every anime and hub page: app/sites/[site]/... */
export const SITES_PREFIX = '/sites';

/**
 * Paths every site shares and no rewrite touches: route handlers under /api and /auth read
 * SITE themselves; /_next, /_vercel and the dev overlay belong to the framework.
 */
export const SHARED_PREFIXES: readonly string[] = ['/api/', '/auth/'];

/**
 * Root files every site serves from its own route under app/sites/[site]/ (a rewrite on
 * non-kpop builds), so app/robots.ts, app/sitemap.ts and app/llms.txt stay kpop-only and
 * untouched.
 */
export const PER_SITE_ROOT_FILES: readonly string[] = ['/robots.txt', '/sitemap.xml', '/llms.txt'];

/**
 * Pretty public URLs of a site that map to a different internal page (anime only today).
 * `source` is the public path; next.config receives it prefixed with /sites/<site> (see
 * rewritesFor). Path-to-regexp syntax: `:name` is one lazy segment chunk.
 */
const PRETTY_REWRITES: Readonly<Record<SiteId, readonly { source: string; internal: string }[]>> = {
  kpop: [],
  anime: [
    // O6: the openings blind test of a series lives at /blindtest/series-{series}.
    { source: '/:series-openings-quiz', internal: '/blindtest/series-:series' },
    // O5: Which character are you.
    { source: '/which-:series-character-are-you', internal: '/which-character/:series' },
  ],
  hub: [],
};

/**
 * The catch-all of a non-kpop build: any first segment except the framework and shared
 * prefixes, and any path whose last segment is not a file name (a dot and an extension), so
 * public files (favicons, fonts, og-default.png, IndexNow key files) are served as they are.
 * A path under /sites is always caught, file name or not, so a direct request to an internal
 * file route (/sites/anime/robots.txt) is a 404 too.
 * Path-to-regexp rules: groups inside a parameter pattern must start with `?`.
 */
export const CATCH_ALL_PATTERN =
  '(?!(?:_next|_vercel|api|auth)(?:/|$))(?!__nextjs)(?!(?!sites(?:/|$))(?:.*/)?[^/]*\\.[A-Za-z0-9]{1,12}$).+';

export interface SiteRewrite {
  readonly source: string;
  readonly destination: string;
}

/** The internal path of a public path on a non-kpop site: '/' becomes '/sites/anime'. */
export function internalPath(site: SiteId, pathname: string): string {
  const base = `${SITES_PREFIX}/${site}`;
  return pathname === '/' ? base : `${base}${pathname}`;
}

/**
 * The beforeFiles rewrites of a build. kpop: none.
 *
 * Next applies beforeFiles rewrites in sequence, each rule once, every rule seeing the path
 * the previous ones left (they do not stop at the first match and do not check the
 * filesystem in between; measured on next dev 16.2.1, recorded in reports/F0.md). So:
 *   1. the catch-all prefixes every public path once with /sites/<site> (a direct
 *      /sites/... request becomes /sites/<site>/sites/..., which only [...rest] matches: 404);
 *   2. '/' (not caught by 1) becomes /sites/<site>;
 *   3. the per-site root files (dotted, so not caught by 1) go to their /sites/<site> routes;
 *   4. the pretty URLs match the already prefixed path.
 */
export function rewritesFor(site: SiteId): readonly SiteRewrite[] {
  if (site === 'kpop') return [];
  const base = `${SITES_PREFIX}/${site}`;
  return [
    { source: `/:path(${CATCH_ALL_PATTERN})`, destination: `${base}/:path` },
    { source: '/', destination: base },
    ...PER_SITE_ROOT_FILES.map((f) => ({ source: f, destination: `${base}${f}` })),
    ...PRETTY_REWRITES[site].map((r) => ({ source: `${base}${r.source}`, destination: `${base}${r.internal}` })),
  ];
}

export interface SiteRedirect {
  readonly source: string;
  readonly destination: string;
  readonly permanent: boolean;
}

/**
 * The redirects of a build: null on kpop (next.config.ts keeps today's list, untouched);
 * an empty list on anime and hub (none of the kpop legacy redirects applies there; a site's
 * own redirects are a CR that adds them here).
 */
export function redirectsFor(site: SiteId): readonly SiteRedirect[] | null {
  return site === 'kpop' ? null : [];
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Compiles a route pattern of routes.md to an anchored RegExp. */
export function compileRoutePattern(pattern: RoutePattern): RegExp {
  if (!pattern.startsWith('/')) throw new Error(`route pattern must start with "/": ${pattern}`);
  if (pattern === '/') return /^\/$/;
  let body = pattern;
  let tail = '';
  if (body.endsWith('/**')) {
    body = body.slice(0, -3);
    tail = '(?:/.*)?';
  }
  if (body.includes('**')) throw new Error(`"**" is allowed only as the last segment: ${pattern}`);
  const parts = body.split(/(\{[a-z][a-zA-Z0-9]*\})/);
  const re = parts
    .map((p) => (/^\{[a-z][a-zA-Z0-9]*\}$/.test(p) ? '[^/]+' : escapeRe(p)))
    .join('');
  return new RegExp(`^${re}${tail}$`);
}

const COMPILED: Partial<Record<SiteId, readonly RegExp[]>> = {};

function patternsOf(site: SiteId): readonly RegExp[] {
  const cached = COMPILED[site];
  if (cached) return cached;
  const allow = REGISTRY[site].routes.allow;
  const list = allow === 'route-allowlist' ? [] : allow.map(compileRoutePattern);
  COMPILED[site] = list;
  return list;
}

export interface RouteFlags {
  readonly v1: boolean;
  readonly v12: boolean;
}

/**
 * The site-aware known-route predicate. kpop: exactly today's answer
 * (isKnownRouteWith of lib/route-allowlist.ts). anime and hub: the shared prefixes, the
 * per-site root files, or a pattern of the site's route map. It answers "is this a route of
 * the site"; data routes (a kpop group slug on /{series}-quiz) still 404 through the scope.
 */
export function isKnownRouteFor(site: SiteId, pathname: string, flags: RouteFlags): boolean {
  if (site === 'kpop') return isKnownRouteWith(pathname, flags);
  if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (PER_SITE_ROOT_FILES.includes(pathname)) return true;
  return patternsOf(site).some((re) => re.test(pathname));
}

/**
 * Paths that open a Supabase session in the middleware on a non-kpop build. Each one is also
 * a kpop needsAuth() path, so the middleware's existing protected branch handles it.
 */
export const SESSION_PREFIXES_NON_KPOP: readonly string[] = ['/login', '/onboarding', '/settings', '/admin'];

/**
 * The middleware step of a build: 'kpop' = run today's middleware unchanged; 'session' = a
 * non-kpop path that needs the session refresh (the existing protected branch); 'pass' = any
 * other non-kpop path, passed straight to the rewrites (never a kpop legacy redirect, the
 * Verse gate or the kpop unknown-route answer).
 */
export function middlewareStep(site: SiteId, pathname: string): 'kpop' | 'session' | 'pass' {
  if (site === 'kpop') return 'kpop';
  return SESSION_PREFIXES_NON_KPOP.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ? 'session'
    : 'pass';
}

/** generateStaticParams of app/sites/[site]: only the current site, nothing on kpop. */
export function siteStaticParams(build: SiteId = SITE_ID): { site: SiteId }[] {
  return build === 'kpop' ? [] : [{ site: build }];
}

/**
 * The layout guard of app/sites/[site]: true only for the build's own site on a non-kpop
 * build. The layout calls notFound() otherwise, so a direct /sites/... request is a 404 on
 * every build (on anime and hub it is also rewritten to /sites/<site>/sites/..., which no page
 * matches).
 */
export function isServedSite(param: string, build: SiteId = SITE_ID): boolean {
  return build !== 'kpop' && param === build;
}

/**
 * kpop pages that must 404 on anime and hub (routes.md, "Must 404"): one sample path per
 * kpop-only page family. Q0's route-leak suite and the spike checks use them. Data routes
 * (a kpop group hub on /{series}-quiz) are not listed: they 404 through the site scope.
 */
export const KPOP_ONLY_SAMPLES: readonly string[] = [
  '/guess-the-kpop-idol', '/guess-the-kpop-song', '/kpop-true-or-false', '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  '/idols-in-kdramas', '/pt', '/pt/faq', '/fr/', '/es/', '/id/', '/verse', '/verse/bts',
  '/live', '/join', '/embed/q/sample', '/g/sample', '/groups', '/group/bts', '/stats',
  '/data/pulse', '/articles', '/news', '/leaderboard', '/creators', '/trending', '/new',
  '/most-liked', '/quizzes', '/trivia', '/personality/bts', '/name-all/bts',
  '/bts-name-all-members', '/which-bts-member-are-you', '/tier-list/l/sample', '/build/sample',
  '/s/sample', '/ux-v1/kit', '/dmca', '/faq', '/banned', '/profile', '/quiz/sample/edit',
];

/**
 * kpop paths shaped like an anime route (/{series}-quiz, /{series}-trivia): known to the anime
 * route map, they 404 there because no anime series has the slug (the [slug] page reads
 * through the site scope). The hub knows none of them.
 */
export const KPOP_DATA_SAMPLES: readonly string[] = [
  '/bts-quiz', '/kpop-demon-hunters-quiz', '/general-kpop-quiz', '/twice-trivia',
];

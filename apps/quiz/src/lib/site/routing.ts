// Run O1 contract o1-contract-v1 (docs/o1/contracts/routes.md). One codebase, three sites.
//
// The design (RUN-O1-PROMPT section 9, override 1): no kpop page file is edited to serve
// another site. Every anime and hub page lives under app/sites/[site]/..., outside the
// (site) group. On a non-kpop build only, next.config.ts adds the rewrites of rewritesFor,
// afterFilesFor and fallbackFor(site), which send every public path to /sites/<site>/...
// (never /_next or a shared public file; /api and /auth only when no handler matched), so a
// kpop page can never answer there. The kpop build adds no rewrite and no redirect change; its
// middleware gets one step, 'not-found' for /sites and below, which gives those paths today's
// unknown-route answer before the kpop branch runs, so kpopquiz.org answers every path as it
// does today (routes.md 1, items 4 and 6).
//
// ORCH wires this module into next.config.ts, middleware.ts and route-allowlist.ts once,
// after GH (seo/redirects-exact) merges, with the few lines the spike (branch o1/F0s) shows.
// Until then nothing imports it on the kpop path.
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts and the
// edge middleware import it.

import { isKnownRouteWith } from '../route-allowlist';

import { REGISTRY, SITE_ID } from './registry';

import { SITE_IDS } from './types';

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

/** Where a site's own brand files live: public/brand/<site>/ (registry.md, routes.md). */
export function brandPath(site: SiteId, file: string): string {
  return `/brand/${site}${file}`;
}

/**
 * Every root file of public/ but the IndexNow key files: the KpopQuiz favicons, touch and app
 * icons, web manifest, default OG image, logos and the K-pop art at the root. Browsers and
 * crawlers fetch some of them with no link (/favicon.ico, /apple-touch-icon.png), so on anime
 * and hub each of these root paths answers the site's own file of the same name in
 * public/brand/<site>/ (a beforeFiles rewrite), or the site's 404 while that file does not
 * exist: never kpop's bytes. contract.test.ts proves the list is the root of public/ minus the
 * key files, so a root file added later must join it.
 */
export const PER_SITE_BRAND_FILES: readonly string[] = [
  '/favicon.ico', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png',
  '/android-chrome-192x192.png', '/android-chrome-512x512.png', '/site.webmanifest', '/og-default.png',
  '/logo-96.png', '/logo-192.png', '/logo-512.png', '/logo-primary.svg', '/verse-favicon.svg',
  '/blindtest-header.jpg', '/rabbit-source.webp',
];

/** An IndexNow key file at the root of public/ (one per site, `/<seo.indexNowKey>.txt`). */
export const INDEXNOW_KEY_FILE_RE = /^\/[0-9a-f]{32}\.txt$/;

/** The root path of the IndexNow key file of `site`, or null when the site has no key. */
export function indexNowKeyFile(site: SiteId): string | null {
  const key = REGISTRY[site].seo.indexNowKey;
  return key === null ? null : `/${key}.txt`;
}

/**
 * Every key file sits in public/, so every build would serve all three (a key only proves control of the host
 * that lists it, but a site must answer its own and no other: owner decision, lane L1). These beforeFiles
 * rewrites send the key file of each OTHER site to `/sites/<site>/<key>.txt`: on anime and hub that is the site's own
 * [...rest] page (its 404), on kpop the layout guard of app/sites/[site] (404 on every build). The rewrite runs
 * before the filesystem check, so the public file is never reached. rewritesFor adds them on anime and hub; the
 * kpop build adds them in next.config.ts (docs/o1/requests/L1.md, the patch), nothing else changes there.
 */
export function keyFileBlocksFor(site: SiteId): readonly SiteRewrite[] {
  const out: SiteRewrite[] = [];
  for (const other of SITE_IDS) {
    const file = other === site ? null : indexNowKeyFile(other);
    if (file !== null) out.push({ source: file, destination: `${SITES_PREFIX}/${site}${file}` });
  }
  return out;
}

/**
 * Pretty public URLs of a site that map to a different internal page (anime only today).
 * `source` is the public path; next.config receives it prefixed with /sites/<site> (see
 * rewritesFor). Path-to-regexp syntax: `:name` is one lazy segment chunk.
 */
const PRETTY_REWRITES: Readonly<Record<SiteId, readonly { source: string; internal: string }[]>> = {
  kpop: [],
  anime: [
    // O6: the openings quiz of a series is served by the page of /blindtest/series-{series}. That internal path is no public route:
    // BLOCKED_PUBLIC below sends a request to /blindtest to the site's 404 before this rule can reach it.
    { source: '/:series-openings-quiz', internal: '/blindtest/series-:series' },
    // O5: Which character are you.
    { source: '/which-:series-character-are-you', internal: '/which-character/:series' },
  ],
  hub: [],
};

/**
 * Public paths a site answers with its own 404 though a page file serves them internally (anime only: owner, 2026-10-26, OtakuQuiz drops the
 * blind test; the openings quiz pages stay and are served by the /blindtest/series-{series} file, reached only through the pretty rule).
 * A path `P` here, and every path below it, is sent to `/sites/<site>/gone`, which no page matches, so [...rest] answers 404.
 */
const BLOCKED_PUBLIC: Readonly<Record<SiteId, readonly string[]>> = {
  kpop: [],
  anime: ['/blindtest'],
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
 *   3b. the root brand files (dotted too) go to the site's public/brand/<site>/ file;
 *   3c. the key files of the other sites (dotted too) go to the site's own 404 (keyFileBlocksFor);
 *   3d. the blocked public paths (BLOCKED_PUBLIC) match the prefixed path and go to the site's own 404, before the pretty URLs
 *       can send an openings quiz to the internal file under the same folder;
 *   4. the pretty URLs match the already prefixed path.
 * A dotted path these rules leave (a shared public file, or none) then meets Next's filesystem
 * check, and what that check does not serve meets afterFilesFor before any dynamic route.
 */
export function rewritesFor(site: SiteId): readonly SiteRewrite[] {
  if (site === 'kpop') return [];
  const base = `${SITES_PREFIX}/${site}`;
  return [
    { source: `/:path(${CATCH_ALL_PATTERN})`, destination: `${base}/:path` },
    { source: '/', destination: base },
    ...PER_SITE_ROOT_FILES.map((f) => ({ source: f, destination: `${base}${f}` })),
    ...PER_SITE_BRAND_FILES.map((f) => ({ source: f, destination: brandPath(site, f) })),
    ...keyFileBlocksFor(site),
    ...BLOCKED_PUBLIC[site].flatMap((p) => [
      { source: `${base}${p}`, destination: `${base}/gone` },
      { source: `${base}${p}/:rest*`, destination: `${base}/gone` },
    ]),
    ...PRETTY_REWRITES[site].map((r) => ({ source: `${base}${r.source}`, destination: `${base}${r.internal}` })),
  ];
}

/**
 * The afterFiles pattern of a non-kpop build: any path but the framework's, /sites (rewritten
 * already) and the /api/ and /auth/ handlers. Next checks afterFiles rewrites after the exact
 * filesystem match (public files, static routes) and before every dynamic route
 * (resolve-routes.js of next 16.2.1: check_fs, then afterFiles, then the dynamic routes), so a
 * path the beforeFiles rules leave and no public file serves (/x.png, /wp-login.php, /q/x.png,
 * a missing brand file, a bare /api) reaches the site's [...rest] page and its own 404, never a
 * kpop dynamic page such as (site)/[slug] or (site)/q/[slug].
 */
export const AFTER_FILES_PATTERN = '(?!(?:_next|_vercel|sites)(?:/|$))(?!(?:api|auth)/)(?!__nextjs).+';

/** The afterFiles rewrites of a build. kpop: none. */
export function afterFilesFor(site: SiteId): readonly SiteRewrite[] {
  if (site === 'kpop') return [];
  return [{ source: `/:path(${AFTER_FILES_PATTERN})`, destination: `${SITES_PREFIX}/${site}/:path` }];
}

/**
 * The fallback rewrites of a build. kpop: none. Next checks them after every dynamic route, so
 * the /api/ and /auth/ handlers (static or dynamic) answer first, and a path under /api/ or
 * /auth/ that none of them serves gets the site's 404 instead of the root one.
 */
export function fallbackFor(site: SiteId): readonly SiteRewrite[] {
  if (site === 'kpop') return [];
  return [{ source: '/:path((?:api|auth)/.+)', destination: `${SITES_PREFIX}/${site}/:path` }];
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
 * The paths of today's needsAuth() in middleware.ts that a non-kpop site may send to the
 * session branch, as route patterns: /login itself, and /onboarding, /settings and /admin with
 * everything below (the Verse studio is kpop only). A site sends only the paths its own route
 * map also knows (isSessionPathFor): the hub has no /onboarding and no /admin, so those are its
 * 404s and never a redirect to its /login.
 */
export const SESSION_PATTERNS: readonly RoutePattern[] = ['/login', '/onboarding/**', '/settings/**', '/admin/**'];

const SESSION_RES: readonly RegExp[] = SESSION_PATTERNS.map(compileRoutePattern);

/** True when a non-kpop site refreshes the session on this path (both lists know it). */
export function isSessionPathFor(site: SiteId, pathname: string): boolean {
  if (site === 'kpop') return false;
  return SESSION_RES.some((re) => re.test(pathname)) && patternsOf(site).some((re) => re.test(pathname));
}

/** /sites and every path below it: the folder of the anime and hub pages. */
export function isSitesPath(pathname: string): boolean {
  return pathname === SITES_PREFIX || pathname.startsWith(`${SITES_PREFIX}/`);
}

/** A first segment that no entry and no rule of the allowlist knows (routing.test.ts). */
const UNLISTED_FIRST_SEGMENT = '/o1-unlisted';

/**
 * Today's allowlist answer for a /sites path, as if the build guard's '/sites/' entry did not
 * exist: the real predicate on the same path under an unlisted first segment. No other entry or
 * rule of the allowlist reads the first segment of a /sites path (no other entry starts with
 * /sites, the V12 pretty URLs have one segment, the UX routes are root prefixes); the suffix
 * rules (-quiz, -trivia) still apply, so /sites/anime/bts-quiz stays known as it is today.
 */
export function isKnownWithoutSitesEntry(pathname: string): boolean {
  return isKnownRouteWith(`${UNLISTED_FIRST_SEGMENT}${pathname.slice(SITES_PREFIX.length)}`, { v1: true, v12: true });
}

/**
 * The middleware step of a build:
 * - 'kpop': run today's middleware unchanged;
 * - 'not-found': a kpop /sites path that today's allowlist refuses. '/sites/' joins
 *   KNOWN_ROUTES for the build guard only, so the middleware answers these paths before the kpop
 *   branch with that branch's own unknown-route answer (a page path is rewritten to
 *   NOT_FOUND_REWRITE, a file path goes on to Next): the answer they get today. A /sites path the
 *   allowlist knows anyway (a -quiz or -trivia suffix) stays 'kpop', as today;
 * - 'session': a non-kpop path that needs the session refresh (the existing protected branch);
 * - 'pass': any other non-kpop path, passed straight to the rewrites (never a kpop legacy
 *   redirect, the Verse gate or the kpop unknown-route answer).
 */
export type MiddlewareStep = 'kpop' | 'not-found' | 'session' | 'pass';

export function middlewareStep(site: SiteId, pathname: string): MiddlewareStep {
  if (site === 'kpop') return isSitesPath(pathname) && !isKnownWithoutSitesEntry(pathname) ? 'not-found' : 'kpop';
  return isSessionPathFor(site, pathname) ? 'session' : 'pass';
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
 * CR-001 (rule 18) moved the browse, help and board pages that have an anime twin to
 * TWIN_SAMPLES; news, articles, data pages and ranked stay here (code F of TWINS.md).
 * The locale landings are named without a slash (/fr, /es, /id): the kpop allowlist keeps '/fr/' as a prefix, but a request
 * with a trailing slash never reaches a rewrite on any site, Next answers it first with its own 308 to the same path
 * without it (an internal redirect that runs before the middleware and every rewrite; next.config.ts stays untouched).
 */
export const KPOP_ONLY_SAMPLES: readonly string[] = [
  '/guess-the-kpop-idol', '/guess-the-kpop-song', '/kpop-true-or-false', '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  '/idols-in-kdramas', '/pt', '/pt/faq', '/fr', '/es', '/id', '/verse', '/verse/bts',
  '/live', '/join', '/embed/q/sample', '/g/sample', '/groups', '/group/bts', '/stats',
  '/blindtest', '/blindtest/ranked', '/blindtest/series-naruto', '/blindtest/group-bts',
  '/data/pulse', '/data/knowledge-report-2026', '/articles', '/news', '/creators',
  '/personality/bts', '/name-all/bts',
  '/bts-name-all-members', '/which-bts-member-are-you', '/tier-list/l/sample', '/build/sample',
  '/s/sample', '/ux-v1/kit', '/banned', '/profile', '/quiz/sample/edit',
];

/**
 * kpop paths whose anime twin exists (CR-001, TWINS rows 31 to 36): routes of anime, still
 * 404 on the hub (Q0a's leak suite expects 404 for them on hub only).
 */
export const TWIN_SAMPLES: readonly string[] = [
  '/quizzes', '/quizzes/popular-today', '/quizzes/popular-this-week', '/quizzes/popular-this-month',
  '/new', '/most-liked', '/trending', '/trivia', '/faq', '/leaderboard', '/dmca',
];

/**
 * kpop paths shaped like an anime route (/{series}-quiz, /{series}-trivia):
 * known to the anime route map, they 404 there because no anime series has the slug
 * (the [slug] page reads through the site scope). The hub knows none of them. /blindtest/** is not one of them any more:
 * OtakuQuiz has no blind test (owner, 2026-10-26), so it is kpop only (KPOP_ONLY_SAMPLES).
 */
export const KPOP_DATA_SAMPLES: readonly string[] = [
  '/bts-quiz', '/kpop-demon-hunters-quiz', '/general-kpop-quiz', '/twice-trivia',
];

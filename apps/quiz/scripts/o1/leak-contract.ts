// Run O1, lane Q0a: the contract values the leak suite and check-network-links.mts judge by.
//
// Source of truth: F0's site registry and routing module (apps/quiz/src/lib/site/registry.ts and routing.ts,
// contract o1-contract-v1), loaded from the harness's own checkout when they exist there (the gate runs O1's merged
// harness, so a lane under test cannot change its judge). Until F0 merges, the fallback below holds the same frozen
// values, taken from BACKLOG 5.1 ("Route map per site", "Names and identifiers"), and the kpop route list comes
// from lib/route-allowlist.ts. `source` says which one a run used; every report prints it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { KNOWN_ROUTES, UX_V1_ROUTES } from '../../src/lib/route-allowlist';

export type LeakSiteId = 'kpop' | 'anime' | 'hub';
export const LEAK_SITE_IDS: readonly LeakSiteId[] = ['kpop', 'anime', 'hub'];

export interface LeakContract {
  /** 'F0 registry and routing' or 'fallback (BACKLOG 5.1)'. */
  readonly source: string;
  readonly domains: Readonly<Record<LeakSiteId, string>>;
  readonly brands: Readonly<Record<LeakSiteId, string>>;
  readonly devHosts: Readonly<Record<LeakSiteId, string>>;
  /** One sample path per kpop-only page family, per site (each must 404 there). */
  readonly kpopOnlySamples: Readonly<Record<'anime' | 'hub', readonly string[]>>;
  /** kpop data routes shaped like anime routes (/bts-quiz): 404 on anime through the scope, unknown on the hub. */
  readonly kpopDataSamples: readonly string[];
  /** Parameter-free public paths of a site's route map, signed-in pages excluded. */
  readonly staticPaths: Readonly<Record<LeakSiteId, readonly string[]>>;
  /** Is this path a route of the site (the route map, not the data)? */
  isKnownRoute(site: LeakSiteId, pathname: string): boolean;
}

/** apps/quiz of the harness checkout (this file lives in apps/quiz/scripts/o1/). */
export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ROUTE_MAP_FALLBACK: Readonly<Record<'anime' | 'hub', readonly string[]>> = {
  anime: [
    '/', '/series', '/{series}-quiz', '/anime-mix-quiz', '/{series}-trivia', '/q/{slug}',
    '/which-{series}-character-are-you', '/{series}-openings-quiz', '/blindtest/**',
    '/name-all/{series}/{set}', '/daily', '/opening-of-the-day',
    '/create/**', '/me', '/u/{username}', '/settings/**', '/login', '/onboarding/**',
    '/notifications', '/search', '/community/**', '/about', '/editorial-policy', '/privacy',
    '/terms', '/contact', '/admin/**',
  ],
  hub: ['/', '/privacy', '/passport', '/u/{username}', '/settings/**', '/login', '/directory'],
};
const SHARED_PREFIXES = ['/api/', '/auth/'];
const ROOT_FILES = ['/robots.txt', '/sitemap.xml', '/llms.txt'];
/** Pages a signed-out visitor cannot read (they redirect to /login): never part of an anonymous page set. */
const SIGNED_IN = ['/me', '/settings', '/onboarding', '/notifications', '/create', '/admin', '/passport'];
const DATA_SAMPLES_FALLBACK = ['/bts-quiz', '/kpop-demon-hunters-quiz', '/general-kpop-quiz', '/twice-trivia'];

/** Same semantics as F0's compileRoutePattern: {param} is one segment, a trailing /** any subtree. */
export function compilePattern(pattern: string): RegExp {
  if (pattern === '/') return /^\/$/;
  let body = pattern;
  let tail = '';
  if (body.endsWith('/**')) {
    body = body.slice(0, -3);
    tail = '(?:/.*)?';
  }
  const re = body
    .split(/(\{[a-z][a-zA-Z0-9]*\})/)
    .map((p) => (/^\{[a-z][a-zA-Z0-9]*\}$/.test(p) ? '[^/]+' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${re}${tail}$`);
}

/** Parameter-free paths of a route map: '/blindtest/**' gives '/blindtest'. */
export function staticPathsOf(patterns: readonly string[]): string[] {
  return patterns
    .map((p) => (p.endsWith('/**') ? p.slice(0, -3) || '/' : p))
    .filter((p) => !p.includes('{') && !p.includes('*'))
    .filter((p) => !SIGNED_IN.some((s) => p === s || p.startsWith(`${s}/`)));
}

/** One sample path per kpop allowlist prefix (fallback of F0's KPOP_ONLY_SAMPLES). */
export function kpopSamplesFromAllowlist(): string[] {
  const out = new Set<string>();
  for (const r of [...KNOWN_ROUTES, ...UX_V1_ROUTES]) {
    if (r === '/' || SHARED_PREFIXES.includes(r) || ROOT_FILES.includes(r)) continue;
    out.add(r.endsWith('/') ? `${r}sample` : r);
  }
  return [...out].sort();
}

function fallbackContract(): LeakContract {
  const compiled = {
    anime: ROUTE_MAP_FALLBACK.anime.map(compilePattern),
    hub: ROUTE_MAP_FALLBACK.hub.map(compilePattern),
  };
  const isKnownRoute = (site: LeakSiteId, p: string): boolean => {
    if (site === 'kpop') return true;
    if (SHARED_PREFIXES.some((s) => p.startsWith(s)) || ROOT_FILES.includes(p)) return true;
    return compiled[site].some((re) => re.test(p));
  };
  return {
    source: 'fallback (BACKLOG 5.1, lib/route-allowlist.ts)',
    domains: { kpop: 'kpopquiz.org', anime: 'bunnyverse.org/anime', hub: 'bunnyverse.org' },
    brands: { kpop: 'KpopQuiz', anime: 'OtakuQuiz', hub: 'Bunnyverse' },
    devHosts: { kpop: 'kpop.localhost', anime: 'anime.localhost', hub: 'hub.localhost' },
    kpopOnlySamples: {
      anime: kpopSamplesFromAllowlist().filter((p) => !isKnownRoute('anime', p)),
      hub: kpopSamplesFromAllowlist().filter((p) => !isKnownRoute('hub', p)),
    },
    kpopDataSamples: DATA_SAMPLES_FALLBACK,
    staticPaths: { kpop: [], anime: staticPathsOf(ROUTE_MAP_FALLBACK.anime), hub: staticPathsOf(ROUTE_MAP_FALLBACK.hub) },
    isKnownRoute,
  };
}

interface F0Registry {
  REGISTRY: Record<LeakSiteId, { url: string; domain: string; brand: { name: string }; routes: { allow: string | readonly string[] } }>;
}
interface F0Routing {
  KPOP_ONLY_SAMPLES: readonly string[];
  KPOP_DATA_SAMPLES: readonly string[];
  isKnownRouteFor(site: LeakSiteId, pathname: string, flags: { v1: boolean; v12: boolean }): boolean;
}

let cached: Promise<LeakContract> | null = null;

const address = (url: string): string => url.replace(/^https?:\/\//, '');

/** F0's contract when its modules exist in the harness checkout, else the fallback. */
export function loadContract(appDir: string = APP_DIR): Promise<LeakContract> {
  if (cached && appDir === APP_DIR) return cached;
  const p = (async (): Promise<LeakContract> => {
    const reg = path.join(appDir, 'src/lib/site/registry.ts');
    const rout = path.join(appDir, 'src/lib/site/routing.ts');
    if (!fs.existsSync(reg) || !fs.existsSync(rout)) return fallbackContract();
    const r = (await import(pathToFileURL(reg).href)) as F0Registry;
    const m = (await import(pathToFileURL(rout).href)) as F0Routing;
    const allowOf = (s: 'anime' | 'hub'): readonly string[] => {
      const a = r.REGISTRY[s].routes.allow;
      return typeof a === 'string' ? [] : a;
    };
    return {
      source: 'F0 registry and routing (apps/quiz/src/lib/site)',
      // The address of each site (its url without the scheme): bunnyverse.org/anime and bunnyverse.org share a host (2026-10-28).
      domains: { kpop: address(r.REGISTRY.kpop.url), anime: address(r.REGISTRY.anime.url), hub: address(r.REGISTRY.hub.url) },
      brands: { kpop: r.REGISTRY.kpop.brand.name, anime: r.REGISTRY.anime.brand.name, hub: r.REGISTRY.hub.brand.name },
      devHosts: { kpop: 'kpop.localhost', anime: 'anime.localhost', hub: 'hub.localhost' },
      kpopOnlySamples: { anime: [...m.KPOP_ONLY_SAMPLES], hub: [...m.KPOP_ONLY_SAMPLES] },
      kpopDataSamples: [...m.KPOP_DATA_SAMPLES],
      staticPaths: { kpop: [], anime: staticPathsOf(allowOf('anime')), hub: staticPathsOf(allowOf('hub')) },
      isKnownRoute: (site, pathname) => m.isKnownRouteFor(site, pathname, { v1: true, v12: true }),
    };
  })();
  if (appDir === APP_DIR) cached = p;
  return p;
}

/** The parity URL list (the 60 kpop URLs), paths in list order. */
export function parityPaths(appDir: string = APP_DIR): string[] {
  const text = fs.readFileSync(path.join(appDir, 'e2e/o1/parity/urls.txt'), 'utf8');
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

/** HTML pages of the parity list: no root file, no redirect-only path (/daily, the unknown path). */
export function kpopHtmlPaths(appDir: string = APP_DIR): string[] {
  return parityPaths(appDir).filter((p) => !ROOT_FILES.includes(p) && p !== '/daily' && !p.startsWith('/an-unknown-'));
}

/**
 * Every kpop path that must answer 404 on `site` (anime or hub): F0's kpop-only and data samples, plus each
 * parity path the site's route map does not know. Sorted, unique.
 */
export function routeLeakPaths(c: LeakContract, site: 'anime' | 'hub', appDir: string = APP_DIR): string[] {
  const parity = parityPaths(appDir).filter((p) => !ROOT_FILES.includes(p) && p !== '/' && !c.isKnownRoute(site, p));
  return [...new Set([...c.kpopOnlySamples[site], ...c.kpopDataSamples, ...parity])].sort();
}

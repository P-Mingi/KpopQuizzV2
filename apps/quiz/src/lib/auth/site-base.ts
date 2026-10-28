// FandomVerse (owner, 2026-10-28; lane 3): where a browser reaches the sign-in and passport routes of each site. kpop stays
// https://kpopquiz.org; the hub is https://fandomverse.org; anime is https://fandomverse.org/anime, its own Vercel project
// under the basePath '/anime', on the same origin as the hub (Vercel Microfrontends), so hub and anime share one cookie jar.
//
// Two kinds of path. An app path is what a build knows ('/q/x', '/login'): safeReturnTo answers one, a ticket and the
// transaction cookie carry one, router.push and redirect() of Next take one and add the basePath themselves. A browser path
// is what the address bar shows ('/anime/q/x'): a Location header, an absolute URL, window.location and a plain <a href>
// need one. withBase turns the first into the second, stripBase the second into the first. On kpop and the hub both are
// the same string, so nothing here changes an answer of those builds.
//
// MERGE NOTE (lane 1): SITE_BASE_PATH mirrors the basePath lane 1 gives the anime build in next.config.ts. When lane 1's
// basePath helper lands, read the value from there so the repo has one source.

import { safeReturnTo } from '@/lib/auth/return-to';
import { netOrigin } from '@/lib/site/registry';

import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';

/** The basePath of each build: '' (served at the root of its origin) or '/anime'. */
export const SITE_BASE_PATH: Readonly<Record<SiteId, '' | '/anime'>> = { kpop: '', anime: '/anime', hub: '' };

/** The basePath of `site`'s build. */
export function basePathOf(site: SiteId): string {
  return SITE_BASE_PATH[site];
}

/** A path that safeReturnTo would keep as it is: a leading slash, not '//', no backslash. */
function isSitePath(path: string): boolean {
  return path.length > 0 && path[0] === '/' && path[1] !== '/' && !path.includes('\\');
}

/**
 * The browser path of an app path of a build whose basePath is `base`: '/' becomes the base itself, '/?x' and '/#x' keep
 * their query or fragment on the base, any other path is appended. Anything that is not a same-site path answers the
 * home of the build (fail closed: the answer never leaves the base).
 */
export function joinBase(base: string, path: string): string {
  if (!isSitePath(path)) return base || '/';
  if (!base) return path;
  if (path === '/') return base;
  if (path[1] === '?' || path[1] === '#') return `${base}${path.slice(1)}`;
  return `${base}${path}`;
}

/** The browser path of an app path of `site` (see joinBase). */
export function withBase(site: SiteId, path: string): string {
  return joinBase(SITE_BASE_PATH[site], path);
}

/**
 * The app path of a browser path of `site`: the basePath is dropped when the path is inside it ('/anime', '/anime/x',
 * '/anime?x', '/anime#x'); any other path comes back unchanged ('/animex' is not inside '/anime'). The answer is NOT
 * checked: pass it through safeReturnTo (safeAppPath does both).
 */
export function stripBase(site: SiteId, path: string): string {
  const base = SITE_BASE_PATH[site];
  if (!base || !path.startsWith(base)) return path;
  const rest = path.slice(base.length);
  if (rest === '') return '/';
  if (rest[0] === '/') return rest;
  if (rest[0] === '?' || rest[0] === '#') return `/${rest}`;
  return path;
}

/**
 * A return path for `site` from an untrusted value: a browser path inside the site's base or an app path, checked by
 * safeReturnTo for that site (same origin, a leading slash, no '//', no backslash, no control character, at most 2048
 * characters). The answer is an app path; withBase of it never leaves the base.
 */
export function safeAppPath(raw: string | null | undefined, fallback: string, site: SiteId): string {
  return safeReturnTo(typeof raw === 'string' ? stripBase(site, raw) : raw, fallback, site);
}

/** The origin (scheme, host, port) a browser reaches `site` on, on this deployment (netOrigin without any path). */
export function siteOrigin(site: SiteId, env: NetOriginEnv): string {
  return new URL(netOrigin(site, env)).origin;
}

/** The prefix of every browser URL of `site`: its origin and its basePath ('https://fandomverse.org/anime'). */
export function siteBase(site: SiteId, env: NetOriginEnv): string {
  return `${siteOrigin(site, env)}${SITE_BASE_PATH[site]}`;
}

/** The absolute browser URL of an app path of `site`. */
export function siteUrl(site: SiteId, env: NetOriginEnv, path: string): string {
  return `${siteOrigin(site, env)}${withBase(site, path)}`;
}

/** True when two sites answer on one browser origin (hub and anime on fandomverse.org): they share the session cookies. */
export function sameOrigin(a: SiteId, b: SiteId, env: NetOriginEnv): boolean {
  return siteOrigin(a, env) === siteOrigin(b, env);
}

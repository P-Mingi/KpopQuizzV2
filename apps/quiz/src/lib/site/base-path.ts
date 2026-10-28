// FandomVerse (owner, 2026-10-28; docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md): one domain, sub-folders. https://fandomverse.org
// is the hub and https://fandomverse.org/anime is OtakuQuiz, a Next.js build with `basePath: '/anime'` that Vercel Microfrontends
// serves on the hub's domain. The registry `url` of a site is its canonical base URL; its path is the site's base path ('' for
// kpop and hub), read by `basePathOf` (registry.ts), so there is no second list to keep in sync.
//
// The helpers of this module are for server code (route handlers, the middleware, server components and libraries, next.config.ts).
// A module that can reach a client bundle does not import it: a new module in a shared client component would change kpopquiz.org's
// client graph. It reads the same build constant inline instead, and Next folds it away on kpop and hub:
//   const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';
//   fetch(`${BASE_PATH}/api/...`)  or  BASE_PATH ? BASE_PATH + path : path
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts and the edge middleware import it.

import { REGISTRY, basePathOf, originOf } from './registry';
import { SITE_IDS } from './types';

import type { SiteConfig } from './types';

export { basePathOf, originOf };

/**
 * The sites served in a sub-folder of `site`'s domain (the zones of a Vercel Microfrontends group whose default application is
 * `site`): same origin, a base path. The hub of fandomverse.org has OtakuQuiz (/anime); a site in a sub-folder, and kpopquiz.org,
 * have none. Read from the registry urls only.
 */
export function zoneChildrenOf(site: SiteConfig, registry: Readonly<Record<string, SiteConfig>> = REGISTRY): SiteConfig[] {
  if (basePathOf(site.url)) return [];
  const origin = originOf(site.url);
  return SITE_IDS.map((id) => registry[id]!).filter((s) => s.id !== site.id && basePathOf(s.url) !== '' && originOf(s.url) === origin);
}

/**
 * The absolute URL of a site path: `base` is a site url (maybe with a sub-folder), `path` starts with '/'. The home of a site in
 * a sub-folder has no trailing slash (https://fandomverse.org/anime, the URL Next serves; with the slash it is a 308), the home of a
 * site at the root keeps it (https://kpopquiz.org/, today's bytes). A query or a fragment on the home stays on the base.
 */
export function joinSiteUrl(base: string, path: string): string {
  let sub = '';
  try { sub = basePathOf(base); } catch { sub = ''; }
  if (!sub) return `${base}${path}`;
  if (path === '/') return base;
  if (path.startsWith('/?') || path.startsWith('/#')) return `${base}${path.slice(1)}`;
  return `${base}${path}`;
}

/**
 * A site path with `basePath` in front: the address a browser must request for it. Only a root-relative path is changed (an
 * absolute URL, a protocol-relative `//host`, a `#fragment` or a relative path are returned as they are), and a path that already
 * starts with the base path is left alone, so applying it twice changes nothing. '/' becomes the base path itself.
 */
export function prefixBasePath(basePath: string, path: string): string {
  if (!basePath || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === basePath || path.startsWith(`${basePath}/`) || path.startsWith(`${basePath}?`) || path.startsWith(`${basePath}#`)) return path;
  if (path === '/') return basePath;
  if (path.startsWith('/?') || path.startsWith('/#')) return `${basePath}${path.slice(1)}`;
  return `${basePath}${path}`;
}

/** The site path of a browser path: the base path taken off ('/anime/q/x' is '/q/x', '/anime' is '/'); any other path as it is. */
export function stripBasePath(basePath: string, path: string): string {
  if (!basePath) return path;
  if (path === basePath) return '/';
  if (path.startsWith(`${basePath}/`)) return path.slice(basePath.length);
  if (path.startsWith(`${basePath}?`) || path.startsWith(`${basePath}#`)) return `/${path.slice(basePath.length)}`;
  return path;
}

// The base path of this build, as Next itself inlines it in every bundle (client, server, edge) from next.config.ts `basePath`:
// '' on the kpop and hub builds, '/anime' on the anime build. A constant at build time, so `withBasePath` is the identity function
// on kpop and hub. Unit tests run outside Next: there it is '' (the kpop answer).
const BUILD_BASE_PATH: string = process.env.__NEXT_ROUTER_BASEPATH || '';

/**
 * The address a browser requests for a site path of this build: a redirect built from `request.url`, a Location header, a link in
 * an HTML string, a server-rendered `<a href>`, `<img src>` or form action. Never for next/link, `router.push`, `redirect()` of
 * next/navigation or a relative metadata URL (metadataBase carries the base path): those add it themselves.
 */
export function withBasePath(path: string): string {
  return BUILD_BASE_PATH ? prefixBasePath(BUILD_BASE_PATH, path) : path;
}

/** The site path of a browser path of this build (the inverse of withBasePath). */
export function withoutBasePath(path: string): string {
  return BUILD_BASE_PATH ? stripBasePath(BUILD_BASE_PATH, path) : path;
}

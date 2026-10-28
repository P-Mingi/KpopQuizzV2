// FandomVerse (owner, 2026-10-28; docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md): the next.config.ts parts of the two sites of
// fandomverse.org. The hub (Vercel project `fandomverse`) is the default application of a Vercel Microfrontends group and OtakuQuiz
// (project `otakuquiz`) its child, built with `basePath: '/anime'`; kpopquiz.org (project `kpopquiz`) is in no group and gets
// none of this (next.config.ts returns its config untouched).
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts imports it.

import { basePathOf, originOf } from './registry';

import type { SiteConfig, SiteId } from './types';

/** The application name (= Vercel project name, the keys of apps/quiz/microfrontends.json) of each site of the group. */
export const MFE_APPLICATIONS: Readonly<Partial<Record<SiteId, string>>> = { hub: 'fandomverse', anime: 'otakuquiz' };

export interface HostCondition {
  readonly type: 'host';
  readonly value: string;
}

export interface ZoneHeaderRule {
  readonly source: string;
  readonly missing: readonly HostCondition[];
  readonly headers: readonly { readonly key: string; readonly value: string }[];
}

/** The canonical host of a site: the host of its url (fandomverse.org for the hub and for OtakuQuiz in /anime). */
export function canonicalHost(site: SiteConfig): string {
  return originOf(site.url).replace(/^https?:\/\//, '').replace(/:\d+$/, '');
}

/**
 * Every answer on a host that is not the site's canonical one says noindex, nofollow: the *.vercel.app URLs of the project (preview
 * and production alike), a staging domain, a dev server. Only added once the site is open to search engines (NET_INDEXING): while it
 * is closed every answer already says so. A header rule of next.config.ts is matched per request by the host it was asked on, so a
 * page cached for every host still answers with the right header (the meta of a production page cannot: it is built once).
 */
export function nonCanonicalHostHeaders(site: SiteConfig): ZoneHeaderRule[] {
  return [{
    source: '/:path*',
    missing: [{ type: 'host', value: canonicalHost(site) }],
    headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
  }];
}

export interface CronProxyRewrite {
  readonly source: string;
  readonly destination: string;
  readonly basePath: false;
}

/**
 * vercel.json is shared by the three projects, so its cron paths (/api/cron/...) carry no base path, and a build with one answers
 * them 404 (Next serves nothing outside its base path, and refuses an internal rewrite from outside it). On such a build each cron
 * path of vercel.json is proxied to the same route of the site's own public URL (https://fandomverse.org/anime/api/cron/...), which
 * Vercel routes back to this project; the route checks CRON_SECRET as it always does. Nothing else outside the base path answers.
 */
export function cronProxyRewrites(site: SiteConfig, cronPaths: readonly string[]): CronProxyRewrite[] {
  if (!basePathOf(site.url)) return [];
  return [...new Set(cronPaths)].filter((p) => p.startsWith('/')).map((p) => ({ source: p, destination: `${site.url}${p}`, basePath: false }));
}

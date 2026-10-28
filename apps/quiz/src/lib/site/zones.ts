// FandomVerse (owner, 2026-10-28; docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md): the next.config.ts parts of the two sites of
// fandomverse.org. The hub (Vercel project `fandomverse`) is the default application of a Vercel Microfrontends group and OtakuQuiz
// (project `otakuquiz`) its child, built with `basePath: '/anime'`; kpopquiz.org (project `kpopquiz`) is in no group and gets
// none of this (next.config.ts returns its config untouched).
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts imports it.

import { basePathOf, originOf } from './base-path';

import type { SiteConfig, SiteId } from './types';

/** The application name (= Vercel project name, the keys of apps/quiz/microfrontends.json) of each site of the group. */
export const MFE_APPLICATIONS: Readonly<Partial<Record<SiteId, string>>> = { hub: 'fandomverse', anime: 'otakuquiz' };

export interface HostCondition {
  readonly type: 'host';
  readonly value: string;
}

export interface ZoneHeaderRule {
  readonly source: string;
  readonly has?: readonly HostCondition[];
  readonly headers: readonly { readonly key: string; readonly value: string }[];
}

/** The canonical host of a site: the host of its url (fandomverse.org for the hub and for OtakuQuiz in /anime). */
export function canonicalHost(site: SiteConfig): string {
  return originOf(site.url).replace(/^https?:\/\//, '').replace(/:\d+$/, '');
}

/**
 * The hosts Vercel gives a deployment (otakuquiz.vercel.app, fandomverse-git-<branch>-<team>.vercel.app, ...), as the value of a
 * `has: host` condition. Next matches that value as a whole: it builds `new RegExp('^' + value + '$')` and tests the host without
 * its port, lower-cased (matchHas, next/dist/shared/lib/router/utils/prepare-destination.js), so the dots are escaped and no anchor
 * is written (`\.vercel\.app$` alone would become `^\.vercel\.app$$`, which no host matches).
 */
export const VERCEL_APP_HOST = '.+\\.vercel\\.app';

/**
 * X-Robots-Tag noindex, nofollow on the addresses of a hub or anime deployment that are not fandomverse.org, and only those:
 *   - a production build (VERCEL_ENV production, or a local build without VERCEL_ENV): on a `*.vercel.app` host only. Any other
 *     host (fandomverse.org, and any domain the owner adds later) answers what the page says;
 *   - a preview or development build (VERCEL_ENV preview or development): on every host, a branch domain included, since nothing
 *     of a preview is ever meant for search engines.
 * Never "every host but fandomverse.org": that rule would also close any future legitimate host. A header rule is matched per
 * request by the host it was asked on, so a page cached for every host still answers with the right header (the meta of a
 * production page cannot: it is built once). Added whether the site is open or not: while it is closed the closed rule of
 * next.config.ts already says the same on every host.
 */
export function deploymentHostNoindexHeaders(vercelEnv: string | undefined): ZoneHeaderRule[] {
  const headers = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
  if (vercelEnv && vercelEnv !== 'production') return [{ source: '/:path*', headers }];
  return [{ source: '/:path*', has: [{ type: 'host', value: VERCEL_APP_HOST }], headers }];
}

/**
 * The cron paths of the shared vercel.json, read from its text (`file` names it in the errors). The hub and anime builds call it
 * (next.config.ts) and fail here, naming the file, when it is not valid JSON, has no "crons" array or a cron without a path: never a
 * build that silently proxies no cron. The kpop build never reads the file.
 */
export function cronPathsOf(text: string, file: string): string[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${(err as Error).message}). The hub and anime builds read its "crons" to proxy them.`);
  }
  const crons = json !== null && typeof json === 'object' ? (json as { crons?: unknown }).crons : undefined;
  if (!Array.isArray(crons)) throw new Error(`${file} has no "crons" array. The hub and anime builds read it to proxy the crons of vercel.json.`);
  return crons.map((c: unknown, i) => {
    const path = c !== null && typeof c === 'object' ? (c as { path?: unknown }).path : undefined;
    if (typeof path !== 'string' || path === '') throw new Error(`${file}: crons[${i}] has no "path" string.`);
    return path;
  });
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

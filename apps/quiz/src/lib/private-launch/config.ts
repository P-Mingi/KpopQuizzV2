// Private launch (owner, 2026-11-06): the hub (bunnyverse.org) and OtakuQuiz (bunnyverse.org/anime) go to production while only the
// owner's signed-in account may see them; everyone else gets the Coming soon page. kpopquiz.org (the kpop build) never gets any of this.
//
// Three server variables, set on the Vercel projects fandomverse and otakuquiz (never in git):
//   PRIVATE_LAUNCH        unset, '', '0', 'false', 'off' or 'no': off, the build is exactly today's. Any other value: on.
//   PRIVATE_LAUNCH_ALLOW  the user ids (uuid) that may enter, comma separated.
//   PRIVATE_LAUNCH_KEY    a random secret of at least 64 hex characters (openssl rand -hex 32), the same on both projects.
// With the gate on, next.config.ts adds beforeFiles rewrites (the last ones, after the site's own rules of lib/site/routing.ts) that
// send every page of the site to the Coming soon page unless the request carries the cookie bv_private with the expected value:
// HMAC-SHA256(KEY, the sorted allowed ids). /auth/private-launch (a route handler) checks the session and sets that cookie for an
// allowed account. A gate that is on but lacks a valid KEY or any valid id fails closed: every visitor gets Coming soon, nobody can
// enter, and the build logs a warning. It never fails open.
//
// Why rewrites and not the middleware: the middleware matcher skips "/" and many page prefixes (it is shared with kpopquiz.org, and
// widening it costs invocations there), and the middleware must make no Supabase call on public paths. A rewrite condition on a cookie
// costs nothing and covers every path.
//
// Keep this module free of `@/` imports and next/*: next.config.ts imports it.

import { createHmac } from 'node:crypto';

import type { SiteId } from '../site/types';

/** The cookie that lets an allowed browser through. HttpOnly, Secure, SameSite=Lax, Path=/ (hub and /anime share it). */
export const PRIVATE_COOKIE = 'bv_private';

/** 30 days, in seconds. */
export const PRIVATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** The public entry and exit of each build (before its basePath): under /auth/, which every site passes through untouched. */
export const ENTER_PATH = '/auth/private-launch';
export const LEAVE_PATH = '/auth/private-launch/leave';

/**
 * The three route handlers of the gate, in app/sites/private-launch/: the Coming soon page and, below it, the entry and the exit. They sit
 * outside app/sites/[site] (no site chrome, no route of a site's tree), and no public path reaches them on any build: anime and hub prefix
 * a direct /sites request again (lib/site/routing.ts), kpop gives every /sites path its unknown-route answer in the middleware. Only the
 * gate's rewrites below do.
 */
export const COMING_SOON_INTERNAL = '/sites/private-launch';
export const ENTER_INTERNAL = `${COMING_SOON_INTERNAL}/enter`;
export const LEAVE_INTERNAL = `${COMING_SOON_INTERNAL}/leave`;

/**
 * The pages of a site that stay open with the gate on, as paths under /sites/<site>/: the sign-in page (its server actions post to the
 * same path), robots.txt and sitemap.xml (they stay as they are). Everything else the site's own rules sent under /sites/<site> is gated.
 * What those rules never send there is open by construction: /api/** (crons, OG images, the passport and sign-in APIs), /auth/** (the
 * OAuth start and callback, the passport handoff), /_next/**, /_vercel/**, public files, the brand files (/brand/<site>/...).
 */
export const OPEN_INTERNAL: readonly string[] = ['login', 'robots.txt', 'sitemap.xml'];

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The path-to-regexp pattern of a gated path under /sites/<site>/: any non-empty rest but the open ones. */
export const GATED_REST_PATTERN = `(?!(?:${OPEN_INTERNAL.map(escapeRe).join('|')})$).+`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KEY_RE = /^[0-9a-f]{64,}$/;

export interface PrivateLaunchEnv {
  readonly [name: string]: string | undefined;
  readonly PRIVATE_LAUNCH?: string | undefined;
  readonly PRIVATE_LAUNCH_ALLOW?: string | undefined;
  readonly PRIVATE_LAUNCH_KEY?: string | undefined;
}

export type PrivateLaunch =
  | { readonly on: false }
  | {
    readonly on: true;
    /** The allowed user ids (lowercase uuids). */
    readonly allow: ReadonlySet<string>;
    /** The value of the cookie that lets a browser through, or null when the gate fails closed (nobody can enter). */
    readonly expected: string | null;
    /** Why the gate fails closed, for the build log (names no id and no secret), or null. */
    readonly problem: string | null;
  };

export const OFF: PrivateLaunch = { on: false };

/** True when PRIVATE_LAUNCH turns the gate on: every value but unset, '', '0', 'false', 'off' and 'no' (a typo closes, never opens). */
export function gateOn(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  return !['', '0', 'false', 'off', 'no'].includes(raw.trim().toLowerCase());
}

/** The allowed ids of PRIVATE_LAUNCH_ALLOW: trimmed, lowercased, uuids only, no duplicate. */
export function parseAllow(raw: string | undefined): { readonly ids: ReadonlySet<string>; readonly dropped: number } {
  const parts = (raw ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
  const ids = new Set(parts.filter((s) => UUID_RE.test(s)));
  return { ids, dropped: parts.filter((s) => !UUID_RE.test(s)).length };
}

/** HMAC-SHA256(key, the sorted ids joined by commas), hex: the cookie value. */
export function expectedCookie(key: string, ids: ReadonlySet<string>): string {
  return createHmac('sha256', key).update([...ids].sort().join(',')).digest('hex');
}

/** The gate of a build. kpop: always off, whatever the variables say. */
export function readPrivateLaunch(site: SiteId, env: PrivateLaunchEnv): PrivateLaunch {
  if (site === 'kpop' || !gateOn(env.PRIVATE_LAUNCH)) return OFF;
  const key = (env.PRIVATE_LAUNCH_KEY ?? '').trim().toLowerCase();
  const { ids, dropped } = parseAllow(env.PRIVATE_LAUNCH_ALLOW);
  const problems: string[] = [];
  if (!KEY_RE.test(key)) problems.push('PRIVATE_LAUNCH_KEY is missing or is not at least 64 hex characters');
  if (ids.size === 0) problems.push('PRIVATE_LAUNCH_ALLOW holds no user id (uuid)');
  if (dropped > 0) problems.push(`PRIVATE_LAUNCH_ALLOW has ${dropped} entr${dropped === 1 ? 'y' : 'ies'} that are not user ids (ignored)`);
  const closed = !KEY_RE.test(key) || ids.size === 0;
  return {
    on: true,
    allow: ids,
    expected: closed ? null : expectedCookie(key, ids),
    problem: problems.length > 0 ? problems.join('; ') : null,
  };
}

/** True when a signed-in user id may enter (the gate is on and does not fail closed). */
export function mayEnter(pl: PrivateLaunch, userId: string | null | undefined): boolean {
  return pl.on && pl.expected !== null && typeof userId === 'string' && pl.allow.has(userId.toLowerCase());
}

type CookieCondition = { type: 'cookie'; key: string; value: string };

export interface GateRewrite {
  source: string;
  destination: string;
  missing?: CookieCondition[];
}

export interface GateHeader {
  source: string;
  missing?: CookieCondition[];
  headers: { key: string; value: string }[];
}

function missingCookie(pl: PrivateLaunch): { missing?: CookieCondition[] } {
  // Fail closed: no expected value, no condition, the rule applies to every request.
  if (!pl.on || pl.expected === null) return {};
  return { missing: [{ type: 'cookie', key: PRIVATE_COOKIE, value: pl.expected }] };
}

/**
 * The beforeFiles rewrites of the gate, to append AFTER the site's own (rewritesFor): those have already sent every page path to
 * /sites/<site>[/...] (beforeFiles rules run in order, each seeing the path the previous ones left), so the gate matches those internal
 * paths only. Then the entry and exit, after the gate, so the gate never sees them. Empty on
 * kpop and with the gate off.
 */
export function privateLaunchRewrites(site: SiteId, pl: PrivateLaunch): GateRewrite[] {
  if (site === 'kpop' || !pl.on) return [];
  const base = `/sites/${site}`;
  return [
    { source: base, destination: COMING_SOON_INTERNAL, ...missingCookie(pl) },
    { source: `${base}/:rest(${GATED_REST_PATTERN})`, destination: COMING_SOON_INTERNAL, ...missingCookie(pl) },
    { source: ENTER_PATH, destination: ENTER_INTERNAL },
    { source: LEAVE_PATH, destination: LEAVE_INTERNAL },
  ];
}

/**
 * The header rules of the gate: every answer to a browser without the cookie but robots.txt and sitemap.xml says noindex, nofollow
 * (the Coming soon page included, whatever NET_INDEXING says). The same value as the closed rule of next.config.ts, which already says
 * it while NET_INDEXING is off. '/' is the home of a build with a basePath (next.config.ts zoneConfig explains why). Empty on kpop and off.
 */
export function privateLaunchHeaders(site: SiteId, pl: PrivateLaunch): GateHeader[] {
  if (site === 'kpop' || !pl.on) return [];
  const headers = (): { key: string; value: string }[] => [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
  return [
    { source: '/((?!robots\\.txt|sitemap\\.xml).*)', ...missingCookie(pl), headers: headers() },
    { source: '/', ...missingCookie(pl), headers: headers() },
  ];
}

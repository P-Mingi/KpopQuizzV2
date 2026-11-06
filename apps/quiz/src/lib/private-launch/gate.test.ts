// Private launch (owner, 2026-11-06): the gate of next.config.ts, resolved with Next's own route code. The config is loaded per build
// (as zones.test.ts does), its rewrites go through loadCustomRoutes (validation and the basePath of the anime build), and every
// beforeFiles rule is applied the way resolve-routes.js applies it: in order, once, each one seeing the path the previous ones left,
// its has and missing conditions checked by Next's matchHas against the request's cookies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as customRoutes from 'next/dist/lib/load-custom-routes';
import { modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { matchHas, prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY, hubRouteAllow } from '@/lib/site/registry';

import {
  COMING_SOON_INTERNAL, ENTER_INTERNAL, ENTER_PATH, LEAVE_INTERNAL, LEAVE_PATH, PRIVATE_COOKIE, expectedCookie, gateOn, parseAllow, privateLaunchHeaders,
  privateLaunchRewrites, readPrivateLaunch,
} from './config';

import type { NextConfig } from 'next';
import type { Header, Rewrite } from 'next/dist/lib/load-custom-routes';
import type { SiteConfig, SiteId } from '@/lib/site/types';

const APP = fileURLToPath(new URL('../../../', import.meta.url));
const ANIME_FV: SiteConfig = { ...REGISTRY.anime, url: 'https://bunnyverse.org/anime', domain: 'bunnyverse.org' };
const HUB_FV: SiteConfig = { ...REGISTRY.hub, url: 'https://bunnyverse.org', domain: 'bunnyverse.org' };

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';
const KEY = 'ab'.repeat(32);
const EXPECTED = expectedCookie(KEY, new Set([ID_A, ID_B]));

const vercelCrons = (JSON.parse(readFileSync(`${APP}vercel.json`, 'utf8')) as { crons: { path: string }[] }).crons.map((c) => c.path);

type Env = { PRIVATE_LAUNCH?: string | undefined; PRIVATE_LAUNCH_ALLOW?: string | undefined; PRIVATE_LAUNCH_KEY?: string | undefined };
// A signed-in browser that is not allowed: the Supabase session cookies, no bv_private (the entry never gave it one).
const SIGNED_IN_NOT_ALLOWED = { 'sb-dummy-auth-token': 'base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0', 'sb-dummy-auth-token.0': 'x' };
const FULL: Env = { PRIVATE_LAUNCH: '1', PRIVATE_LAUNCH_ALLOW: `${ID_B}, ${ID_A.toUpperCase()}`, PRIVATE_LAUNCH_KEY: KEY };

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('@/lib/site/registry'); vi.doUnmock('../site/registry'); });

async function loadConfig(site: SiteId, env: Env): Promise<NextConfig> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site === 'kpop' ? '' : site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NET_INDEXING', '');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('PRIVATE_LAUNCH', env.PRIVATE_LAUNCH ?? '');
  vi.stubEnv('PRIVATE_LAUNCH_ALLOW', env.PRIVATE_LAUNCH_ALLOW ?? '');
  vi.stubEnv('PRIVATE_LAUNCH_KEY', env.PRIVATE_LAUNCH_KEY ?? '');
  if (env.PRIVATE_LAUNCH === undefined) delete process.env.PRIVATE_LAUNCH;
  const mock = async (importOriginal: () => Promise<typeof import('@/lib/site/registry')>) => {
    const m = await importOriginal();
    const registry = { ...m.REGISTRY, anime: ANIME_FV, hub: HUB_FV };
    return { ...m, REGISTRY: registry, SITE: registry[m.SITE_ID] };
  };
  vi.doMock('../site/registry', mock);
  vi.doMock('@/lib/site/registry', mock);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const c = (await import('../../../next.config')).default;
  warn.mockRestore();
  return c;
}

type LoadCustomRoutes = (config: NextConfig) => Promise<{ headers: Header[]; rewrites: { beforeFiles: Rewrite[]; afterFiles: Rewrite[]; fallback: Rewrite[] } }>;
const customRoutesModule = customRoutes as unknown as { default: LoadCustomRoutes | { default: LoadCustomRoutes } };
const loadCustomRoutes: LoadCustomRoutes = typeof customRoutesModule.default === 'function' ? customRoutesModule.default : customRoutesModule.default.default;

async function processed(c: NextConfig): Promise<Rewrite[]> {
  const routes = await loadCustomRoutes({ ...c, basePath: c.basePath ?? '', trailingSlash: false, i18n: null } as NextConfig);
  return routes.rewrites.beforeFiles;
}

/** The path the beforeFiles rules leave for a request (pathname, optional query, cookies), as resolve-routes.js computes it. */
function resolveBefore(rules: readonly Rewrite[], url: string, cookies: Record<string, string>): string {
  const [pathname, search = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(search));
  const req = { headers: {}, cookies } as unknown as Parameters<typeof matchHas>[0];
  let current = pathname!;
  for (const r of rules) {
    const match = getPathMatch(r.source, { strict: true, removeUnnamedParams: true, regexModifier: (re: string) => modifyRouteRegex(re) });
    const params = match(current);
    if (!params) continue;
    const hasParams = matchHas(req, query, r.has, r.missing);
    if (hasParams === false) continue;
    const { parsedDestination } = prepareDestination({ appendParamsToQuery: true, destination: r.destination, params: { ...params, ...hasParams }, query });
    current = parsedDestination.hostname ? `external:${parsedDestination.hostname}${parsedDestination.pathname}` : parsedDestination.pathname ?? current;
  }
  return current;
}

/** A sample path of a route pattern of the registry ({x} becomes 'sample', '/**' gives the folder itself and a child). */
function samplesOf(pattern: string): string[] {
  const p = pattern.replace(/\{[a-zA-Z]+\}/g, 'sample');
  if (p.endsWith('/**')) { const b = p.slice(0, -3); return [b, `${b}/x`]; }
  return [p];
}

const HUB_PUBLIC = [...new Set([...hubRouteAllow({ dailyGuess: true }).flatMap(samplesOf), '/llms.txt', '/kpopdle?r=1-2-3', '/unknown-page', '/sites/hub', '/sites/private-launch', '/sites/private-launch/enter', '/private-launch', '/burrow', '/dle-share/en/kpopdle/1'])].filter((p) => p !== '/login');
const ANIME_PUBLIC = [...new Set([...(REGISTRY.anime.routes.allow as readonly string[]).flatMap(samplesOf), '/llms.txt', '/naruto-openings-quiz', '/blindtest', '/unknown-page', '/sites/anime'])].filter((p) => p !== '/login');

/** Open with the gate on, for everyone: the sign-in, the auth handlers, the APIs (crons, OG images, passport), files, robots, sitemap. */
const OPEN = [
  '/login', '/robots.txt', '/sitemap.xml', '/sitemap-hub.xml',
  '/auth/callback', '/auth/start', '/auth/confirm', '/auth/arrive', '/auth/authorize', '/auth/land', '/auth/passport/out',
  '/api/og/sample', '/api/og/group/sample', '/api/passport/redeem', '/api/passport/revalidate', '/api/n/me', '/api/n/b',
  ...vercelCrons,
  '/_next/static/chunks/app.js', '/_next/image', '/_vercel/insights/script.js',
  '/favicon.ico', '/og-default.png', '/site.webmanifest', '/brand/hub/logo-primary.svg', '/mascot/mascot-default.png', '/fonts/Inter-latin.woff2',
];

describe('the variables', () => {
  it('PRIVATE_LAUNCH: off only when unset, empty, 0, false, off or no; any other value turns the gate on (a typo closes)', () => {
    for (const v of [undefined, '', '0', ' 0 ', 'false', 'FALSE', 'off', 'no']) expect(gateOn(v), String(v)).toBe(false);
    for (const v of ['1', 'true', 'yes', 'on', '2', 'x']) expect(gateOn(v), v).toBe(true);
  });

  it('PRIVATE_LAUNCH_ALLOW is read like ADMIN_USER_IDS (comma separated, trimmed, empty parts dropped), uuids only, lowercased', () => {
    const { ids, dropped } = parseAllow(` ${ID_A.toUpperCase()} ,,${ID_B}, me@example.org ,${ID_A}`);
    expect([...ids].sort()).toEqual([ID_A, ID_B]);
    expect(dropped).toBe(1);
    expect(parseAllow(undefined).ids.size).toBe(0);
  });

  it('the cookie value is HMAC-SHA256(KEY, the sorted ids): the order and the case of the list do not change it', () => {
    const a = readPrivateLaunch('hub', FULL);
    const b = readPrivateLaunch('anime', { ...FULL, PRIVATE_LAUNCH_ALLOW: `${ID_A},${ID_B}` });
    expect(a.on && a.expected).toBe(EXPECTED);
    expect(b.on && b.expected).toBe(EXPECTED);
    expect(EXPECTED).toMatch(/^[0-9a-f]{64}$/);
    const other = readPrivateLaunch('hub', { ...FULL, PRIVATE_LAUNCH_ALLOW: ID_A });
    expect(other.on && other.expected).not.toBe(EXPECTED);
  });

  it('kpop: off whatever the variables say', () => {
    expect(readPrivateLaunch('kpop', FULL)).toEqual({ on: false });
    expect(privateLaunchRewrites('kpop', readPrivateLaunch('hub', FULL))).toEqual([]);
    expect(privateLaunchHeaders('kpop', readPrivateLaunch('hub', FULL))).toEqual([]);
  });

  it.each([
    ['no ALLOW', { ...FULL, PRIVATE_LAUNCH_ALLOW: '' }],
    ['no KEY', { ...FULL, PRIVATE_LAUNCH_KEY: '' }],
    ['neither', { PRIVATE_LAUNCH: '1' }],
    ['a short KEY', { ...FULL, PRIVATE_LAUNCH_KEY: 'abc123' }],
    ['a KEY that is not hex', { ...FULL, PRIVATE_LAUNCH_KEY: 'z'.repeat(64) }],
    ['an ALLOW of e-mails', { ...FULL, PRIVATE_LAUNCH_ALLOW: 'owner@example.org' }],
  ])('PRIVATE_LAUNCH=1 with %s fails closed: no cookie value, rules without condition, a reason for the log', (_n, env) => {
    const pl = readPrivateLaunch('hub', env);
    expect(pl.on).toBe(true);
    if (!pl.on) return;
    expect(pl.expected).toBeNull();
    expect(pl.problem).toBeTruthy();
    expect(pl.problem).not.toContain(ID_A);
    for (const r of privateLaunchRewrites('hub', pl)) expect('missing' in r, r.source).toBe(false);
    for (const h of privateLaunchHeaders('hub', pl)) expect('missing' in h, h.source).toBe(false);
  });
});

describe('next.config.ts with the gate', () => {
  it('kpop: rewrites and headers are today\'s, value for value, whatever the variables say', async () => {
    const off = await loadConfig('kpop', {});
    const offRewrites = await off.rewrites!();
    const offHeaders = await off.headers!();
    const offKeys = Object.keys(off).sort();
    const on = await loadConfig('kpop', FULL);
    expect(await on.rewrites!()).toEqual(offRewrites);
    expect(await on.headers!()).toEqual(offHeaders);
    expect(Object.keys(on).sort()).toEqual(offKeys);
    expect(JSON.stringify(await on.rewrites!())).not.toContain('private');
  });

  it.each([['hub'], ['anime']] as const)('%s with PRIVATE_LAUNCH unset or 0: no rule of the gate, the same config as without the variables', async (site) => {
    const none = await loadConfig(site, {});
    const ref = { r: await none.rewrites!(), h: await none.headers!() };
    for (const env of [{ ...FULL, PRIVATE_LAUNCH: '0' }, { PRIVATE_LAUNCH_ALLOW: FULL.PRIVATE_LAUNCH_ALLOW, PRIVATE_LAUNCH_KEY: KEY }]) {
      const c = await loadConfig(site, env);
      expect(await c.rewrites!()).toEqual(ref.r);
      expect(await c.headers!()).toEqual(ref.h);
    }
    const s = JSON.stringify(ref);
    expect(s).not.toContain(PRIVATE_COOKIE);
    expect(s).not.toContain(COMING_SOON_INTERNAL);
  });

  it.each([['hub'], ['anime']] as const)('%s with the three variables: the gate rules come last, conditioned on the cookie value', async (site) => {
    const c = await loadConfig(site, FULL);
    const r = (await c.rewrites!()) as { beforeFiles: { source: string; destination: string; missing?: unknown }[] };
    const tail = r.beforeFiles.slice(-4);
    expect(tail).toEqual([
      { source: `/sites/${site}`, destination: COMING_SOON_INTERNAL, missing: [{ type: 'cookie', key: PRIVATE_COOKIE, value: EXPECTED }] },
      { source: expect.stringMatching(new RegExp(`^/sites/${site}/:rest\\(`)), destination: COMING_SOON_INTERNAL, missing: [{ type: 'cookie', key: PRIVATE_COOKIE, value: EXPECTED }] },
      { source: ENTER_PATH, destination: ENTER_INTERNAL },
      { source: LEAVE_PATH, destination: LEAVE_INTERNAL },
    ]);
    const h = (await c.headers!()) as { source: string; missing?: unknown; headers: unknown }[];
    expect(h.filter((x) => x.missing)).toEqual([
      { source: '/((?!robots\\.txt|sitemap\\.xml).*)', missing: [{ type: 'cookie', key: PRIVATE_COOKIE, value: EXPECTED }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/', missing: [{ type: 'cookie', key: PRIVATE_COOKIE, value: EXPECTED }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]);
  });

  it('the hub: every public page is Coming soon for an anonymous visitor, a signed-in account that is not allowed, a wrong or old cookie; the cookie opens them all', async () => {
    const rules = await processed(await loadConfig('hub', FULL));
    const stale = expectedCookie(KEY, new Set([ID_A]));
    expect(HUB_PUBLIC.length).toBeGreaterThan(15);
    for (const p of HUB_PUBLIC) {
      for (const cookies of [{}, SIGNED_IN_NOT_ALLOWED, { [PRIVATE_COOKIE]: 'x' }, { [PRIVATE_COOKIE]: stale }, { [PRIVATE_COOKIE]: `${EXPECTED}0` }, { other: EXPECTED }]) {
        expect(resolveBefore(rules, p, cookies), `${p} ${JSON.stringify(cookies)}`).toBe(COMING_SOON_INTERNAL);
      }
      expect(resolveBefore(rules, p, { [PRIVATE_COOKIE]: EXPECTED }), p).not.toBe(COMING_SOON_INTERNAL);
    }
    expect(resolveBefore(rules, '/', { [PRIVATE_COOKIE]: EXPECTED })).toBe('/sites/hub');
    expect(resolveBefore(rules, '/kpopdle', { [PRIVATE_COOKIE]: EXPECTED })).toBe('/sites/hub/kpopdle');
  });

  it('OtakuQuiz at /anime: every public page is Coming soon without the cookie, and its own page with it', async () => {
    const c = await loadConfig('anime', FULL);
    expect(c.basePath).toBe('/anime');
    const rules = await processed(c);
    expect(ANIME_PUBLIC.length).toBeGreaterThan(30);
    for (const p of ANIME_PUBLIC) {
      const url = p === '/' ? '/anime' : `/anime${p}`;
      expect(resolveBefore(rules, url, {}), url).toBe(`/anime${COMING_SOON_INTERNAL}`);
      expect(resolveBefore(rules, url, { [PRIVATE_COOKIE]: 'nope' }), url).toBe(`/anime${COMING_SOON_INTERNAL}`);
      expect(resolveBefore(rules, url, SIGNED_IN_NOT_ALLOWED), url).toBe(`/anime${COMING_SOON_INTERNAL}`);
      expect(resolveBefore(rules, url, { [PRIVATE_COOKIE]: EXPECTED }), url).not.toBe(`/anime${COMING_SOON_INTERNAL}`);
    }
    expect(resolveBefore(rules, '/anime/q/x', { [PRIVATE_COOKIE]: EXPECTED })).toBe('/anime/sites/anime/q/x');
  });

  it.each([['hub'], ['anime']] as const)('%s: the sign-in, the auth callback, the crons, the APIs, OG images and files pass for everyone', async (site) => {
    const rules = await processed(await loadConfig(site, FULL));
    const prefix = site === 'anime' ? '/anime' : '';
    for (const p of OPEN) {
      for (const cookies of [{}, { [PRIVATE_COOKIE]: EXPECTED }]) {
        const out = resolveBefore(rules, `${prefix}${p}`, cookies);
        expect(out.endsWith(COMING_SOON_INTERNAL), `${prefix}${p} -> ${out}`).toBe(false);
      }
    }
    // The sign-in page and the callback reach their own routes.
    expect(resolveBefore(rules, `${prefix}/login`, {})).toBe(`${prefix}/sites/${site}/login`);
    expect(resolveBefore(rules, `${prefix}/auth/callback`, {})).toBe(`${prefix}/auth/callback`);
    // The crons of vercel.json reach their routes (anime: proxied, outside the base path, to its own URL; the hub: untouched).
    for (const cron of vercelCrons) {
      if (site === 'anime') {
        expect(resolveBefore(rules, cron, {}), cron).toBe(`external:bunnyverse.org/anime${cron}`);
        expect(resolveBefore(rules, `/anime${cron}`, {}), cron).toBe(`/anime${cron}`);
      } else {
        expect(resolveBefore(rules, cron, {}), cron).toBe(cron);
      }
    }
    // The entry and exit reach the route handlers of the site, with or without the cookie.
    for (const cookies of [{}, { [PRIVATE_COOKIE]: EXPECTED }]) {
      expect(resolveBefore(rules, `${prefix}${ENTER_PATH}`, cookies)).toBe(`${prefix}${ENTER_INTERNAL}`);
      expect(resolveBefore(rules, `${prefix}${LEAVE_PATH}`, cookies)).toBe(`${prefix}${LEAVE_INTERNAL}`);
    }
  });

  it.each([['hub'], ['anime']] as const)('%s with PRIVATE_LAUNCH=1 and a missing ALLOW or KEY: Coming soon for everyone, even with a cookie', async (site) => {
    const prefix = site === 'anime' ? '/anime' : '';
    for (const env of [{ ...FULL, PRIVATE_LAUNCH_ALLOW: '' }, { ...FULL, PRIVATE_LAUNCH_KEY: '' }, { PRIVATE_LAUNCH: '1' }]) {
      const rules = await processed(await loadConfig(site, env));
      for (const cookies of [{}, { [PRIVATE_COOKIE]: EXPECTED }, { [PRIVATE_COOKIE]: '' }]) {
        expect(resolveBefore(rules, `${prefix}/`.replace(/\/$/, '') || '/', cookies)).toBe(`${prefix}${COMING_SOON_INTERNAL}`);
        expect(resolveBefore(rules, `${prefix}/privacy`, cookies)).toBe(`${prefix}${COMING_SOON_INTERNAL}`);
        expect(resolveBefore(rules, `${prefix}/login`, cookies)).toBe(`${prefix}/sites/${site}/login`);
        expect(resolveBefore(rules, `${prefix}/auth/callback`, cookies)).toBe(`${prefix}/auth/callback`);
      }
    }
  });
});

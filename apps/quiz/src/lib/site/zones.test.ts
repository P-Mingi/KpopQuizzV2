// Bunnyverse (lane 1): the Vercel Microfrontends group of bunnyverse.org (apps/quiz/microfrontends.json) and the next.config.ts
// of each build (docs/launch/o1/ARCHITECTURE-BUNNYVERSE.md). The registry values of Bunnyverse are stubbed where they matter
// (`fandomVerse` below), so the test says the same thing before and after the registry carries https://bunnyverse.org/anime.
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, parse as parseUrl } from 'node:url';

import { validateRouting } from '@vercel/microfrontends/next/testing';
import { buildCustomRoute } from 'next/dist/lib/build-custom-route';
import * as customRoutes from 'next/dist/lib/load-custom-routes';
import { proxyRequest } from 'next/dist/server/lib/router-utils/proxy-request';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY } from './registry';
import { CRON_ROUTE_RE, MFE_APPLICATIONS, VERCEL_APP_HOST, canonicalHost, cronPathsOf, cronProxyRewrites, deploymentHostNoindexHeaders } from './zones';

import type { AddressInfo } from 'node:net';
import type { NextConfig } from 'next';
import type { Header, Rewrite } from 'next/dist/lib/load-custom-routes';
import type { NextUrlWithParsedQuery } from 'next/dist/server/request-meta';
import type { SiteConfig, SiteId } from './types';

const APP = fileURLToPath(new URL('../../../', import.meta.url));
const MFE = `${APP}microfrontends.json`;

const ANIME_FV: SiteConfig = { ...REGISTRY.anime, url: 'https://bunnyverse.org/anime', domain: 'bunnyverse.org' };
const HUB_FV: SiteConfig = { ...REGISTRY.hub, url: 'https://bunnyverse.org', domain: 'bunnyverse.org' };

const vercelCrons = (JSON.parse(readFileSync(`${APP}vercel.json`, 'utf8')) as { crons: { path: string }[] }).crons.map((c) => c.path);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('./registry'); });

describe('microfrontends.json: the group of bunnyverse.org', () => {
  it('names the two Vercel projects: the hub is the default application, OtakuQuiz the child; kpop is in no group', () => {
    const config = JSON.parse(readFileSync(MFE, 'utf8')) as { applications: Record<string, { routing?: unknown; development?: { fallback?: string } }> };
    expect(Object.keys(config.applications).sort()).toEqual([MFE_APPLICATIONS.hub, MFE_APPLICATIONS.anime].sort());
    expect(config.applications[MFE_APPLICATIONS.hub!]!.routing).toBeUndefined();
    expect(config.applications[MFE_APPLICATIONS.hub!]!.development?.fallback).toBe('bunnyverse.org');
    expect(MFE_APPLICATIONS.kpop).toBeUndefined();
  });

  it('routes /anime and everything below it to otakuquiz, the rest of the domain to fandomverse', () => {
    expect(() => validateRouting(MFE, {
      otakuquiz: [
        '/anime', '/anime/q/who-is-l', '/anime/naruto-quiz', '/anime/_next/static/chunks/app.js', '/anime/_next/image',
        '/anime/api/quiz/1/play', '/anime/auth/callback', '/anime/sitemap.xml', '/anime/760f9a9459d4db0bd8a08f13a0f1ec6e.txt',
        '/anime/series/naruto.webp', '/anime/site.webmanifest',
      ],
      fandomverse: [
        '/', '/privacy', '/passport', '/robots.txt', '/sitemap.xml', '/sitemap-hub.xml', '/llms.txt', '/favicon.ico',
        '/api/n/me', '/auth/callback', '/_next/static/chunks/app.js', '/_vercel/insights/script.js', '/animex', '/anime-mix-quiz',
        '/339dab142e51883ae3a2c7e4737254e4.txt',
      ],
    })).not.toThrow();
  });
});

const NOINDEX = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];

/** Does a header rule apply to a request on `host`? Next's own matcher of `has` and `missing` (what `next start` runs). */
function appliesOn(rule: { has?: readonly { type: 'host'; value: string }[]; missing?: readonly { type: 'host'; value: string }[] }, host: string): boolean {
  const req = { headers: { host } } as unknown as Parameters<typeof matchHas>[0];
  return matchHas(req, {}, [...(rule.has ?? [])], [...(rule.missing ?? [])]) !== false;
}

describe('noindex on the *.vercel.app hosts of a deployment and on every host of a preview, never "every host but one"', () => {
  it('the canonical host of the hub and of OtakuQuiz is bunnyverse.org', () => {
    expect(canonicalHost(HUB_FV)).toBe('bunnyverse.org');
    expect(canonicalHost(ANIME_FV)).toBe('bunnyverse.org');
    expect(canonicalHost(REGISTRY.kpop)).toBe('kpopquiz.org');
  });

  it('a production build: one rule, X-Robots-Tag noindex, nofollow when the host is a *.vercel.app host (dots escaped, no missing)', () => {
    for (const env of ['production', '', undefined]) {
      expect(deploymentHostNoindexHeaders(env), String(env)).toEqual([{ source: '/:path*', has: [{ type: 'host', value: '.+\\.vercel\\.app' }], headers: NOINDEX }]);
    }
    expect(VERCEL_APP_HOST).toBe(String.raw`.+\.vercel\.app`);
  });

  it('Next applies it on a vercel.app host and on no other host, bunnyverse.org and a future domain included', () => {
    const [rule] = deploymentHostNoindexHeaders('production');
    for (const host of ['otakuquiz.vercel.app', 'fandomverse.vercel.app', 'otakuquiz-git-main-team.vercel.app', 'OtakuQuiz-abc123-team.vercel.app:443']) {
      expect(appliesOn(rule!, host), host).toBe(true);
    }
    for (const host of [
      'bunnyverse.org', 'bunnyverse.org:443', 'www.bunnyverse.org', 'staging.bunnyverse.org', 'anime.example', 'localhost',
      'vercel.app', 'evilvercel.app', 'otakuquiz.vercelxapp', 'otakuquiz.vercel.app.example.org',
    ]) {
      expect(appliesOn(rule!, host), host).toBe(false);
    }
  });

  it('a preview or development build: the rule has no host condition, so every host says noindex', () => {
    for (const env of ['preview', 'development']) {
      const rules = deploymentHostNoindexHeaders(env);
      expect(rules, env).toEqual([{ source: '/:path*', headers: NOINDEX }]);
      for (const host of ['bunnyverse.org', 'otakuquiz-git-x-team.vercel.app', 'preview.bunnyverse.org']) expect(appliesOn(rules[0]!, host), host).toBe(true);
    }
  });

  it('no rule of any build is "every host but bunnyverse.org" (no missing condition)', () => {
    for (const env of ['production', 'preview', 'development', undefined]) {
      for (const r of deploymentHostNoindexHeaders(env)) expect('missing' in r, String(env)).toBe(false);
    }
  });
});

describe('the crons of the shared vercel.json on a build with a base path', () => {
  it('each cron path is proxied, outside the base path, to the same route of the site\'s own url', () => {
    const rules = cronProxyRewrites(ANIME_FV, vercelCrons);
    expect(rules.length).toBe(new Set(vercelCrons).size);
    expect(rules).toContainEqual({
      source: '/api/cron/ensure-daily-quiz', destination: 'https://bunnyverse.org/anime/api/cron/ensure-daily-quiz', basePath: false,
    });
    for (const r of rules) expect(r.destination).toBe(`https://bunnyverse.org/anime${r.source}`);
  });

  it('a build at the root of its domain gets none (its crons reach their routes as they are)', () => {
    expect(cronProxyRewrites(HUB_FV, vercelCrons)).toEqual([]);
    expect(cronProxyRewrites(REGISTRY.kpop, vercelCrons)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// next.config.ts per build

async function loadConfig(site: SiteId, opts: { fandomVerse: boolean; indexing?: string; vercelEnv?: string }): Promise<NextConfig> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site === 'kpop' ? '' : site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NET_INDEXING', opts.indexing ?? '');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  vi.stubEnv('VERCEL_ENV', opts.vercelEnv ?? '');
  if (opts.fandomVerse) {
    vi.doMock('./registry', async (importOriginal) => {
      const m = await importOriginal<typeof import('./registry')>();
      const registry = { ...m.REGISTRY, anime: ANIME_FV, hub: HUB_FV };
      return { ...m, REGISTRY: registry, SITE: registry[m.SITE_ID] };
    });
  }
  return (await import('../../../next.config')).default;
}

type Rewrites = { beforeFiles: { source: string; destination: string; basePath?: false }[]; afterFiles: unknown[]; fallback: unknown[] };
type Headers = { source: string; has?: { type: string; value: string }[]; missing?: { type: string; value: string }[]; headers: { key: string; value: string }[] }[];

const VERCEL_APP_RULE = { source: '/:path*', has: [{ type: 'host', value: VERCEL_APP_HOST }], headers: NOINDEX };
// ADMIN-1 (owner, 2026-10-30): every admin page and every /api/admin answer is never indexed and never stored, on every build.
const ADMIN_HEADERS = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }];
const ADMIN_RULES = ['/admin', '/admin/:path*', '/api/admin/:path*'].map((source) => ({ source, headers: ADMIN_HEADERS }));
const isAdminRule = (x: { source: string }): boolean => ADMIN_RULES.some((r) => r.source === x.source);

describe('next.config.ts', () => {
  it('kpop: today\'s object, untouched (no basePath, no asset prefix, no microfrontends keys, the same rewrites)', async () => {
    const c = await loadConfig('kpop', { fandomVerse: true, indexing: '1' });
    expect(Object.keys(c).sort()).toEqual(['compress', 'env', 'headers', 'images', 'poweredByHeader', 'reactStrictMode', 'redirects', 'rewrites', 'transpilePackages']);
    expect(c.transpilePackages).toEqual(['@kpopquiz/shared']);
    const r = (await c.rewrites!()) as Rewrites;
    expect(r.beforeFiles.every((x) => x.basePath === undefined)).toBe(true);
    const h = (await c.headers!()) as Headers;
    expect(h.some((x) => x.missing || x.has)).toBe(false);
  });

  it('anime on bunnyverse.org: basePath /anime, Next\'s own asset prefix, the cron proxies first, noindex on its vercel.app hosts once open', async () => {
    const c = await loadConfig('anime', { fandomVerse: true, indexing: '1' });
    expect(c.basePath).toBe('/anime');
    expect(c.assetPrefix).toBeUndefined();
    expect(c.transpilePackages).toContain('@vercel/microfrontends');
    const r = (await c.rewrites!()) as Rewrites;
    const crons = r.beforeFiles.filter((x) => x.basePath === false);
    expect(crons.length).toBe(new Set(vercelCrons).size);
    expect(r.beforeFiles.slice(0, crons.length)).toEqual(crons);
    expect(r.beforeFiles.some((x) => x.source.startsWith('/:path('))).toBe(true);
    const h = (await c.headers!()) as Headers;
    expect(h[0]).toEqual(VERCEL_APP_RULE);
    expect(h.some((x) => x.missing)).toBe(false);
    expect(h.filter((x) => x.headers.some((y) => y.key === 'X-Robots-Tag') && !isAdminRule(x))).toEqual([VERCEL_APP_RULE]);
    expect(h.filter(isAdminRule)).toEqual(ADMIN_RULES);
  });

  it('anime while closed: every answer says noindex (the closed rule), the vercel.app rule stays, no "every host but" rule', async () => {
    const c = await loadConfig('anime', { fandomVerse: true, indexing: '' });
    const h = (await c.headers!()) as Headers;
    expect(h.some((x) => x.missing)).toBe(false);
    expect(h[0]).toEqual(VERCEL_APP_RULE);
    expect(h).toContainEqual({ source: String.raw`/((?!robots\.txt|sitemap\.xml).*)`, headers: NOINDEX });
  });

  it('a preview build of anime or hub: noindex on every host, whatever NET_INDEXING says', async () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const vercelEnv of ['preview', 'development']) {
        const c = await loadConfig(site, { fandomVerse: true, indexing: '1', vercelEnv });
        const h = (await c.headers!()) as Headers;
        expect(h[0], `${site} ${vercelEnv}`).toEqual({ source: '/:path*', headers: NOINDEX });
        expect(h.some((x) => x.missing || x.has), `${site} ${vercelEnv}`).toBe(false);
      }
    }
  });

  it('a production build of anime or hub: the vercel.app rule only, whatever NET_INDEXING says', async () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const indexing of ['', '1']) {
        const c = await loadConfig(site, { fandomVerse: true, indexing, vercelEnv: 'production' });
        const h = (await c.headers!()) as Headers;
        expect(h[0], `${site} ${indexing}`).toEqual(VERCEL_APP_RULE);
        expect(h.some((x) => x.missing), `${site} ${indexing}`).toBe(false);
      }
    }
  });

  it('hub on bunnyverse.org: the default application, no basePath, no cron proxy', async () => {
    const c = await loadConfig('hub', { fandomVerse: true, indexing: '1' });
    expect(c.basePath).toBeUndefined();
    expect(c.assetPrefix).toBeUndefined();
    expect(c.transpilePackages).toContain('@vercel/microfrontends');
    const r = (await c.rewrites!()) as Rewrites;
    expect(r.beforeFiles.some((x) => x.basePath === false)).toBe(false);
    const h = (await c.headers!()) as Headers;
    expect(h[0]).toEqual(VERCEL_APP_RULE);
    expect(h.some((x) => x.missing)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// The home of a build gets the headers of every other page (finding 2). Next prefixes each header source with the base path
// (processRoutes in next/dist/lib/load-custom-routes.js): '/((?!embed/).*)' becomes '/anime/((?!embed/).*)', which does not match
// /anime, while a source '/' becomes '/anime'. The headers a path gets are computed here with Next's own code: loadCustomRoutes
// (validation and base path), buildCustomRoute (the regex of the routes manifest), matchHas, and the order of resolve-routes.js
// (every matching rule, in order, a later value of a key replacing an earlier one).

type LoadCustomRoutes = (config: NextConfig) => Promise<{ headers: Header[]; rewrites: { beforeFiles: Rewrite[]; afterFiles: Rewrite[]; fallback: Rewrite[] } }>;
// The module is CommonJS with a default export: depending on the interop, `default` is the function or the exports object.
const customRoutesModule = customRoutes as unknown as { default: LoadCustomRoutes | { default: LoadCustomRoutes } };
const loadCustomRoutes: LoadCustomRoutes = typeof customRoutesModule.default === 'function' ? customRoutesModule.default : customRoutesModule.default.default;

async function headersAt(c: NextConfig, paths: readonly string[], host = 'bunnyverse.org'): Promise<Record<string, Record<string, string>>> {
  const routes = await loadCustomRoutes({ ...c, basePath: c.basePath ?? '', trailingSlash: false, i18n: null } as NextConfig);
  const rules = routes.headers.map((r) => buildCustomRoute('header', r));
  const req = { headers: { host } } as unknown as Parameters<typeof matchHas>[0];
  return Object.fromEntries(paths.map((p) => {
    const out: Record<string, string> = {};
    for (const r of rules) {
      if (new RegExp(r.regex).test(p) && matchHas(req, {}, r.has, r.missing) !== false) for (const h of r.headers) out[h.key] = h.value;
    }
    return [p, out];
  }));
}

const FRAME_SELF = { 'Content-Security-Policy': "frame-ancestors 'self'", 'X-Frame-Options': 'SAMEORIGIN' };
const CLOSED = { 'X-Robots-Tag': 'noindex, nofollow' };

describe('the home of a build gets the security headers and the noindex of every other page', () => {
  it('kpop: headers() is today\'s list, value for value, and its home already gets the framing headers', async () => {
    const c = await loadConfig('kpop', { fandomVerse: true, indexing: '' });
    expect(await c.headers!()).toEqual([
      { source: '/embed/:path*', headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }] },
      ...ADMIN_RULES,
      { source: '/((?!embed/).*)', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
    ]);
    const at = await headersAt(c, ['/', '/q/x', '/embed/x', '/admin', '/admin/quiz-bank', '/admin/k7q2m/code', '/api/admin/stats', '/administrator'], 'kpopquiz.org');
    expect(at['/']).toEqual(FRAME_SELF);
    expect(at['/q/x']).toEqual(FRAME_SELF);
    expect(at['/embed/x']).toEqual({ 'Content-Security-Policy': 'frame-ancestors *' });
    // ADMIN-1: the admin pages, the MFA pages and the admin routes get the noindex and the no-store; nothing else does.
    for (const p of ['/admin', '/admin/quiz-bank', '/admin/k7q2m/code']) expect(at[p], p).toEqual({ ...FRAME_SELF, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
    expect(at['/api/admin/stats']).toMatchObject({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
    expect(at['/administrator']).toEqual(FRAME_SELF);
  });

  it('anime closed: /anime gets X-Frame-Options, frame-ancestors \'self\' and the noindex, like /anime/q/x (it got none before)', async () => {
    const c = await loadConfig('anime', { fandomVerse: true, indexing: '' });
    expect(((await c.headers!()) as Headers).at(-1)).toEqual({
      source: '/', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, ...Object.entries(FRAME_SELF).map(([key, value]) => ({ key, value }))],
    });
    const at = await headersAt(c, ['/anime', '/anime/q/x', '/anime/series', '/anime/embed/x']);
    expect(at['/anime/q/x']).toEqual({ ...CLOSED, ...FRAME_SELF });
    expect(at['/anime']).toEqual(at['/anime/q/x']);
    expect(at['/anime']).toEqual(at['/anime/series']);
    expect(at['/anime/embed/x']).toEqual({ ...CLOSED, 'Content-Security-Policy': 'frame-ancestors *' });
  });

  it('anime open: /anime gets the framing headers and no noindex on bunnyverse.org, the noindex on a vercel.app host', async () => {
    const c = await loadConfig('anime', { fandomVerse: true, indexing: '1', vercelEnv: 'production' });
    const at = await headersAt(c, ['/anime', '/anime/q/x']);
    expect(at['/anime']).toEqual(FRAME_SELF);
    expect(at['/anime']).toEqual(at['/anime/q/x']);
    const vercel = await headersAt(c, ['/anime', '/anime/q/x'], 'otakuquiz.vercel.app');
    expect(vercel['/anime']).toEqual({ ...CLOSED, ...FRAME_SELF });
    expect(vercel['/anime']).toEqual(vercel['/anime/q/x']);
  });

  it('hub closed and open: / gets the headers of /privacy (the two rules already matched it, the home rule repeats the values)', async () => {
    for (const indexing of ['', '1']) {
      const c = await loadConfig('hub', { fandomVerse: true, indexing, vercelEnv: 'production' });
      const at = await headersAt(c, ['/', '/privacy']);
      expect(at['/'], indexing).toEqual(indexing ? FRAME_SELF : { ...CLOSED, ...FRAME_SELF });
      expect(at['/'], indexing).toEqual(at['/privacy']);
      expect(((await c.headers!()) as Headers).filter((x) => x.source === '/'), indexing).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// vercel.json on the hub and anime builds (finding 5): read, or the build fails naming the file. kpop never reads it.

describe('the cron paths of vercel.json', () => {
  it('cronPathsOf: the path of every cron, in order', () => {
    expect(cronPathsOf(readFileSync(`${APP}vercel.json`, 'utf8'), 'vercel.json')).toEqual(vercelCrons);
    expect(cronPathsOf('{"crons":[]}', 'vercel.json')).toEqual([]);
  });

  it('cronPathsOf: invalid JSON, no crons array or a cron without a path throws, naming the file', () => {
    expect(() => cronPathsOf('{ "crons": [', '/x/vercel.json')).toThrow(/\/x\/vercel\.json is not valid JSON/);
    for (const text of ['{}', 'null', '[]', '{"crons":{}}', '{"crons":"x"}']) {
      expect(() => cronPathsOf(text, '/x/vercel.json'), text).toThrow(/\/x\/vercel\.json has no "crons" array/);
    }
    for (const text of ['{"crons":[{"schedule":"* * * * *"}]}', '{"crons":[{"path":""}]}', '{"crons":[null]}', '{"crons":[{"path":3}]}']) {
      expect(() => cronPathsOf(text, '/x/vercel.json'), text).toThrow(/\/x\/vercel\.json: crons\[0\] has no "path" string/);
    }
  });

  describe('next.config.ts run from a folder whose vercel.json is missing or invalid', () => {
    let dir = '';
    afterEach(() => { vi.restoreAllMocks(); if (dir) rmSync(dir, { recursive: true, force: true }); dir = ''; });

    /** A folder with apps/quiz's src (next.config.ts builds the UX stylesheet from src/styles) and the given vercel.json, if any. */
    function cwdWith(vercelJson: string | null): void {
      dir = mkdtempSync(join(tmpdir(), 'o1-zones-'));
      symlinkSync(join(APP, 'src'), join(dir, 'src'));
      if (vercelJson !== null) writeFileSync(join(dir, 'vercel.json'), vercelJson);
      vi.spyOn(process, 'cwd').mockReturnValue(dir);
    }

    it('hub and anime: the build fails and the error names vercel.json', async () => {
      for (const site of ['hub', 'anime'] as const) {
        cwdWith(null);
        await expect(loadConfig(site, { fandomVerse: true }), `${site} missing`).rejects.toThrow(/Cannot read .*vercel\.json/);
        vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true });
        cwdWith('{ "crons": [');
        await expect(loadConfig(site, { fandomVerse: true }), `${site} invalid`).rejects.toThrow(/vercel\.json is not valid JSON/);
        vi.restoreAllMocks(); rmSync(dir, { recursive: true, force: true });
        cwdWith('{"regions":["dub1"]}');
        await expect(loadConfig(site, { fandomVerse: true }), `${site} no crons`).rejects.toThrow(/vercel\.json has no "crons" array/);
      }
    });

    it('kpop: never reads vercel.json, so its config loads without it, unchanged', async () => {
      cwdWith(null);
      const c = await loadConfig('kpop', { fandomVerse: true });
      expect(Object.keys(c).sort()).toEqual(['compress', 'env', 'headers', 'images', 'poweredByHeader', 'reactStrictMode', 'redirects', 'rewrites', 'transpilePackages']);
      const r = (await c.rewrites!()) as Rewrites;
      expect(r.beforeFiles.some((x) => x.basePath === false)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// The cron proxies of the anime build (finding 4). vercel.json has no /anime, so on the otakuquiz project each cron hits
// /api/cron/<name> of its own deployment, which serves nothing outside /anime; next.config.ts rewrites it (basePath: false) to
// https://bunnyverse.org/anime/api/cron/<name>.
//
// (a) The cron's `Authorization: Bearer <CRON_SECRET>` must reach the route. A rewrite to an absolute URL is a reverse proxy: Next's
// docs say rewrites "act as a URL proxy" (next/dist/docs, rewrites.md), and Next's own server runs it with http-proxy
// (next/dist/server/lib/router-utils/proxy-request.js, called by router-server.js for an external destination), which sends the
// incoming request with its headers to the destination (changeOrigin only replaces Host, and it adds x-forwarded-host). The test
// below runs that very function. On Vercel the platform's proxy serves the rewrite of the routes manifest; it forwards the request
// headers the same way (Vercel docs, Rewrites, external rewrites), which a unit test cannot run: the launch-day check of the
// RUNBOOK (otakuquiz logs, /anime/api/cron answering 200, never 401) is the proof there.
// (b) A cron of the otakuquiz project can never land on the hub: every proxied destination is the anime url followed by a cron
// route, the Microfrontends group routes each of them to otakuquiz, and the hub build has no such proxy.

describe('the cron proxies of the anime build', () => {
  it('every destination is the anime url + a cron route, stays under /anime once normalised, and the group routes it to otakuquiz', async () => {
    const rules = cronProxyRewrites(ANIME_FV, vercelCrons);
    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.destination.startsWith(`${ANIME_FV.url}/api/`), r.destination).toBe(true);
      expect(r.destination).toBe(`${ANIME_FV.url}${r.source}`);
      expect(r.source, r.source).toMatch(CRON_ROUTE_RE);
      const u = new URL(r.destination);
      expect(u.origin).toBe('https://bunnyverse.org');
      expect(u.pathname).toBe(`/anime${r.source}`);
      expect(u.search + u.hash).toBe('');
    }
    // Every cron route of vercel.json is under /api/cron/, but for the ranked nightly job (kpop only, it answers its 200 skip on anime).
    expect(rules.filter((r) => !r.destination.startsWith(`${ANIME_FV.url}/api/cron/`)).map((r) => r.source)).toEqual(['/api/ranked/cron/nightly']);
    expect(() => validateRouting(MFE, { otakuquiz: rules.map((r) => new URL(r.destination).pathname) })).not.toThrow();
  });

  it('a vercel.json path that is not a cron route fails the anime build, naming vercel.json; the hub and kpop proxy nothing', () => {
    for (const bad of [
      '/api/cron/../../privacy', '/api/cron/x/../../../', '//evil.example/api/cron/x', '/api/cron/x?next=/privacy', '/api/cron/x#y',
      '/api/cron/:path*', '/api/cron/(.*)', '/privacy', '/', 'api/cron/x', '/API/cron/x', '/api/cron/', '/anime/api/cron/x',
    ]) {
      expect(() => cronProxyRewrites(ANIME_FV, ['/api/cron/ensure-daily-quiz', bad]), bad).toThrow(/^vercel\.json: cron path .* is not a cron route/);
      expect(cronProxyRewrites(HUB_FV, [bad]), bad).toEqual([]);
      expect(cronProxyRewrites(REGISTRY.kpop, [bad]), bad).toEqual([]);
    }
  });

  it('Next keeps each proxy outside the base path and its destination as it is; the hub build has no external rewrite at all', async () => {
    const anime = await loadConfig('anime', { fandomVerse: true, indexing: '1' });
    const animeRoutes = await loadCustomRoutes({ ...anime, basePath: anime.basePath ?? '', trailingSlash: false, i18n: null } as NextConfig);
    const animeExternal = [...animeRoutes.rewrites.beforeFiles, ...animeRoutes.rewrites.afterFiles, ...animeRoutes.rewrites.fallback]
      .filter((r) => /^https?:/.test(r.destination));
    expect(animeExternal.map((r) => ({ source: r.source, destination: r.destination })))
      .toEqual(cronProxyRewrites(ANIME_FV, vercelCrons).map((r) => ({ source: r.source, destination: r.destination })));

    const hub = await loadConfig('hub', { fandomVerse: true, indexing: '1' });
    const hubRewrites = (await hub.rewrites!()) as { beforeFiles: Rewrite[]; afterFiles: Rewrite[]; fallback: Rewrite[] };
    const all = [...hubRewrites.beforeFiles, ...hubRewrites.afterFiles, ...hubRewrites.fallback];
    expect(all.some((r) => r.basePath === false)).toBe(false);
    expect(all.some((r) => /^https?:/.test(r.destination) || r.destination.includes('/api/cron/'))).toBe(false);
  });

  it('the proxy forwards the cron request with its Authorization header to the destination path (Next\'s own external rewrite proxy)', async () => {
    const anime = await loadConfig('anime', { fandomVerse: true, indexing: '1' });
    const rule = ((await anime.rewrites!()) as Rewrites).beforeFiles.find((r) => r.source === '/api/cron/ensure-daily-quiz')!;
    expect(rule.destination).toBe('https://bunnyverse.org/anime/api/cron/ensure-daily-quiz');

    const seen: { method: string | undefined; url: string | undefined; authorization: string | undefined; userAgent: string | undefined; forwardedHost: string | undefined }[] = [];
    const target = createServer((req, res) => {
      seen.push({ method: req.method, url: req.url, authorization: req.headers.authorization, userAgent: req.headers['user-agent'], forwardedHost: req.headers['x-forwarded-host'] as string | undefined });
      res.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => target.listen(0, '127.0.0.1', resolve));
    // The destination of the rule with its origin swapped for a local server (bunnyverse.org is not reachable from a unit test).
    const local = `http://127.0.0.1:${(target.address() as AddressInfo).port}${new URL(rule.destination).pathname}`;
    const front = createServer((req, res) => { void proxyRequest(req, res, parseUrl(local, true) as unknown as NextUrlWithParsedQuery, undefined, undefined, 5000); });
    await new Promise<void>((resolve) => front.listen(0, '127.0.0.1', resolve));
    try {
      const frontHost = `127.0.0.1:${(front.address() as AddressInfo).port}`;
      const res = await fetch(`http://${frontHost}${rule.source}`, { headers: { authorization: 'Bearer o1-test-cron-secret', 'user-agent': 'vercel-cron/1.0' } });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('{"ok":true}');
      expect(seen).toEqual([{
        method: 'GET', url: '/anime/api/cron/ensure-daily-quiz', authorization: 'Bearer o1-test-cron-secret', userAgent: 'vercel-cron/1.0', forwardedHost: frontHost,
      }]);
    } finally {
      front.closeAllConnections(); front.close();
      target.closeAllConnections(); target.close();
    }
  });
});

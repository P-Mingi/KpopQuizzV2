// FandomVerse (lane 1): the Vercel Microfrontends group of fandomverse.org (apps/quiz/microfrontends.json) and the next.config.ts
// of each build (docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md). The registry values of FandomVerse are stubbed where they matter
// (`fandomVerse` below), so the test says the same thing before and after the registry carries https://fandomverse.org/anime.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { validateRouting } from '@vercel/microfrontends/next/testing';
import { buildCustomRoute } from 'next/dist/lib/build-custom-route';
import * as customRoutes from 'next/dist/lib/load-custom-routes';
import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY } from './registry';
import { MFE_APPLICATIONS, VERCEL_APP_HOST, canonicalHost, cronProxyRewrites, deploymentHostNoindexHeaders } from './zones';

import type { NextConfig } from 'next';
import type { Header } from 'next/dist/lib/load-custom-routes';
import type { SiteConfig, SiteId } from './types';

const APP = fileURLToPath(new URL('../../../', import.meta.url));
const MFE = `${APP}microfrontends.json`;

const ANIME_FV: SiteConfig = { ...REGISTRY.anime, url: 'https://fandomverse.org/anime', domain: 'fandomverse.org' };
const HUB_FV: SiteConfig = { ...REGISTRY.hub, url: 'https://fandomverse.org', domain: 'fandomverse.org' };

const vercelCrons = (JSON.parse(readFileSync(`${APP}vercel.json`, 'utf8')) as { crons: { path: string }[] }).crons.map((c) => c.path);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('./registry'); });

describe('microfrontends.json: the group of fandomverse.org', () => {
  it('names the two Vercel projects: the hub is the default application, OtakuQuiz the child; kpop is in no group', () => {
    const config = JSON.parse(readFileSync(MFE, 'utf8')) as { applications: Record<string, { routing?: unknown; development?: { fallback?: string } }> };
    expect(Object.keys(config.applications).sort()).toEqual([MFE_APPLICATIONS.hub, MFE_APPLICATIONS.anime].sort());
    expect(config.applications[MFE_APPLICATIONS.hub!]!.routing).toBeUndefined();
    expect(config.applications[MFE_APPLICATIONS.hub!]!.development?.fallback).toBe('fandomverse.org');
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
  it('the canonical host of the hub and of OtakuQuiz is fandomverse.org', () => {
    expect(canonicalHost(HUB_FV)).toBe('fandomverse.org');
    expect(canonicalHost(ANIME_FV)).toBe('fandomverse.org');
    expect(canonicalHost(REGISTRY.kpop)).toBe('kpopquiz.org');
  });

  it('a production build: one rule, X-Robots-Tag noindex, nofollow when the host is a *.vercel.app host (dots escaped, no missing)', () => {
    for (const env of ['production', '', undefined]) {
      expect(deploymentHostNoindexHeaders(env), String(env)).toEqual([{ source: '/:path*', has: [{ type: 'host', value: '.+\\.vercel\\.app' }], headers: NOINDEX }]);
    }
    expect(VERCEL_APP_HOST).toBe(String.raw`.+\.vercel\.app`);
  });

  it('Next applies it on a vercel.app host and on no other host, fandomverse.org and a future domain included', () => {
    const [rule] = deploymentHostNoindexHeaders('production');
    for (const host of ['otakuquiz.vercel.app', 'fandomverse.vercel.app', 'otakuquiz-git-main-team.vercel.app', 'OtakuQuiz-abc123-team.vercel.app:443']) {
      expect(appliesOn(rule!, host), host).toBe(true);
    }
    for (const host of [
      'fandomverse.org', 'fandomverse.org:443', 'www.fandomverse.org', 'staging.fandomverse.org', 'anime.example', 'localhost',
      'vercel.app', 'evilvercel.app', 'otakuquiz.vercelxapp', 'otakuquiz.vercel.app.example.org',
    ]) {
      expect(appliesOn(rule!, host), host).toBe(false);
    }
  });

  it('a preview or development build: the rule has no host condition, so every host says noindex', () => {
    for (const env of ['preview', 'development']) {
      const rules = deploymentHostNoindexHeaders(env);
      expect(rules, env).toEqual([{ source: '/:path*', headers: NOINDEX }]);
      for (const host of ['fandomverse.org', 'otakuquiz-git-x-team.vercel.app', 'preview.fandomverse.org']) expect(appliesOn(rules[0]!, host), host).toBe(true);
    }
  });

  it('no rule of any build is "every host but fandomverse.org" (no missing condition)', () => {
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
      source: '/api/cron/ensure-daily-quiz', destination: 'https://fandomverse.org/anime/api/cron/ensure-daily-quiz', basePath: false,
    });
    for (const r of rules) expect(r.destination).toBe(`https://fandomverse.org/anime${r.source}`);
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

  it('anime on fandomverse.org: basePath /anime, Next\'s own asset prefix, the cron proxies first, noindex on its vercel.app hosts once open', async () => {
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
    expect(h.filter((x) => x.headers.some((y) => y.key === 'X-Robots-Tag'))).toEqual([VERCEL_APP_RULE]);
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

  it('hub on fandomverse.org: the default application, no basePath, no cron proxy', async () => {
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

type LoadCustomRoutes = (config: NextConfig) => Promise<{ headers: Header[] }>;
// The module is CommonJS with a default export: depending on the interop, `default` is the function or the exports object.
const customRoutesModule = customRoutes as unknown as { default: LoadCustomRoutes | { default: LoadCustomRoutes } };
const loadCustomRoutes: LoadCustomRoutes = typeof customRoutesModule.default === 'function' ? customRoutesModule.default : customRoutesModule.default.default;

async function headersAt(c: NextConfig, paths: readonly string[], host = 'fandomverse.org'): Promise<Record<string, Record<string, string>>> {
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
      { source: '/((?!embed/).*)', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] },
    ]);
    const at = await headersAt(c, ['/', '/q/x', '/embed/x'], 'kpopquiz.org');
    expect(at['/']).toEqual(FRAME_SELF);
    expect(at['/q/x']).toEqual(FRAME_SELF);
    expect(at['/embed/x']).toEqual({ 'Content-Security-Policy': 'frame-ancestors *' });
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

  it('anime open: /anime gets the framing headers and no noindex on fandomverse.org, the noindex on a vercel.app host', async () => {
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

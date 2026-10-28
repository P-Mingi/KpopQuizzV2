// FandomVerse (lane 1): the Vercel Microfrontends group of fandomverse.org (apps/quiz/microfrontends.json) and the next.config.ts
// of each build (docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md). The registry values of FandomVerse are stubbed where they matter
// (`fandomVerse` below), so the test says the same thing before and after the registry carries https://fandomverse.org/anime.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { validateRouting } from '@vercel/microfrontends/next/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY } from './registry';
import { MFE_APPLICATIONS, canonicalHost, cronProxyRewrites, nonCanonicalHostHeaders } from './zones';

import type { NextConfig } from 'next';
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

describe('noindex on every host but the canonical one', () => {
  it('the canonical host of the hub and of OtakuQuiz is fandomverse.org', () => {
    expect(canonicalHost(HUB_FV)).toBe('fandomverse.org');
    expect(canonicalHost(ANIME_FV)).toBe('fandomverse.org');
    expect(canonicalHost(REGISTRY.kpop)).toBe('kpopquiz.org');
  });

  it('is one header rule matched per request by host: X-Robots-Tag noindex, nofollow when the host is not the canonical one', () => {
    expect(nonCanonicalHostHeaders(ANIME_FV)).toEqual([{
      source: '/:path*',
      missing: [{ type: 'host', value: 'fandomverse.org' }],
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }]);
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

async function loadConfig(site: SiteId, opts: { fandomVerse: boolean; indexing?: string }): Promise<NextConfig> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site === 'kpop' ? '' : site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NET_INDEXING', opts.indexing ?? '');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  vi.stubEnv('VERCEL_ENV', '');
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
type Headers = { source: string; missing?: { type: string; value: string }[]; headers: { key: string; value: string }[] }[];

describe('next.config.ts', () => {
  it('kpop: today\'s object, untouched (no basePath, no asset prefix, no microfrontends keys, the same rewrites)', async () => {
    const c = await loadConfig('kpop', { fandomVerse: true, indexing: '1' });
    expect(Object.keys(c).sort()).toEqual(['compress', 'env', 'headers', 'images', 'poweredByHeader', 'reactStrictMode', 'redirects', 'rewrites', 'transpilePackages']);
    expect(c.transpilePackages).toEqual(['@kpopquiz/shared']);
    const r = (await c.rewrites!()) as Rewrites;
    expect(r.beforeFiles.every((x) => x.basePath === undefined)).toBe(true);
    const h = (await c.headers!()) as Headers;
    expect(h.some((x) => x.missing)).toBe(false);
  });

  it('anime on fandomverse.org: basePath /anime, Next\'s own asset prefix, the cron proxies first, noindex off the canonical host once open', async () => {
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
    expect(h[0]).toEqual({ source: '/:path*', missing: [{ type: 'host', value: 'fandomverse.org' }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] });
  });

  it('anime while closed: every answer already says noindex, no host rule is added', async () => {
    const c = await loadConfig('anime', { fandomVerse: true, indexing: '' });
    const h = (await c.headers!()) as Headers;
    expect(h.some((x) => x.missing)).toBe(false);
    expect(h[0]!.headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);
  });

  it('hub on fandomverse.org: the default application, no basePath, no cron proxy', async () => {
    const c = await loadConfig('hub', { fandomVerse: true, indexing: '1' });
    expect(c.basePath).toBeUndefined();
    expect(c.assetPrefix).toBeUndefined();
    expect(c.transpilePackages).toContain('@vercel/microfrontends');
    const r = (await c.rewrites!()) as Rewrites;
    expect(r.beforeFiles.some((x) => x.basePath === false)).toBe(false);
    const h = (await c.headers!()) as Headers;
    expect(h[0]!.missing).toEqual([{ type: 'host', value: 'fandomverse.org' }]);
  });
});

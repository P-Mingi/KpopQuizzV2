// Run O1, lot (e), lane B7: POST /api/passport/revalidate (apis.md 3.3) and the signed sender.
// Bunnyverse (owner, 2026-10-28): the origins move from the old anime domain to bunnyverse.org. The Bunnyverse topology (hub and
// anime on https://bunnyverse.org, anime under '/anime') is given as a preview deployment (FV); the production answers are
// pinned against the registry url, so they hold before and after the registry moves.
import { createHmac } from 'node:crypto';

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';

import { handleRevalidate, notifyRevalidate, purgePaths, revalidateSecret, signRevalidate } from './revalidate';

const SECRET = 'revalidate-secret-value-0123456789';
const env = { PASSPORT_REVALIDATE_SECRET: SECRET, VERCEL_ENV: 'production' };
const FV = { PASSPORT_REVALIDATE_SECRET: SECRET, VERCEL_ENV: 'preview', NEXT_PUBLIC_NET_ORIGINS: 'kpop=https://kpopquiz.org,anime=https://bunnyverse.org,hub=https://bunnyverse.org' };

function req(raw: string, sig: string | null, headers: Record<string, string> = {}): NextRequest {
  const h: Record<string, string> = { 'content-type': 'application/json', ...headers };
  if (sig !== null) h['x-passport-signature'] = sig;
  return new NextRequest('https://bunnyverse.org/anime/api/passport/revalidate', { method: 'POST', body: raw, headers: h });
}

const body = (o: unknown): string => JSON.stringify(o);

describe('signature', () => {
  it('b64u(HMAC-SHA256(secret, "pp-revalidate.v1." + raw body))', () => {
    const raw = body({ username: 'fan_one', sites: ['anime'] });
    expect(signRevalidate(SECRET, raw)).toBe(createHmac('sha256', SECRET).update(`pp-revalidate.v1.${raw}`).digest('base64url'));
  });

  it('a secret shorter than 16 characters is no secret', () => {
    expect(revalidateSecret({ PASSPORT_REVALIDATE_SECRET: 'short' })).toBeNull();
    expect(revalidateSecret({})).toBeNull();
    expect(revalidateSecret(env)).toBe(SECRET);
  });
});

describe('POST /api/passport/revalidate', () => {
  it('401 signature for a missing or wrong signature, a tampered body, or no secret configured', async () => {
    const raw = body({ username: 'fan_one', sites: ['anime'] });
    const purged: string[] = [];
    const ctx = { site: 'anime' as const, env, purge: (p: string) => { purged.push(p); } };
    for (const sig of [null, 'AAAA', signRevalidate('another-secret-0123456789', raw)]) {
      const res = await handleRevalidate(req(raw, sig), ctx);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'signature' });
    }
    expect((await handleRevalidate(req(`${raw} `, signRevalidate(SECRET, raw)), ctx)).status).toBe(401);
    expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw)), { ...ctx, env: {} })).status).toBe(401);
    expect(purged).toEqual([]);
  });

  it('400 bad_request for a signed body that is wrong: username, sites, JSON', async () => {
    const ctx = { site: 'anime' as const, env, purge: () => undefined };
    for (const raw of [
      body({ username: 'Bad Name', sites: ['anime'] }), body({ username: 'ab', sites: ['anime'] }), body({ username: 'fan_one', sites: ['moon'] }),
      body({ username: 'fan_one', sites: [] }), body({ username: 'fan_one' }), '[1]', '{oops',
    ]) {
      const res = await handleRevalidate(req(raw, signRevalidate(SECRET, raw)), ctx);
      expect(res.status, raw).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad_request' });
    }
  });

  it('204 after the purge on a site of the list: the public path and the internal path of anime and hub', async () => {
    const raw = body({ username: 'fan_one', sites: ['kpop', 'anime'] });
    for (const [site, paths] of [['anime', ['/u/fan_one', '/sites/anime/u/fan_one']], ['kpop', ['/u/fan_one']]] as const) {
      const purged: string[] = [];
      const res = await handleRevalidate(req(raw, signRevalidate(SECRET, raw)), { site, env, purge: (p) => { purged.push(p); } });
      expect(res.status).toBe(204);
      expect(purged).toEqual(paths);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    }
  });

  it('204 and no purge when this site is not in the list; a replay purges again, nothing else', async () => {
    const raw = body({ username: 'fan_one', sites: ['kpop'] });
    const purged: string[] = [];
    const ctx = { site: 'anime' as const, env, purge: (p: string) => { purged.push(p); } };
    expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw)), ctx)).status).toBe(204);
    expect(purged).toEqual([]);
    const raw2 = body({ username: 'fan_one', sites: ['anime'] });
    await handleRevalidate(req(raw2, signRevalidate(SECRET, raw2)), ctx);
    await handleRevalidate(req(raw2, signRevalidate(SECRET, raw2)), ctx);
    expect(purged).toHaveLength(4);
  });

  it('403 origin for an Origin header that is not this site, 400 for a body that is not JSON', async () => {
    const raw = body({ username: 'fan_one', sites: ['anime'] });
    const ctx = { site: 'anime' as const, env, purge: () => undefined };
    expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw), { origin: 'https://evil.example' }), ctx)).status).toBe(403);
    expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw), { origin: new URL(REGISTRY.anime.url).origin }), ctx)).status).toBe(204);
    expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw), { 'content-type': 'text/plain' }), ctx)).status).toBe(400);
  });

  it('bunnyverse.org: hub and anime accept their one origin exactly; a look-alike, a path, a scheme or a port is 403', async () => {
    const raw = body({ username: 'fan_one', sites: ['anime', 'hub'] });
    for (const site of ['anime', 'hub'] as const) {
      const ctx = { site, env: FV, purge: () => undefined };
      expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw), { origin: 'https://bunnyverse.org' }), ctx)).status).toBe(204);
      for (const origin of ['https://bunnyverse.org.evil.com', 'https://evil.com', 'https://bunnyverse.org/anime', 'http://bunnyverse.org', 'https://bunnyverse.org:444', 'https://kpopquiz.org', 'null']) {
        expect((await handleRevalidate(req(raw, signRevalidate(SECRET, raw), { origin }), ctx)).status, `${site} ${origin}`).toBe(403);
      }
    }
  });

  it('a purge that throws is not an error', async () => {
    const raw = body({ username: 'fan_one', sites: ['anime'] });
    const res = await handleRevalidate(req(raw, signRevalidate(SECRET, raw)), { site: 'anime', env, purge: () => { throw new Error('unknown path'); } });
    expect(res.status).toBe(204);
  });

  it('purgePaths', () => {
    expect(purgePaths('hub', 'fan_one')).toEqual(['/u/fan_one', '/sites/hub/u/fan_one']);
  });
});

describe('notifyRevalidate (the sender)', () => {
  it('posts the signed body to the revalidate route of every site once, with a timeout signal', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
    const out = await notifyRevalidate('fan_one', ['kpop', 'anime', 'anime'], { env: FV, fetchImpl });
    expect(out).toEqual({ sent: 2, failed: 0 });
    expect(calls.map((c) => c.url).sort()).toEqual(['https://bunnyverse.org/anime/api/passport/revalidate', 'https://kpopquiz.org/api/passport/revalidate']);
    for (const c of calls) {
      const raw = String(c.init.body);
      expect(JSON.parse(raw)).toEqual({ username: 'fan_one', sites: ['kpop', 'anime'] });
      expect((c.init.headers as Record<string, string>)['x-passport-signature']).toBe(signRevalidate(SECRET, raw));
      expect(c.init.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('reaches the hub at the root of bunnyverse.org and anime under /anime; on production, the registry origin and the basePath', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => { urls.push(url); return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
    await notifyRevalidate('fan_one', ['hub', 'anime'], { env: FV, fetchImpl });
    expect(urls.sort()).toEqual(['https://bunnyverse.org/anime/api/passport/revalidate', 'https://bunnyverse.org/api/passport/revalidate']);
    urls.length = 0;
    await notifyRevalidate('fan_one', ['kpop', 'anime', 'hub'], { env, fetchImpl });
    expect(urls.sort()).toEqual([
      `${new URL(REGISTRY.anime.url).origin}/anime/api/passport/revalidate`,
      `${new URL(REGISTRY.hub.url).origin}/api/passport/revalidate`,
      'https://kpopquiz.org/api/passport/revalidate',
    ].sort());
  });

  it('counts a failure or a timeout, never throws; no secret or a bad username sends nothing', async () => {
    const boom = (async () => { throw new Error('timeout'); }) as unknown as typeof fetch;
    expect(await notifyRevalidate('fan_one', ['anime'], { env, fetchImpl: boom })).toEqual({ sent: 0, failed: 1 });
    let n = 0;
    const spy = (async () => { n += 1; return new Response(null, { status: 204 }); }) as unknown as typeof fetch;
    expect(await notifyRevalidate('fan_one', ['anime'], { env: {}, fetchImpl: spy })).toEqual({ sent: 0, failed: 0 });
    expect(await notifyRevalidate('Bad Name', ['anime'], { env, fetchImpl: spy })).toEqual({ sent: 0, failed: 0 });
    expect(n).toBe(0);
  });
});

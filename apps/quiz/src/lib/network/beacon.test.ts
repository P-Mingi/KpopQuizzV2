// Run O1, lot (c), lane B6: POST /api/n/b (apis.md 4.2): statuses, the flag, the rate limit, the rows, nothing personal stored.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';

import { BEACON_LIMIT, BEACON_MAX_BYTES, handleBeacon, parseBeacon, resetBeaconLimit } from './beacon';

import type { BeaconCtx } from './beacon';

const ENV = { NEXT_PUBLIC_NET_BEACON: '1', NET_IP_HASH_SALT: 'test-salt-not-a-secret' } as const;
const calls: Array<Record<string, unknown>> = [];
const ctx = (over: Partial<BeaconCtx> = {}): BeaconCtx => ({
  site: 'kpop', env: ENV, now: () => 1_000_000, signedIn: async () => false, bump: async (a) => { calls.push({ ...a }); }, ...over,
});

function req(body: unknown, init: { origin?: string | null; type?: string; ip?: string; raw?: boolean } = {}): NextRequest {
  const headers: Record<string, string> = { 'content-type': init.type ?? 'application/json', 'x-forwarded-for': init.ip ?? '203.0.113.7' };
  if (init.origin !== null) headers.origin = init.origin ?? 'https://kpopquiz.org';
  return new NextRequest('https://kpopquiz.org/api/n/b', { method: 'POST', headers, body: init.raw ? (body as string) : JSON.stringify(body) });
}
const GOOD = { dst: 'anime', bridge: 'menu', step: 'shown' };

beforeEach(() => { calls.length = 0; resetBeaconLimit(); });

describe('parseBeacon', () => {
  it('accepts a NetBeacon and nothing else', () => {
    expect(parseBeacon(JSON.stringify(GOOD), 'kpop')).toEqual(GOOD);
    for (const bad of [
      { ...GOOD, dst: 'kpop' }, { ...GOOD, dst: 'mars' }, { ...GOOD, bridge: 'nope' }, { ...GOOD, step: 'join' },
      { ...GOOD, step: 'first_play' }, { dst: 'anime' }, [GOOD], 'x', null, 3,
    ]) expect(parseBeacon(JSON.stringify(bad), 'kpop')).toBeNull();
    expect(parseBeacon('{nope', 'kpop')).toBeNull();
  });
});

describe('statuses', () => {
  it('204 for a valid beacon, JSON or the text body of sendBeacon', async () => {
    expect((await handleBeacon(req(GOOD), ctx())).status).toBe(204);
    expect((await handleBeacon(req(GOOD, { type: 'text/plain;charset=UTF-8' }), ctx())).status).toBe(204);
    expect(calls).toHaveLength(2);
  });
  it('400 bad_request for an invalid body or one over 2 KB', async () => {
    for (const body of [{ ...GOOD, step: 'join' }, { ...GOOD, dst: 'kpop' }, 'plain words']) {
      const res = await handleBeacon(req(body), ctx());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad_request' });
    }
    const big = JSON.stringify({ ...GOOD, pad: 'x'.repeat(BEACON_MAX_BYTES) });
    expect((await handleBeacon(req(big, { raw: true }), ctx())).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it('403 origin when the Origin is not a site of the network, or missing', async () => {
    for (const origin of ['https://evil.example', 'http://kpopquiz.org', null]) {
      const res = await handleBeacon(req(GOOD, { origin }), ctx());
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'origin' });
    }
    expect((await handleBeacon(req(GOOD, { origin: 'https://otakuquiz.org' }), ctx())).status).toBe(204);
    expect(calls).toHaveLength(1);
  });
  it('the Referer stands in for a missing Origin', async () => {
    const r = new NextRequest('https://kpopquiz.org/api/n/b', { method: 'POST', headers: { referer: 'https://kpopquiz.org/quizzes', 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify(GOOD) });
    expect((await handleBeacon(r, ctx())).status).toBe(204);
    expect(calls).toHaveLength(1);
  });
  it('a local dev origin of NEXT_PUBLIC_NET_ORIGINS counts outside production only', async () => {
    const env = { ...ENV, NEXT_PUBLIC_NET_ORIGINS: 'kpop=http://kpop.localhost:3190' };
    expect((await handleBeacon(req(GOOD, { origin: 'http://kpop.localhost:3190' }), ctx({ env }))).status).toBe(204);
    expect(calls).toHaveLength(1);
    expect((await handleBeacon(req(GOOD, { origin: 'http://kpop.localhost:3190' }), ctx({ env: { ...env, VERCEL_ENV: 'production' } }))).status).toBe(403);
  });
});

describe('what is counted', () => {
  it('nothing with NEXT_PUBLIC_NET_BEACON off, still 204', async () => {
    expect((await handleBeacon(req(GOOD), ctx({ env: { ...ENV, NEXT_PUBLIC_NET_BEACON: undefined } }))).status).toBe(204);
    expect((await handleBeacon(req(GOOD), ctx({ env: { ...ENV, NEXT_PUBLIC_NET_BEACON: '0' } }))).status).toBe(204);
    expect(calls).toHaveLength(0);
  });
  it('nothing without NET_IP_HASH_SALT', async () => {
    expect((await handleBeacon(req(GOOD), ctx({ env: { NEXT_PUBLIC_NET_BEACON: '1' } }))).status).toBe(204);
    expect(calls).toHaveLength(0);
  });
  it('one row (SITE.id, dst) for shown, click, dismiss and optin, signed_in from the session', async () => {
    for (const step of ['shown', 'click', 'dismiss', 'optin']) await handleBeacon(req({ ...GOOD, step }), ctx());
    expect(calls.map((c) => [c.p_src, c.p_dst, c.p_step])).toEqual([
      ['kpop', 'anime', 'shown'], ['kpop', 'anime', 'click'], ['kpop', 'anime', 'dismiss'], ['kpop', 'anime', 'optin'],
    ]);
    expect(calls.every((c) => c.p_signed_in === false && c.p_n === 1 && c.p_bridge === 'menu')).toBe(true);
    await handleBeacon(req(GOOD, { ip: '203.0.113.50' }), ctx({ signedIn: async () => true }));
    expect(calls.at(-1)!.p_signed_in).toBe(true);
  });
  it('a land is the row (dst, SITE.id): the source site first', async () => {
    await handleBeacon(req({ dst: 'anime', bridge: 'menu', step: 'land' }), ctx());
    expect(calls[0]).toMatchObject({ p_src: 'anime', p_dst: 'kpop', p_step: 'land' });
  });
  it('stores no user id, no anonymous id and no address: the call carries six keys of the funnel only', async () => {
    await handleBeacon(req(GOOD), ctx());
    expect(Object.keys(calls[0]!).sort()).toEqual(['p_bridge', 'p_dst', 'p_n', 'p_signed_in', 'p_src', 'p_step']);
    expect(JSON.stringify(calls[0])).not.toMatch(/203\.0\.113|salt/);
  });
  it('over the IP-hash limit counts nothing, still 204; another address is its own counter', async () => {
    for (let i = 0; i < BEACON_LIMIT + 5; i += 1) expect((await handleBeacon(req(GOOD), ctx())).status).toBe(204);
    expect(calls).toHaveLength(BEACON_LIMIT);
    await handleBeacon(req(GOOD, { ip: '198.51.100.1' }), ctx());
    expect(calls).toHaveLength(BEACON_LIMIT + 1);
    await handleBeacon(req(GOOD), ctx({ now: () => 1_000_000 + 61_000 }));
    expect(calls).toHaveLength(BEACON_LIMIT + 2);
  });
  it('a failing count is still a 204', async () => {
    const res = await handleBeacon(req(GOOD), ctx({ bump: async () => { throw new Error('db down'); } }));
    expect(res.status).toBe(204);
  });
});

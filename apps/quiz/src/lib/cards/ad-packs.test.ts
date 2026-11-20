// KpopCards launch prep: the pack for a rewarded ad, the parts that run without a database: the flag (off by default), the signed callback (no
// grant without a valid signature, our ad unit, a fresh timestamp, a ticket id), the key list, the consent mode, and the route that ties them
// (nothing reaches the database unless every check passed). The ticket, the idempotence and the daily cap are proved on PGlite in ad-packs-sql.test.ts.
import { generateKeyPairSync, sign } from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcResult: { data: { granted: true, replayed: false }, error: null } as { data: unknown; error: { message: string } | null },
  ticketOwner: null as string | null,
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
  createServiceRoleClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.ticketOwner ? { user_id: h.ticketOwner } : null, error: null }) }) }) }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.rpcCalls.push({ fn, args });
      return h.rpcResult;
    },
  }),
}));

import { GET as ssv } from '@/app/api/cards/ad/ssv/route';
import { adPacksOn, adPacksPerDay, adPersonalisation, adUnitOf, createKeyCache, keysFromJson, parseSsv, rewardedRequestOptions, signatureValid, verifySsv, VERIFIER_KEYS_URL } from './ad-packs';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const other = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PEM = publicKey.export({ type: 'spki', format: 'pem' }) as string;
const KEYS = { '3335741209': PEM };
const ENV_ON = { NET_CARDS_AD_PACKS: '1', CARDS_AD_PACKS_PER_DAY: '3', CARDS_AD_SSV_AD_UNIT: '/1234/rewarded-pack' };
const TICKET = '4c1f3e0a-6a5b-4d0f-9d79-0a8c2f1e7b11';
const USER = '9b2d7a44-1c3e-4f5a-8b6d-2e1f0a9c8d77';
const NOW = Date.parse('2026-11-20T12:00:00Z');

function signed(over: Record<string, string> = {}, o: { key?: typeof privateKey; keyId?: string } = {}): string {
  const p = { ad_network: '5450213213286189855', ad_unit: '/1234/rewarded-pack', custom_data: TICKET, reward_amount: '1', reward_item: 'pack', timestamp: String(NOW), transaction_id: 'tx-0001', user_id: USER, ...over };
  const message = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const sig = sign('sha256', Buffer.from(message), { key: o.key ?? privateKey, dsaEncoding: 'der' }).toString('base64url');
  return `${message}&signature=${sig}&key_id=${o.keyId ?? '3335741209'}`;
}

describe('the flag', () => {
  it('is off by default and needs the flag, a daily cap above 0 and the ad unit of the callback', () => {
    expect(adPacksOn({})).toBe(false);
    expect(adPacksOn({ NET_CARDS_AD_PACKS: '1' })).toBe(false); // no ad unit: no callback can be matched
    expect(adPacksOn({ CARDS_AD_SSV_AD_UNIT: '/1234/rewarded-pack' })).toBe(false); // no flag
    expect(adPacksOn({ ...ENV_ON, NET_CARDS_AD_PACKS: '0' })).toBe(false);
    expect(adPacksOn({ ...ENV_ON, CARDS_AD_PACKS_PER_DAY: '0' })).toBe(false);
    expect(adPacksOn(ENV_ON)).toBe(true);
    expect(adPacksOn({ ...ENV_ON, NET_CARDS_AD_PACKS: 'true' })).toBe(true);
  });
  it('the daily cap defaults to 3, accepts a whole number and never passes 20', () => {
    expect(adPacksPerDay({})).toBe(3);
    expect(adPacksPerDay({ CARDS_AD_PACKS_PER_DAY: '5' })).toBe(5);
    expect(adPacksPerDay({ CARDS_AD_PACKS_PER_DAY: '999' })).toBe(20);
    expect(adPacksPerDay({ CARDS_AD_PACKS_PER_DAY: 'many' })).toBe(3);
    expect(adUnitOf({ CARDS_AD_SSV_AD_UNIT: ' x ' })).toBeNull();
  });
});

describe('the signed callback', () => {
  it('a valid callback is accepted and gives the ticket, the transaction and the user', () => {
    expect(verifySsv(signed(), KEYS, ENV_ON, NOW)).toEqual({ ok: true, ticket: TICKET, tx: 'tx-0001', adUnit: '/1234/rewarded-pack', user: USER });
  });
  it('no grant without a valid signature: a wrong key, a changed value, a missing signature, a tail after the signature, an unknown key id', () => {
    expect(verifySsv(signed({}, { key: other.privateKey }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'signature' });
    const q = signed();
    expect(verifySsv(q.replace('tx-0001', 'tx-0002'), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'signature' });
    expect(verifySsv(q.replace(TICKET, '4c1f3e0a-6a5b-4d0f-9d79-0a8c2f1e7b12'), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'signature' });
    expect(verifySsv(q.slice(0, q.indexOf('&signature=')), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'malformed' });
    expect(verifySsv(`${q}&reward_amount=50`, KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'malformed' });
    expect(verifySsv(signed({}, { keyId: '1' }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'unknown_key' });
    expect(verifySsv(q.replace(/signature=[^&]+/, 'signature=AAAA'), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'signature' });
    expect(verifySsv(q.replace(/signature=[^&]+/, 'signature=%%%'), KEYS, ENV_ON, NOW).ok).toBe(false);
  });
  it('a signed callback is still refused for another ad unit, an old timestamp, a custom_data that is not a ticket, or no transaction id', () => {
    expect(verifySsv(signed({ ad_unit: '/9999/other' }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'ad_unit' });
    expect(verifySsv(signed({ timestamp: String(NOW - 3 * 3600 * 1000) }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'stale' });
    expect(verifySsv(signed({ timestamp: 'soon' }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'stale' });
    expect(verifySsv(signed({ custom_data: 'not-a-ticket' }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'ticket' });
    expect(verifySsv(signed({ transaction_id: '' }), KEYS, ENV_ON, NOW)).toEqual({ ok: false, why: 'tx' });
  });
  it('the flag off gives nothing, even for a perfectly signed callback', () => {
    expect(verifySsv(signed(), KEYS, {}, NOW)).toEqual({ ok: false, why: 'disabled' });
    expect(verifySsv(signed(), KEYS, { ...ENV_ON, NET_CARDS_AD_PACKS: '0' }, NOW)).toEqual({ ok: false, why: 'disabled' });
  });
  it('parseSsv covers the query before the signature, and signatureValid never throws on garbage', () => {
    const q = signed();
    const p = parseSsv(`?${q}`)!;
    expect(p.message).toBe(q.slice(0, q.indexOf('&signature=')));
    expect(p.keyId).toBe('3335741209');
    expect(signatureValid(p, KEYS)).toBe(true);
    expect(signatureValid({ ...p, signature: '' }, KEYS)).toBe(false);
    expect(signatureValid(p, { '3335741209': 'not a key' })).toBe(false);
  });
});

describe('the key list and its cache', () => {
  it('reads keyId with pem or base64 and drops the rest', () => {
    const b64 = PEM.replace(/-----[A-Z ]+-----|\n/g, '');
    expect(keysFromJson({ keys: [{ keyId: 1, pem: PEM }, { keyId: 2, base64: b64 }, { keyId: 3 }, { pem: PEM }] })).toEqual({ '1': PEM, '2': expect.stringContaining('BEGIN PUBLIC KEY') });
    expect(keysFromJson(null)).toEqual({});
  });
  it('keeps the list a day, refetches once a minute for an unknown id, and keeps the old list when the fetch fails', async () => {
    const f = vi.fn(async (_url: string) => new Response(JSON.stringify({ keys: [{ keyId: 7, pem: PEM }] })));
    const c = createKeyCache();
    expect(Object.keys(await c.get(f as unknown as typeof fetch, '7', NOW))).toEqual(['7']);
    await c.get(f as unknown as typeof fetch, '7', NOW + 1000);
    expect(f).toHaveBeenCalledTimes(1);
    await c.get(f as unknown as typeof fetch, '999', NOW + 2000); // unknown id, but a fetch was made a second ago: no refetch
    expect(f).toHaveBeenCalledTimes(1);
    await c.get(f as unknown as typeof fetch, '999', NOW + 61_000); // a minute later: one refetch
    await c.get(f as unknown as typeof fetch, '999', NOW + 62_000); // not again within a minute
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[0]![0]).toBe(VERIFIER_KEYS_URL);
    const bad = vi.fn(async () => { throw new Error('down'); });
    expect(Object.keys(await c.get(bad as unknown as typeof fetch, '999', NOW + 130_000))).toEqual(['7']);
  });
});

describe('the consent mode of the ad request', () => {
  const ok = { gdprApplies: true, eventStatus: 'useractioncomplete', purpose: { consents: { '1': true, '3': true, '4': true } } };
  it('personalised only with the consent for purposes 1, 3 and 4; everything else is non personalised, in every country (owner, 2026-11-20)', () => {
    expect(adPersonalisation(ok)).toBe('personalised');
    expect(adPersonalisation(null)).toBe('non_personalised');
    expect(adPersonalisation({ ...ok, purpose: { consents: { '1': true } } })).toBe('non_personalised');
    expect(adPersonalisation({ ...ok, eventStatus: 'cmpuishown' })).toBe('non_personalised');
    // Was personalised before the owner's rule: no consent message answer means no personalisation, in a region without a consent law too.
    expect(adPersonalisation({ gdprApplies: false })).toBe('non_personalised');
  });
  it('the request carries the ticket as custom data and the non personalised flag', () => {
    expect(rewardedRequestOptions(TICKET, USER, 'non_personalised')).toEqual({ customData: TICKET, userId: USER, nonPersonalizedAds: true });
    expect(rewardedRequestOptions(TICKET, USER, 'personalised').nonPersonalizedAds).toBe(false);
  });
});

describe('GET /api/cards/ad/ssv', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    h.site = 'hub';
    h.rpcCalls.length = 0;
    h.rpcResult = { data: { granted: true, replayed: false }, error: null };
    h.ticketOwner = USER;
    process.env.NET_CARDS = '1';
    Object.assign(process.env, ENV_ON);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [{ keyId: 3335741209, pem: PEM }] }))));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env = { ...OLD };
  });
  const call = (q: string) => ssv(new NextRequest(`https://example.test/api/cards/ad/ssv?${q}`));

  it('the flag off is a 404 and nothing is read or written', async () => {
    delete process.env.NET_CARDS_AD_PACKS;
    const res = await call(signed());
    expect(res.status).toBe(404);
    expect(h.rpcCalls).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('another site build is a 404', async () => {
    h.site = 'kpop';
    expect((await call(signed())).status).toBe(404);
    expect(h.rpcCalls).toHaveLength(0);
  });
  it('a bad signature, another ad unit, a stale or a foreign ticket reaches no database call', async () => {
    expect((await call(signed({}, { key: other.privateKey }))).status).toBe(400);
    expect((await call(signed({ ad_unit: '/9/x' }))).status).toBe(400);
    expect((await call(signed({ timestamp: String(NOW - 4 * 3600 * 1000) }))).status).toBe(400);
    h.ticketOwner = '11111111-1111-4111-8111-111111111111'; // the ticket belongs to someone else than the callback's user_id
    expect((await call(signed())).status).toBe(400);
    h.ticketOwner = null; // no such ticket
    expect((await call(signed())).status).toBe(400);
    expect(h.rpcCalls).toHaveLength(0);
  });
  it('a valid callback calls the database once with the verified values, the daily cap and the ad unit', async () => {
    const res = await call(signed());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ granted: true, replayed: false });
    expect(h.rpcCalls).toHaveLength(1);
    expect(h.rpcCalls[0]).toMatchObject({ fn: 'cards_ad_pack_grant', args: { p_ticket: TICKET, p_tx: 'tx-0001', p_ad_unit: '/1234/rewarded-pack', p_daily_cap: 3, p_timer_cap: 40 } });
  });
  it('the database answers: at the cap or a repeat is a 200 granted false, a spent ticket a 400, a fault a 500', async () => {
    h.rpcResult = { data: { granted: false, replayed: false, reason: 'daily_cap' }, error: null };
    expect(await (await call(signed())).json()).toEqual({ granted: false, replayed: false, reason: 'daily_cap' });
    h.rpcResult = { data: null, error: { message: 'cards: ticket' } };
    expect((await call(signed())).status).toBe(400);
    h.rpcResult = { data: null, error: { message: 'connection reset' } };
    expect((await call(signed())).status).toBe(500);
  });
});

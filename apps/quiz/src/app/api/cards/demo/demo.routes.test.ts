// Bunnyverse Cards, lot 3 point A18: POST /api/cards/demo and POST /api/cards/demo/claim against a recording stand-in for Supabase.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  user: null as { id: string } | null,
  team: false,
  serviceMade: 0,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcResult: {} as Record<string, { data?: unknown; error?: { message: string } | null }>,
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => h.team }));
vi.mock('@/lib/cards/draw', () => ({
  drawServerPack: async () => [1, 7, 9, 3, 2],
  resetPoolCache: () => undefined,
  loadPool: async () => (await import('@/lib/cards/rules')).indexPool([{ n: 1, kind: 'idol', rarity: 'C' }, { n: 2, kind: 'idol', rarity: 'U' }]),
}));
const db = {
  from: () => {
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order']) b[m] = () => b;
    b.range = async () => ({ data: [], error: null });
    return b;
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    h.rpcCalls.push({ fn, args });
    const r = h.rpcResult[fn];
    return { data: r?.data ?? null, error: r?.error ?? null };
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
  createServiceRoleClient: () => { h.serviceMade += 1; return db; },
}));

import { POST as draw } from './route';
import { POST as claim } from './claim/route';
import { verifyDemo } from '@/lib/cards/demo';

const SECRET = 'a-test-secret-of-32-characters-xx';
const ORIGIN = 'http://localhost:3021';
const DEVICE = 'dev_0123456789abcdef';
const req = (path: string, body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, { method: 'POST', headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const WALLET = { stock: 3, anchor: '2026-11-12T10:00:00+00:00', paris_day: '2026-11-12', ads_today: 0, bonus_today: 0, shards: 0, ads_left: 10, bonus_left: 0, next_at: null, midnight_at: '2026-11-12T23:00:00+00:00' };

beforeEach(() => {
  h.site = 'hub'; h.user = null; h.team = false; h.serviceMade = 0; h.rpcCalls = [];
  h.rpcResult = { cards_wallet: { data: WALLET }, cards_demo_claim: { data: { cards: [1, 7, 9, 3, 2].map((n, i) => ({ n, isNew: i !== 1 })) } } };
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('CARDS_DEMO_SECRET', SECRET);
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/cards/demo (the draw)', () => {
  it('draws five cards on the server and signs them; nothing is stored', async () => {
    const res = await draw(req('/api/cards/demo', {}));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const b = await res.json() as { token: string; cards: { n: number; isNew: boolean }[] };
    expect(b.cards.map((c) => c.n)).toEqual([1, 7, 9, 3, 2]);
    expect(b.cards.every((c) => c.isNew === false)).toBe(true);
    expect(verifyDemo(b.token, SECRET)!.cards).toEqual([1, 7, 9, 3, 2]);
    expect(h.rpcCalls).toEqual([]);
    expect(h.serviceMade).toBe(0);
  });
  it('is a 404 off the hub, with NET_CARDS off, and without CARDS_DEMO_SECRET (no demo)', async () => {
    h.site = 'kpop';
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(404);
    h.site = 'hub';
    vi.stubEnv('NET_CARDS', '0');
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(404);
    vi.stubEnv('NET_CARDS', '1');
    vi.stubEnv('CARDS_DEMO_SECRET', '');
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(404);
    vi.stubEnv('CARDS_DEMO_SECRET', 'short');
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(404);
  });
  it('is a 404 to a guest while the private launch is on, 403 from another site, 409 for a signed-in visitor', async () => {
    vi.stubEnv('PRIVATE_LAUNCH', '1');
    vi.stubEnv('PRIVATE_LAUNCH_ALLOW', 'aaaaaaaa-1111-2222-3333-444444444444');
    vi.stubEnv('PRIVATE_LAUNCH_KEY', 'ab'.repeat(32));
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(404);
    vi.stubEnv('PRIVATE_LAUNCH', '0');
    expect((await draw(req('/api/cards/demo', {}, { origin: 'https://evil.example' }))).status).toBe(403);
    h.user = { id: 'u1' };
    expect((await draw(req('/api/cards/demo', {}))).status).toBe(409);
  });
});

describe('POST /api/cards/demo/claim', () => {
  const token = async (): Promise<string> => ((await (await draw(req('/api/cards/demo', {}))).json()) as { token: string }).token;
  const call = async (body: unknown, headers: Record<string, string> = {}): Promise<Response> => claim(req('/api/cards/demo/claim', body, headers));

  it('answers 404 off the hub, with NET_CARDS off and with the private launch barring the account; 401 signed out; 403 for a Team account or another site', async () => {
    const t = await token();
    h.site = 'kpop';
    h.user = { id: 'u1' };
    expect((await call({ token: t, device: DEVICE })).status).toBe(404);
    h.site = 'hub';
    h.user = null;
    expect((await call({ token: t, device: DEVICE })).status).toBe(401);
    h.user = { id: 'u1' };
    h.team = true;
    expect((await call({ token: t, device: DEVICE })).status).toBe(403);
    h.team = false;
    expect((await call({ token: t, device: DEVICE }, { origin: 'https://evil.example' })).status).toBe(403);
    vi.stubEnv('PRIVATE_LAUNCH', '1');
    vi.stubEnv('PRIVATE_LAUNCH_ALLOW', 'aaaaaaaa-1111-2222-3333-444444444444');
    vi.stubEnv('PRIVATE_LAUNCH_KEY', 'ab'.repeat(32));
    expect((await call({ token: t, device: DEVICE })).status).toBe(404);
    expect(h.rpcCalls).toEqual([]);
  });
  it('without a secret it is a 404 and calls nothing', async () => {
    const t = await token();
    h.user = { id: 'u1' };
    vi.stubEnv('CARDS_DEMO_SECRET', '');
    expect((await call({ token: t, device: DEVICE })).status).toBe(404);
    expect(h.rpcCalls).toEqual([]);
  });
  it('refuses a missing or odd device id (400) and a forged, foreign or expired token (400), before any call', async () => {
    const t = await token();
    h.user = { id: 'u1' };
    expect((await call({ token: t })).status).toBe(400);
    expect((await call({ token: t, device: 'short' })).status).toBe(400);
    expect((await call({ token: `${t}x`, device: DEVICE })).status).toBe(400);
    expect((await call({ token: 'nope', device: DEVICE })).status).toBe(400);
    expect((await call({ device: DEVICE })).status).toBe(400);
    expect(h.rpcCalls.filter((c) => c.fn === 'cards_demo_claim')).toEqual([]);
  });
  it('claims once: the function gets the user, the token id, the five cards and only HASHES of the device and the address', async () => {
    const t = await token();
    h.user = { id: 'u1' };
    const res = await call({ token: t, device: DEVICE }, { 'x-forwarded-for': '203.0.113.7' });
    expect(res.status).toBe(200);
    const b = await res.json() as { added: { n: number; isNew: boolean }[]; state: { stock: number } };
    expect(b.added).toHaveLength(5);
    expect(b.state.stock).toBe(3);
    const c = h.rpcCalls.find((x) => x.fn === 'cards_demo_claim')!;
    expect(c.args.p_user).toBe('u1');
    expect(c.args.p_cards).toEqual([1, 7, 9, 3, 2]);
    expect(c.args.p_jti).toBe(verifyDemo(t, SECRET)!.jti);
    expect(String(c.args.p_device)).toMatch(/^[0-9a-f]{64}$/);
    expect(String(c.args.p_ip)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(c.args)).not.toContain(DEVICE);
    expect(JSON.stringify(c.args)).not.toContain('203.0.113.7');
  });
  it('maps the refusals: used 409, a device or a network over its limit 429, a card gone 409', async () => {
    const t = await token();
    h.user = { id: 'u1' };
    const cases: [string, number, string][] = [['cards: demo_used', 409, 'used'], ['cards: demo_device', 429, 'limit'], ['cards: demo_ip', 429, 'limit'], ['cards: pack', 409, 'pack']];
    for (const [message, status, error] of cases) {
      h.rpcResult.cards_demo_claim = { error: { message } };
      const res = await call({ token: t, device: DEVICE });
      expect(res.status, message).toBe(status);
      expect(await res.json()).toEqual({ error });
    }
    h.rpcResult.cards_demo_claim = { error: { message: 'boom' } };
    expect((await call({ token: t, device: DEVICE })).status).toBe(500);
  });
});

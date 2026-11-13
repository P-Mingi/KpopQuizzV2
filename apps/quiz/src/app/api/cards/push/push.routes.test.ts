// Bunnyverse Cards, lot 4: /api/cards/push and /api/cron/cards-push against a recording stand-in for Supabase and the push service.
import { NextRequest } from 'next/server';
import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  site: 'hub',
  user: null as { id: string } | null,
  team: new Set<string>(),
  rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  picked: [] as Array<{ id: string; user_id: string; endpoint: string }>,
}));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return h.site; } }));
vi.mock('@/lib/site/cron', async () => ({ cronForSite: (sites: string[]) => (sites.includes(h.site) ? null : new Response(JSON.stringify({ skipped: true }), { status: 200 })) }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async (id: string) => h.team.has(id) }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.rpc.push({ fn, args });
      return { data: fn === 'cards_push_pick' ? h.picked : null, error: null };
    },
  }),
}));

import { GET as cron } from '@/app/api/cron/cards-push/route';

import { DELETE, POST } from './route';

const ORIGIN = 'http://localhost:3021';
const EP = 'https://fcm.googleapis.com/fcm/send/abc';
const call = (method: 'POST' | 'DELETE', body: unknown, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`${ORIGIN}/api/cards/push`, { method, headers: { host: 'localhost:3021', origin: ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const SUB = { endpoint: EP, keys: { p256dh: 'BPk_abc', auth: 'au_th' } };

function vapid(): void {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = publicKey.export({ format: 'jwk' });
  vi.stubEnv('CARDS_VAPID_PUBLIC_KEY', Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, 'base64url'), Buffer.from(pub.y!, 'base64url')]).toString('base64url'));
  vi.stubEnv('CARDS_VAPID_PRIVATE_KEY', privateKey.export({ format: 'jwk' }).d!);
  vi.stubEnv('CARDS_VAPID_SUBJECT', 'mailto:owner@example.test');
}

beforeEach(() => {
  h.site = 'hub';
  h.user = { id: 'u1' };
  h.team = new Set();
  h.rpc = [];
  h.picked = [];
  vi.stubEnv('NET_CARDS', '1');
  vi.stubEnv('NET_CARDS_PUSH', '1');
  vi.stubEnv('CRON_SECRET', 'sekret');
  vi.useRealTimers();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('/api/cards/push guard', () => {
  it('flag off (NET_CARDS_PUSH, NET_CARDS, or the build): 404 and no read', async () => {
    vi.stubEnv('NET_CARDS_PUSH', '');
    expect((await POST(call('POST', SUB))).status).toBe(404);
    expect((await DELETE(call('DELETE', { endpoint: EP }))).status).toBe(404);
    vi.stubEnv('NET_CARDS_PUSH', '1');
    vi.stubEnv('NET_CARDS', '');
    expect((await POST(call('POST', SUB))).status).toBe(404);
    vi.stubEnv('NET_CARDS', '1');
    h.site = 'kpop';
    expect((await POST(call('POST', SUB))).status).toBe(404);
    expect(h.rpc).toEqual([]);
  });

  it('signed out 401, Team account refused 403, cross-site write 403', async () => {
    h.user = null;
    expect((await POST(call('POST', SUB))).status).toBe(401);
    h.user = { id: 'u1' };
    h.team.add('u1');
    const res = await POST(call('POST', SUB));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe('editorial_account');
    expect((await DELETE(call('DELETE', { endpoint: EP }))).status).toBe(403);
    h.team.clear();
    expect((await POST(call('POST', SUB, { origin: 'https://evil.example' }))).status).toBe(403);
    expect(h.rpc).toEqual([]);
  });

  it('POST stores the subscription; a bad endpoint is 400; DELETE removes it', async () => {
    const ok = await POST(call('POST', SUB));
    expect(ok.status).toBe(200);
    expect(h.rpc[0]).toMatchObject({ fn: 'cards_push_upsert', args: { p_user: 'u1', p_endpoint: EP, p_p256dh: 'BPk_abc', p_auth: 'au_th' } });
    expect((await POST(call('POST', { ...SUB, endpoint: 'https://internal.example/x' }))).status).toBe(400);
    expect((await POST(call('POST', { keys: SUB.keys }))).status).toBe(400);
    expect((await DELETE(call('DELETE', { endpoint: EP }))).status).toBe(200);
    expect(h.rpc.at(-1)).toMatchObject({ fn: 'cards_push_delete', args: { p_user: 'u1', p_endpoint: EP } });
  });
});

describe('/api/cron/cards-push', () => {
  const get = (auth = 'Bearer sekret'): Promise<Response> => cron(new NextRequest('http://localhost/api/cron/cards-push', { headers: { authorization: auth } }));
  const NOON = new Date('2026-11-13T11:00:00Z');

  it('protected like the other crons, off by flag, hub only', async () => {
    expect((await get('Bearer nope')).status).toBe(401);
    vi.stubEnv('CRON_SECRET', '');
    expect((await get('Bearer ')).status).toBe(401);
    vi.stubEnv('CRON_SECRET', 'sekret');
    vi.stubEnv('NET_CARDS_PUSH', '');
    expect((await get()).status).toBe(404);
    vi.stubEnv('NET_CARDS_PUSH', '1');
    h.site = 'kpop';
    expect(await (await get()).json()).toEqual({ skipped: true });
    expect(h.rpc).toEqual([]);
  });

  it('does nothing in the quiet hours or without keys', async () => {
    vapid();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T03:00:00Z'));
    expect(await (await get()).json()).toEqual({ ok: true, skipped: 'quiet_hours' });
    vi.setSystemTime(NOON);
    vi.stubEnv('CARDS_VAPID_PRIVATE_KEY', '');
    expect(await (await get()).json()).toEqual({ ok: true, skipped: 'no_keys' });
    expect(h.rpc).toEqual([]);
  });

  it('sends one payload-less push per pick; 410 and 404 drop the subscription; other failures count; a Team account is dropped unsent', async () => {
    vapid();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOON);
    h.team.add('team1');
    h.picked = [
      { id: 'a', user_id: 'u1', endpoint: 'https://fcm.googleapis.com/ok' },
      { id: 'b', user_id: 'u2', endpoint: 'https://fcm.googleapis.com/gone410' },
      { id: 'c', user_id: 'u3', endpoint: 'https://fcm.googleapis.com/gone404' },
      { id: 'd', user_id: 'u4', endpoint: 'https://fcm.googleapis.com/boom' },
      { id: 'e', user_id: 'team1', endpoint: 'https://fcm.googleapis.com/team' },
    ];
    const seen: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(null, { status: url.endsWith('gone410') ? 410 : url.endsWith('gone404') ? 404 : url.endsWith('boom') ? 503 : 201 });
    });
    const body = (await (await get()).json()) as Record<string, number>;
    expect(body).toMatchObject({ picked: 5, sent: 1, gone: 2, failed: 1, dropped: 1 });
    expect(seen.map((s) => s.url).sort()).toEqual(['https://fcm.googleapis.com/boom', 'https://fcm.googleapis.com/gone404', 'https://fcm.googleapis.com/gone410', 'https://fcm.googleapis.com/ok']);
    for (const s of seen) {
      expect(s.init.method).toBe('POST');
      expect(s.init.body).toBeUndefined();
      expect((s.init.headers as Record<string, string>).Authorization).toMatch(/^vapid t=/);
    }
    const drops = h.rpc.filter((r) => r.fn === 'cards_push_drop').map((r) => r.args.p_endpoint).sort();
    expect(drops).toEqual(['https://fcm.googleapis.com/gone404', 'https://fcm.googleapis.com/gone410', 'https://fcm.googleapis.com/team']);
    expect(h.rpc.filter((r) => r.fn === 'cards_push_result').map((r) => [r.args.p_id, r.args.p_ok]).sort()).toEqual([['a', true], ['d', false]]);
    expect(h.rpc[0]).toMatchObject({ fn: 'cards_push_pick', args: { p_limit: 100 } });
  });
});

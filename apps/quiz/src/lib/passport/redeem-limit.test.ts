// Run O1, lane O1 (lot a, finishing): POST /api/passport/redeem answers 429 rate_limited after the limit (apis.md 2.5: 10 a minute
// per IP hash, the contract gives no other number), logs the outcome, clears the transaction cookie, and never reaches the code.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as Array<{ fn: string; args: Record<string, unknown> }>);
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => { throw new Error('no session read before the limit'); },
  createServiceRoleClient: () => ({
    auth: { admin: {} },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      if (fn === 'passport_redeem_code') return { data: [{ outcome: 'expired', user_id: null, from_site: null }], error: null };
      return { data: null, error: null };
    },
  }),
}));

import { REDEEM_PER_MINUTE, handleRedeem } from './handoff';
import { newCode, newState, newVerifier, signTx } from './ticket';

const SECRET = 'o1-test-secret-0123456789abcdef';
const ORIGIN = 'http://anime.localhost:3107';
const ENV = { PASSPORT_JUMP: '1', PASSPORT_TICKET_SECRET: SECRET, NET_IP_HASH_SALT: 'salt', NEXT_PUBLIC_NET_ORIGINS: 'kpop=http://kpop.localhost:3106,anime=http://anime.localhost:3107,hub=http://hub.localhost:3108' };
const NOW = 1_800_000_000;

function post(ip: string | null): { req: NextRequest; state: string } {
  const state = newState();
  const cookie = signTx(SECRET, { state, verifier: newVerifier(), next: '/quizzes', from: 'kpop', via: null, iat: NOW });
  const headers: Record<string, string> = { 'content-type': 'application/json', origin: ORIGIN, cookie: `pp_tx=${cookie}` };
  if (ip) headers['x-forwarded-for'] = ip;
  return { req: new NextRequest(`${ORIGIN}/api/passport/redeem`, { method: 'POST', body: JSON.stringify({ code: newCode(), state }), headers }), state };
}
const ctx = (extra: object = {}) => ({ site: 'anime' as const, env: ENV, now: () => NOW * 1000, ...extra });

beforeEach(() => { calls.length = 0; });

describe('POST /api/passport/redeem rate limit', () => {
  it('429 rate_limited when the limiter refuses: logged, cookie cleared, next kept, the code is never redeemed', async () => {
    const res = await handleRedeem(post('203.0.113.50').req, ctx({ redeemLimiter: { hit: () => false } }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited', next: '/quizzes' });
    expect(res.headers.get('set-cookie')).toMatch(/^pp_tx=;/);
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(calls.map((c) => c.fn)).toEqual(['passport_log_event']);
    expect(calls[0]!.args).toMatchObject({ p_outcome: 'rate_limited', p_from_site: 'kpop', p_to_site: 'anime' });
    expect(typeof calls[0]!.args.p_ip_hash).toBe('string');
  });

  it('the module limiter lets 10 a minute through for one IP hash and stops the 11th; another address is not affected', async () => {
    expect(REDEEM_PER_MINUTE).toBe(10);
    for (let i = 0; i < REDEEM_PER_MINUTE; i += 1) {
      const res = await handleRedeem(post('203.0.113.77').req, ctx());
      expect(res.status, `request ${i + 1}`).toBe(400);
    }
    const over = await handleRedeem(post('203.0.113.77').req, ctx());
    expect(over.status).toBe(429);
    expect((await handleRedeem(post('203.0.113.78').req, ctx())).status).toBe(400);
  });

  it('without an address nothing is limited (no key)', async () => {
    for (let i = 0; i < REDEEM_PER_MINUTE + 2; i += 1) {
      expect((await handleRedeem(post(null).req, ctx())).status).toBe(400);
    }
  });
});

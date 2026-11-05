// ADMIN-1 review: the guard on the REAL auth-js client, with its network replaced by a local stand-in of the auth server (no account, no real
// token: an unsigned JWT that only this file's stand-in accepts). The stand-in of test-support.ts follows what this file shows: auth-js starts
// nextLevel at currentLevel, so an aal2 token whose factors were deleted in SQL still says nextLevel 'aal2'; only the verified user's factors tell.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({ aal: 'aal1' as string, factors: [] as Array<{ id: string; status: string; factor_type: string }>, amr: 'fresh' as 'fresh' | 'none' }));

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));

const b64 = (v: object): string => Buffer.from(JSON.stringify(v)).toString('base64url');
// ADMIN-2: an aal2 token carries the dated `totp` entry of the amr claim (a code typed just now); 'none' is a token without one.
const amr = (): Array<{ method: string; timestamp: number }> => (s.amr === 'fresh' && s.aal === 'aal2' ? [{ method: 'totp', timestamp: Math.floor(Date.now() / 1000) }] : []);
const token = (): string => `${b64({ alg: 'none' })}.${b64({ sub: 'admin-1', aal: s.aal, exp: 4102444800, amr: amr() })}.stand-in`;

function realClient(): SupabaseClient {
  const client = createClient('http://auth.stand-in.test', 'stand-in-anon', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (async (url: string) => {
        if (!String(url).endsWith('/auth/v1/user')) throw new Error(`unexpected call: ${String(url)}`);
        return new Response(JSON.stringify({ id: 'admin-1', aud: 'authenticated', factors: s.factors }), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch,
    },
  });
  // getSession only hands over the token (the cookie's job on the server client); getUser and mfa stay the real code.
  client.auth.getSession = (async () => ({ data: { session: { access_token: token() } }, error: null })) as never;
  return client;
}

vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => realClient() }));

import { requireAdmin } from './guard';

const VERIFIED = [{ id: 'f1', status: 'verified', factor_type: 'totp' }];

beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1'); s.aal = 'aal1'; s.factors = []; s.amr = 'fresh'; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('requireAdmin on the real auth-js', () => {
  it('auth-js says nextLevel aal2 for an aal2 token with no factor: nextLevel alone proves nothing', async () => {
    s.aal = 'aal2';
    const { data } = await realClient().auth.mfa.getAuthenticatorAssuranceLevel(token());
    expect(data).toMatchObject({ currentLevel: 'aal2', nextLevel: 'aal2' });
  });

  it('aal2 with a verified factor passes', async () => {
    s.aal = 'aal2';
    s.factors = VERIFIED;
    expect((await requireAdmin('mfa'))?.level).toBe('pass');
  });

  it('aal2 with no factor left is refused with enrolment closed, and goes to setup with enrolment open', async () => {
    s.aal = 'aal2';
    expect(await requireAdmin('check')).toBeNull();
    expect(await requireAdmin('mfa')).toBeNull();
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('enrol');
  });

  it('ADMIN-2: the real auth-js hands the amr entries over, and an aal2 token with no totp entry is the code step, not a pass', async () => {
    s.aal = 'aal2';
    s.factors = VERIFIED;
    const { data } = await realClient().auth.mfa.getAuthenticatorAssuranceLevel(token());
    expect(data?.currentAuthenticationMethods).toEqual([{ method: 'totp', timestamp: expect.any(Number) }]);
    s.amr = 'none';
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
  });

  it('aal2 with only an unverified factor is no pass', async () => {
    s.aal = 'aal2';
    s.factors = [{ id: 'u1', status: 'unverified', factor_type: 'totp' }];
    expect(await requireAdmin('check')).toBeNull();
  });

  it('aal1 with a verified factor is the code step; aal1 with none is the 404 until enrolment opens', async () => {
    s.factors = VERIFIED;
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
    s.factors = [];
    expect(await requireAdmin('mfa')).toBeNull();
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    expect((await requireAdmin('mfa'))?.level).toBe('enrol');
  });
});

// ADMIN-1: the TOTP steps (lib/admin/mfa.ts) and their one route (app/api/admin/k7q2m), on local stand-ins only. No account is made,
// no real secret or code exists here: '123456' is a code the stand-in accepts, never one from an app.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanCode, confirmSetup, startSetup, verifyCode } from './mfa';

import type { AdminMfaContext, AdminLevel } from './guard';
import type { AuthStubState } from './test-support';

type Factor = { id: string; factor_type: 'totp'; status: 'verified' | 'unverified' };

const m = vi.hoisted(() => ({
  factors: [] as Array<{ id: string; factor_type: 'totp'; status: 'verified' | 'unverified' }>,
  good: '123456',
  calls: [] as string[],
  enrolled: 0,
  auth: { user: null } as { user: { id: string } | null; aal?: 'aal1' | 'aal2'; factor?: boolean },
}));

function mfaStub(): AdminMfaContext['supabase']['auth']['mfa'] {
  const api = {
    async listFactors() {
      m.calls.push('list');
      const verified = m.factors.filter((f) => f.status === 'verified');
      return { data: { all: [...m.factors], totp: verified, phone: [], webauthn: [] }, error: null };
    },
    async unenroll({ factorId }: { factorId: string }) {
      m.calls.push(`unenroll ${factorId}`);
      m.factors = m.factors.filter((f) => f.id !== factorId);
      return { data: { id: factorId }, error: null };
    },
    async enroll(p: { factorType: string; issuer?: string; friendlyName?: string }) {
      m.calls.push(`enroll ${p.issuer}`);
      m.enrolled += 1;
      const id = `new-${m.enrolled}`;
      m.factors.push({ id, factor_type: 'totp', status: 'unverified' });
      return { data: { id, type: 'totp', friendly_name: p.friendlyName, totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'STANDIN', uri: 'otpauth://totp/x' } }, error: null };
    },
    async challengeAndVerify({ factorId, code }: { factorId: string; code: string }) {
      m.calls.push(`verify ${factorId}`);
      if (code !== m.good) return { data: null, error: { message: 'invalid code' } };
      m.factors = m.factors.map((f) => (f.id === factorId ? { ...f, status: 'verified' as const } : f));
      return { data: { access_token: 'aal2' }, error: null };
    },
  };
  return api as unknown as AdminMfaContext['supabase']['auth']['mfa'];
}

const ctx = (level: AdminLevel): AdminMfaContext => ({
  level,
  user: { id: 'admin-1' } as AdminMfaContext['user'],
  supabase: { auth: { mfa: mfaStub() } } as unknown as AdminMfaContext['supabase'],
});

beforeEach(() => { m.factors = []; m.calls = []; m.enrolled = 0; m.auth = { user: null }; });

describe('the code', () => {
  it('is 6 digits, spaces dropped; anything else is refused before any call', () => {
    expect(cleanCode('123456')).toBe('123456');
    expect(cleanCode(' 123 456 ')).toBe('123456');
    for (const bad of ['12345', '1234567', 'abcdef', '12 34 5', '', null, 123456, undefined]) expect(cleanCode(bad)).toBeNull();
  });
});

describe('verifyCode (aal1 with a factor)', () => {
  it('lifts the session with the code of a verified factor', async () => {
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    expect(await verifyCode(ctx('challenge'), '123456')).toEqual({ ok: true });
    expect(m.calls).toEqual(['list', 'verify f1']);
  });

  it('tries every verified factor, never an unverified one, and says wrong_code when none takes it', async () => {
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }, { id: 'u1', factor_type: 'totp', status: 'unverified' }, { id: 'f2', factor_type: 'totp', status: 'verified' }];
    expect(await verifyCode(ctx('challenge'), '000000')).toEqual({ ok: false, error: 'wrong_code' });
    expect(m.calls).toEqual(['list', 'verify f1', 'verify f2']);
  });

  it('refuses a malformed code with no call, and any other level', async () => {
    expect(await verifyCode(ctx('challenge'), '12ab56')).toEqual({ ok: false, error: 'bad_code' });
    for (const level of ['pass', 'enrol'] as const) expect(await verifyCode(ctx(level), '123456')).toEqual({ ok: false, error: 'wrong_level' });
    expect(m.calls).toEqual([]);
  });
});

describe('startSetup and confirmSetup (aal1 with no factor)', () => {
  it('drops an abandoned unverified factor, enrols a new one with the site as issuer, and the first code verifies it', async () => {
    m.factors = [{ id: 'old', factor_type: 'totp', status: 'unverified' }];
    const s = await startSetup(ctx('enrol'), 'KpopQuiz', new Date('2026-10-30T12:00:00Z'));
    expect(s).toEqual({ ok: true, factorId: 'new-1', qr: 'data:image/svg+xml;utf-8,<svg/>', secret: 'STANDIN' });
    expect(m.calls).toEqual(['list', 'unenroll old', 'enroll KpopQuiz']);
    expect(await confirmSetup(ctx('enrol'), 'new-1', '000000')).toEqual({ ok: false, error: 'wrong_code' });
    expect(await confirmSetup(ctx('enrol'), 'new-1', '123456')).toEqual({ ok: true });
    expect(m.factors).toEqual([{ id: 'new-1', factor_type: 'totp', status: 'verified' }] satisfies Factor[]);
  });

  it('confirms only an unverified TOTP factor of this account, never another id', async () => {
    m.factors = [{ id: 'mine', factor_type: 'totp', status: 'unverified' }];
    expect(await confirmSetup(ctx('enrol'), 'someone-elses', '123456')).toEqual({ ok: false, error: 'no_factor' });
    expect(await confirmSetup(ctx('enrol'), '', '123456')).toEqual({ ok: false, error: 'no_factor' });
    expect(await confirmSetup(ctx('enrol'), 42, '123456')).toEqual({ ok: false, error: 'no_factor' });
    expect(m.calls.filter((c) => c.startsWith('verify'))).toEqual([]);
  });

  it('a level other than enrol cannot start or confirm a setup (a verified factor is never replaced here)', async () => {
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    for (const level of ['pass', 'challenge'] as const) {
      expect(await startSetup(ctx(level), 'KpopQuiz')).toEqual({ ok: false, error: 'wrong_level' });
      expect(await confirmSetup(ctx(level), 'f1', '123456')).toEqual({ ok: false, error: 'wrong_level' });
    }
    expect(m.calls).toEqual([]);
  });
});

// The route: requireAdmin('mfa') first, then the step of the admin's level. Everyone else, a request from another site, another
// method and an unknown action get the admin 404.
vi.mock('@/lib/supabase/server', async () => {
  const { stubAuth } = await import('./test-support');
  return {
    createServerClient: async () => {
      const auth = stubAuth(() => m.auth as AuthStubState) as unknown as Record<string, unknown>;
      return { auth: { ...auth, mfa: { ...(auth.mfa as object), ...(mfaStub() as object) } } };
    },
  };
});

describe('POST /api/admin/k7q2m', () => {
  const BASE = 'http://localhost:3021';
  const post = async (body: unknown, headers: Record<string, string> = { origin: BASE }): Promise<Response> => {
    const { POST } = await import('@/app/api/admin/k7q2m/route');
    return POST(new NextRequest(`${BASE}/api/admin/k7q2m`, { method: 'POST', body: JSON.stringify(body), headers: { host: 'localhost:3021', 'content-type': 'application/json', ...headers } }));
  };
  beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('is the admin 404 for a visitor, a fan and a forged cookie, whatever the action', async () => {
    for (const auth of [{ user: null }, { user: { id: 'fan-9' } }, { user: null, sessionUser: { id: 'admin-1' } }]) {
      m.auth = auth;
      for (const action of ['verify', 'start', 'confirm']) {
        const res = await post({ action, code: '123456', factorId: 'x' });
        expect(res.status).toBe(404);
        expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        expect(res.headers.get('cache-control')).toBe('no-store');
      }
    }
    expect(m.calls).toEqual([]);
  });

  it('an admin at aal1 with a factor: the right code is ok, a wrong one a 400, with no-store', async () => {
    m.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    const bad = await post({ action: 'verify', code: '000000' });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ ok: false, error: 'wrong_code' });
    const good = await post({ action: 'verify', code: '123456' });
    expect(good.status).toBe(200);
    expect(good.headers.get('cache-control')).toBe('no-store');
    expect(await good.json()).toEqual({ ok: true });
  });

  it('an admin with no factor, enrolment closed: start and confirm are the admin 404, and nothing is called', async () => {
    m.auth = { user: { id: 'admin-1' }, factor: false };
    m.factors = [{ id: 'planted', factor_type: 'totp', status: 'unverified' }];
    for (const body of [{ action: 'start' }, { action: 'confirm', factorId: 'planted', code: '123456' }, { action: 'verify', code: '123456' }]) {
      const res = await post(body);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not found.', code: 'not_found' });
    }
    expect(m.calls).toEqual([]);
  });

  it('an admin with a factor: start and confirm are the admin 404 too, enrolment open or not (a verified factor is never replaced here)', async () => {
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    m.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    for (const open of ['', '1']) {
      vi.stubEnv('ADMIN_MFA_ENROL_OPEN', open);
      expect((await post({ action: 'start' })).status).toBe(404);
      expect((await post({ action: 'confirm', factorId: 'f1', code: '123456' })).status).toBe(404);
    }
    expect(m.calls).toEqual([]);
  });

  it('an admin with no factor, enrolment open: start gives the QR code and the secret, confirm turns it on', async () => {
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    m.auth = { user: { id: 'admin-1' }, factor: false };
    const s = await post({ action: 'start' });
    expect(s.status).toBe(200);
    const body = await s.json() as { ok: boolean; factorId: string; qr: string; secret: string };
    expect(body).toMatchObject({ ok: true, qr: expect.stringContaining('data:image/svg+xml'), secret: 'STANDIN' });
    expect((await post({ action: 'confirm', factorId: body.factorId, code: '123456' })).status).toBe(200);
  });

  it('refuses another site, a missing JSON type, another method and an unknown action with the admin 404', async () => {
    m.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    m.factors = [{ id: 'f1', factor_type: 'totp', status: 'verified' }];
    expect((await post({ action: 'verify', code: '123456' }, { origin: 'https://evil.example' })).status).toBe(404);
    expect((await post({ action: 'verify', code: '123456' }, {})).status).toBe(404);
    expect((await post({ action: 'nope' })).status).toBe(404);
    const { POST, GET } = await import('@/app/api/admin/k7q2m/route');
    expect((await POST(new NextRequest(`${BASE}/api/admin/k7q2m`, { method: 'POST', body: '{}', headers: { origin: BASE, 'content-type': 'text/plain' } }))).status).toBe(404);
    expect(GET().status).toBe(404);
    expect(m.calls.filter((c) => c.startsWith('verify'))).toEqual([]);
  });
});

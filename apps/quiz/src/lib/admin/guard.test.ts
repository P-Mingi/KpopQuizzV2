// ADMIN-1 (owner, 2026-10-30): the one guard, on local stand-ins only (lib/admin/test-support.ts): no account, no network, no real
// password, token or TOTP code. Every refused case is a notFound() for a page and the admin 404 JSON for a route; an admin at aal1 is
// sent to the code page (a factor exists) or, only while ADMIN_MFA_ENROL_OPEN=1 is on, the setup page (none); only an admin at aal2 with a
// verified factor passes; a forged cookie never passes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthStubState } from './test-support';

const s = vi.hoisted(() => ({ auth: { user: null } as AuthStubState, clients: 0 }));

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));
vi.mock('@/lib/supabase/server', async () => {
  const { stubAuth } = await import('./test-support');
  return { createServerClient: async () => { s.clients += 1; return { auth: stubAuth(() => s.auth) }; } };
});

import { ADMIN_MFA_CODE_PATH, ADMIN_MFA_SETUP_PATH, adminNotFound, adminPowerFor, isListedAdminId, requireAdmin } from './guard';

const ADMIN = { id: 'admin-1' };
const OTHER_ADMIN = { id: 'admin-2' };
const FAN = { id: 'fan-9' };

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', ' admin-1 , admin-2 ');
  s.auth = { user: null };
  s.clients = 0;
});
afterEach(() => { vi.unstubAllEnvs(); });

async function api404(): Promise<void> {
  const g = await requireAdmin('api');
  expect(g.ok).toBe(false);
  if (g.ok) return;
  expect(g.res.status).toBe(404);
  expect(await g.res.json()).toEqual({ error: 'Not found.', code: 'not_found' });
  expect(g.res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(g.res.headers.get('cache-control')).toBe('no-store');
}

const REFUSED: Array<[string, AuthStubState]> = [
  ['no session at all', { user: null }],
  ['a signed-in account that is not in ADMIN_USER_IDS', { user: FAN }],
  ['a non-admin at aal2', { user: FAN, aal: 'aal2' }],
  ['a session the auth server rejects', { user: null, sessionUser: ADMIN }],
  ['a cookie that claims an admin while the verified token is a fan (getSession-only spoof)', { user: FAN, sessionUser: ADMIN, aal: 'aal2' }],
  ['the auth server unreachable', { user: ADMIN, userThrows: true }],
];

describe('requireAdmin: everyone it refuses gets a 404, never a 401, a 403 or /login', () => {
  for (const [name, auth] of REFUSED) {
    it(`${name}: page notFound(), route 404 JSON, check null, mfa null`, async () => {
      s.auth = auth;
      await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(requireAdmin('page')).rejects.toThrow('NEXT_NOT_FOUND');
      await api404();
      expect(await requireAdmin('check')).toBeNull();
      expect(await requireAdmin('mfa')).toBeNull();
    });
  }

  it('no ADMIN_USER_IDS (or an empty one) admits nobody, an empty id included', async () => {
    for (const env of ['', ' , ']) {
      vi.stubEnv('ADMIN_USER_IDS', env);
      s.auth = { user: ADMIN };
      await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
      s.auth = { user: { id: '' } };
      await api404();
    }
    delete process.env.ADMIN_USER_IDS;
    s.auth = { user: ADMIN };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('a getSession-only spoof is refused even when the forged cookie says aal2 and lists an admin', async () => {
    // The cookie (getSession) claims the admin; the auth server, asked about that token, says it is not valid.
    s.auth = { user: null, sessionUser: ADMIN, aal: 'aal2' };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    await api404();
    expect(await adminPowerFor(ADMIN.id)).toBe(false);
  });
});

describe('requireAdmin: an admin at aal1', () => {
  it('with a verified TOTP factor: a page sends them to the code page; a route is still a 404', async () => {
    s.auth = { user: ADMIN, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_CODE_PATH}`);
    await api404();
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
    expect(await adminPowerFor(ADMIN.id)).toBe(false);
  });

  it('with no factor and enrolment open: a page sends them to the setup page; a route is still a 404', async () => {
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    s.auth = { user: ADMIN, factor: false };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_SETUP_PATH}`);
    await api404();
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('enrol');
  });

  it.each([[undefined], [''], ['0'], ['true']])('with no factor and enrolment closed (%s): the same 404 as anyone, a stolen password claims nothing', async (value) => {
    if (value !== undefined) vi.stubEnv('ADMIN_MFA_ENROL_OPEN', value);
    s.auth = { user: ADMIN, factor: false };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    await api404();
    expect(await requireAdmin('check')).toBeNull();
    expect(await requireAdmin('mfa')).toBeNull();
    expect(await adminPowerFor(ADMIN.id)).toBe(false);
  });

  it('with a factor: enrolment open or closed changes nothing, the code is still asked', async () => {
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    s.auth = { user: ADMIN, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_CODE_PATH}`);
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
  });

  it('the MFA paths sit under /admin at an unlisted segment', () => {
    expect(ADMIN_MFA_CODE_PATH).toBe('/admin/k7q2m/code');
    expect(ADMIN_MFA_SETUP_PATH).toBe('/admin/k7q2m/setup');
  });
});

describe('requireAdmin: an admin at aal2 passes', () => {
  it('page, route, check and mfa all give the verified admin and their own client', async () => {
    s.auth = { user: ADMIN, aal: 'aal2' };
    const page = await requireAdmin();
    expect(page.user.id).toBe(ADMIN.id);
    expect(typeof page.supabase.auth.getUser).toBe('function');
    const g = await requireAdmin('api');
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.user.id).toBe(ADMIN.id);
    expect((await requireAdmin('check'))?.user.id).toBe(ADMIN.id);
    expect((await requireAdmin('mfa'))?.level).toBe('pass');
  });
});

describe('requireAdmin: an aal2 token with no verified factor left (the factors were deleted in SQL)', () => {
  it('enrolment closed: the same 404 as anyone, no admin power', async () => {
    s.auth = { user: ADMIN, aal: 'aal2', factor: false };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
    await api404();
    expect(await requireAdmin('check')).toBeNull();
    expect(await requireAdmin('mfa')).toBeNull();
    expect(await adminPowerFor(ADMIN.id)).toBe(false);
  });

  it('enrolment open: the setup page, never a pass', async () => {
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    s.auth = { user: ADMIN, aal: 'aal2', factor: false };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_SETUP_PATH}`);
    await api404();
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('enrol');
  });
});

describe('adminPowerFor: the admin power inside a decision that also lets others through', () => {
  it('true only for the id of the admin requireAdmin lets through on this request', async () => {
    s.auth = { user: ADMIN, aal: 'aal2' };
    expect(await adminPowerFor(ADMIN.id)).toBe(true);
    expect(await adminPowerFor(OTHER_ADMIN.id)).toBe(false);
    expect(await adminPowerFor(FAN.id)).toBe(false);
    expect(await adminPowerFor(null)).toBe(false);
    expect(await adminPowerFor(undefined)).toBe(false);
  });

  it('an id outside the list never reaches the session (no client is made)', async () => {
    s.auth = { user: FAN, aal: 'aal2' };
    expect(await adminPowerFor(FAN.id)).toBe(false);
    expect(await adminPowerFor('')).toBe(false);
    expect(s.clients).toBe(0);
  });
});

describe('the list and the 404', () => {
  it('isListedAdminId reads ADMIN_USER_IDS, trimmed, for a stored id', () => {
    expect(isListedAdminId('admin-1')).toBe(true);
    expect(isListedAdminId('admin-2')).toBe(true);
    expect(isListedAdminId('admin-3')).toBe(false);
    expect(isListedAdminId('')).toBe(false);
    expect(isListedAdminId(null)).toBe(false);
  });

  it('adminNotFound is a plain 404 JSON with the noindex and no-store headers', async () => {
    const r = adminNotFound();
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'Not found.', code: 'not_found' });
    expect(r.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
});

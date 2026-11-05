// ADMIN-2: the server half of the door (door-guard.ts) and what the guard does with it: where an admin is sent for a code behind the secret
// door, and that outside the door nothing changes. next/headers is replaced by a local stand-in; ADMIN_PATH is an obviously fake value.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_DOOR_HEADER, ADMIN_DOOR_NEXT_HEADER, adminDoorValue } from './door';

import type { AuthStubState } from './test-support';

const s = vi.hoisted(() => ({ headers: {} as Record<string, string>, headersThrow: false, auth: { user: null } as AuthStubState }));

vi.mock('next/headers', () => ({
  headers: async () => { if (s.headersThrow) throw new Error('outside a request'); return new Headers(s.headers); },
}));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));
vi.mock('@/lib/supabase/server', async () => {
  const { stubAuth } = await import('./test-support');
  return { createServerClient: async () => ({ auth: stubAuth(() => s.auth) }) };
});

import { adminDoorOfRequest, requireAdminDoor } from './door-guard';
import { requireAdmin } from './guard';

const FAKE = 'test-door-not-a-secret';
const P = `/${FAKE}`;
const H = 60 * 60 * 1000;

async function throughTheDoor(next?: string): Promise<void> {
  s.headers = { [ADMIN_DOOR_HEADER]: (await adminDoorValue())!, ...(next ? { [ADMIN_DOOR_NEXT_HEADER]: next } : {}) };
}

beforeEach(() => {
  s.headers = {}; s.headersThrow = false; s.auth = { user: null };
  vi.stubEnv('ADMIN_PATH', FAKE);
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('adminDoorOfRequest / requireAdminDoor', () => {
  it('is the door only with the header the middleware sets, derived from the very ADMIN_PATH of this deployment', async () => {
    expect(await adminDoorOfRequest()).toBeNull();
    await throughTheDoor();
    expect(await adminDoorOfRequest()).toEqual({ prefix: P, next: null });
    await expect(requireAdminDoor()).resolves.toEqual({ prefix: P, next: null });
  });

  it.each([
    ['no header', {}],
    ['a flag', { [ADMIN_DOOR_HEADER]: '1' }],
    ['the address itself', { [ADMIN_DOOR_HEADER]: FAKE }],
    ['an empty value', { [ADMIN_DOOR_HEADER]: '' }],
    ['a near miss', { [ADMIN_DOOR_HEADER]: 'f'.repeat(64) }],
    ['only the next header', { [ADMIN_DOOR_NEXT_HEADER]: `${P}/quizzes` }],
  ])('%s is no door: the 404, before any session is read', async (_n, headers) => {
    s.headers = headers;
    expect(await adminDoorOfRequest()).toBeNull();
    await expect(requireAdminDoor()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is no door on a deployment without a usable ADMIN_PATH, even with a header that was right for another one', async () => {
    await throughTheDoor();
    vi.stubEnv('ADMIN_PATH', '');
    expect(await adminDoorOfRequest()).toBeNull();
    vi.stubEnv('ADMIN_PATH', `${FAKE}-other`);
    expect(await adminDoorOfRequest()).toBeNull();
  });

  it('is no door outside a request (a build, a script): never throws', async () => {
    await throughTheDoor();
    s.headersThrow = true;
    expect(await adminDoorOfRequest()).toBeNull();
  });

  it('carries the address that was asked for, validated: an external one is dropped', async () => {
    await throughTheDoor(`${P}/quizzes?site=kpop`);
    expect((await adminDoorOfRequest())?.next).toBe(`${P}/quizzes?site=kpop`);
    await throughTheDoor('https://evil.example/');
    expect((await adminDoorOfRequest())?.next).toBeNull();
    await throughTheDoor(`${P}/code`);
    expect((await adminDoorOfRequest())?.next).toBeNull();
  });
});

describe('where the guard sends an admin who must type a code', () => {
  it('behind the door: the code page under the secret address, with the address asked for', async () => {
    await throughTheDoor(`${P}/quizzes?site=anime`);
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${P}/code?next=${encodeURIComponent(`${P}/quizzes?site=anime`)}`);
  });

  it('behind the door with no address asked for: the bare code page', async () => {
    await throughTheDoor();
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${P}/code`);
  });

  it('the same for a session that is aal2 but whose code is older than 12 hours', async () => {
    await throughTheDoor(`${P}/journal`);
    s.auth = { user: { id: 'admin-1' }, aal: 'aal2', totpAgeMs: 12 * H + 60_000 };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${P}/code?next=${encodeURIComponent(`${P}/journal`)}`);
    s.auth = { user: { id: 'admin-1' }, aal: 'aal2', totpAgeMs: 12 * H - 60_000 };
    await expect(requireAdmin()).resolves.toMatchObject({ user: { id: 'admin-1' } });
  });

  it('behind the door, setup while enrolment is open: the setup page under the secret address (no address to come back to)', async () => {
    await throughTheDoor(`${P}/quizzes`);
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: false };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${P}/setup`);
  });

  it('outside the door: the fixed pages of the kpop and anime admins, as before', async () => {
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT /admin/k7q2m/code');
    vi.stubEnv('ADMIN_MFA_ENROL_OPEN', '1');
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: false };
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT /admin/k7q2m/setup');
  });

  it('a forged door header sends nobody anywhere new: the fixed page, and a fan still gets the 404', async () => {
    s.headers = { [ADMIN_DOOR_HEADER]: 'forged', [ADMIN_DOOR_NEXT_HEADER]: `${P}/quizzes` };
    s.auth = { user: { id: 'admin-1' }, aal: 'aal1', factor: true };
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT /admin/k7q2m/code');
    s.auth = { user: { id: 'fan-9' }, aal: 'aal2' };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

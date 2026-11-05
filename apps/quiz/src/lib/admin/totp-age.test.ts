// ADMIN-2 (PLAN-ADMIN-2 section 5): a new TOTP code after 12 hours, on a frozen clock. The pure rule (totp-age.ts) first, then the guard that
// reads it (the local auth stand-in of test-support.ts: no account, no network, no real code). 11 h 59 passes, 12 h 01 asks for the code,
// a token without a dated `totp` entry is never a pass.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TOTP_MAX_AGE_MS, lastTotpAt, totpIsFresh } from './totp-age';

import type { AuthStubState } from './test-support';

const s = vi.hoisted(() => ({ auth: { user: null } as AuthStubState }));

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));
vi.mock('@/lib/supabase/server', async () => {
  const { stubAuth } = await import('./test-support');
  return { createServerClient: async () => ({ auth: stubAuth(() => s.auth) }) };
});

import { ADMIN_MFA_CODE_PATH, requireAdmin } from './guard';

const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);
const MIN = 60 * 1000;
const H = 60 * MIN;
const at = (msAgo: number): { method: string; timestamp: number } => ({ method: 'totp', timestamp: Math.floor((NOW - msAgo) / 1000) });

describe('totp-age: the rule', () => {
  it('is 12 hours', () => {
    expect(TOTP_MAX_AGE_MS).toBe(12 * H);
  });

  it('11 h 59 is fresh, exactly 12 h is the last good second, 12 h 01 is not', () => {
    expect(totpIsFresh([at(11 * H + 59 * MIN)], NOW)).toBe(true);
    expect(totpIsFresh([at(12 * H)], NOW)).toBe(true);
    expect(totpIsFresh([at(12 * H + MIN)], NOW)).toBe(false);
    expect(totpIsFresh([at(24 * H)], NOW)).toBe(false);
  });

  it('a token with no totp entry is not fresh: nothing, a password entry only, a bare string, a dateless entry', () => {
    expect(totpIsFresh([], NOW)).toBe(false);
    expect(totpIsFresh(undefined, NOW)).toBe(false);
    expect(totpIsFresh(null, NOW)).toBe(false);
    expect(totpIsFresh('totp', NOW)).toBe(false);
    expect(totpIsFresh([{ method: 'password', timestamp: Math.floor(NOW / 1000) }], NOW)).toBe(false);
    expect(totpIsFresh(['totp', 'password'], NOW)).toBe(false);
    expect(totpIsFresh([{ method: 'totp' }], NOW)).toBe(false);
    expect(totpIsFresh([{ method: 'totp', timestamp: 'now' }], NOW)).toBe(false);
    expect(totpIsFresh([{ method: 'totp', timestamp: 0 }], NOW)).toBe(false);
    expect(totpIsFresh([{ method: 'totp', timestamp: Number.NaN }], NOW)).toBe(false);
  });

  it('a password entry never stands in for a code, however fresh', () => {
    expect(totpIsFresh([{ method: 'password', timestamp: Math.floor(NOW / 1000) }, at(13 * H)], NOW)).toBe(false);
  });

  it('the newest totp entry counts, and mfa/totp is a totp entry too', () => {
    expect(lastTotpAt([at(20 * H), at(2 * H), at(30 * H)])).toBe(Math.floor((NOW - 2 * H) / 1000) * 1000);
    expect(totpIsFresh([at(20 * H), at(2 * H)], NOW)).toBe(true);
    expect(totpIsFresh([{ method: 'mfa/totp', timestamp: Math.floor((NOW - H) / 1000) }], NOW)).toBe(true);
  });

  it('a time in the future is believed up to a minute of clock drift, not more', () => {
    expect(totpIsFresh([at(-30 * 1000)], NOW)).toBe(true);
    expect(totpIsFresh([at(-5 * MIN)], NOW)).toBe(false);
  });
});

describe('requireAdmin on a frozen clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  const ADMIN = { id: 'admin-1' };

  it('a code typed 11 h 59 ago passes: page, route, check, mfa', async () => {
    s.auth = { user: ADMIN, aal: 'aal2', totpAgeMs: 11 * H + 59 * MIN };
    await expect(requireAdmin()).resolves.toMatchObject({ user: ADMIN });
    expect((await requireAdmin('api')).ok).toBe(true);
    expect(await requireAdmin('check')).not.toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('pass');
  });

  it('the same session 12 h 01 after its code asks for the code again: the page redirects, the route answers 404, check is null', async () => {
    s.auth = { user: ADMIN, aal: 'aal2', totpAgeMs: 12 * H + MIN };
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_CODE_PATH}`);
    const gate = await requireAdmin('api');
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.res.status).toBe(404);
      expect(await gate.res.json()).toEqual({ error: 'Not found.', code: 'not_found' });
    }
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
  });

  it('the clock decides, not the session: one token typed at NOW passes at +11 h 59 and asks at +12 h 01', async () => {
    s.auth = { user: ADMIN, aal: 'aal2', totpAtMs: NOW };
    expect((await requireAdmin('mfa'))?.level).toBe('pass');
    vi.setSystemTime(NOW + 11 * H + 59 * MIN);
    expect((await requireAdmin('mfa'))?.level).toBe('pass');
    vi.setSystemTime(NOW + 12 * H + MIN);
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
    expect(await requireAdmin('check')).toBeNull();
  });

  it('an aal2 token with no totp entry is refused: no pass, no route, the code step for a page', async () => {
    s.auth = { user: ADMIN, aal: 'aal2', totpAgeMs: null };
    expect(await requireAdmin('check')).toBeNull();
    expect((await requireAdmin('api')).ok).toBe(false);
    expect((await requireAdmin('mfa'))?.level).toBe('challenge');
    await expect(requireAdmin()).rejects.toThrow(`NEXT_REDIRECT ${ADMIN_MFA_CODE_PATH}`);
  });

  it('a stale session is no better for a Verse curator decision: adminPowerFor is false', async () => {
    const { adminPowerFor } = await import('./guard');
    s.auth = { user: ADMIN, aal: 'aal2', totpAgeMs: 13 * H };
    expect(await adminPowerFor('admin-1')).toBe(false);
    s.auth = { user: ADMIN, aal: 'aal2', totpAgeMs: H };
    expect(await adminPowerFor('admin-1')).toBe(true);
  });

  it('a non admin is still the 404, a fresh totp entry or not', async () => {
    s.auth = { user: { id: 'fan-9' }, aal: 'aal2', totpAgeMs: 0 };
    await expect(requireAdmin()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

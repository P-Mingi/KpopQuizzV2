// Private launch: GET /auth/private-launch and /auth/private-launch/leave (the route handlers enter/ and leave/ of this folder, through
// lib/private-launch/enter.ts). The session is a stand-in for the server client's getUser; no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRIVATE_COOKIE, expectedCookie } from '@/lib/private-launch/config';

const state = vi.hoisted(() => ({ site: 'hub' as string, user: null as string | null, throws: false, calls: 0 }));
vi.mock('@/lib/site/registry', async (orig) => {
  const real = await orig<typeof import('@/lib/site/registry')>();
  return { ...real, get SITE_ID() { return state.site; } };
});
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: async () => {
        state.calls += 1;
        if (state.throws) throw new Error('auth server down');
        return { data: { user: state.user ? { id: state.user } : null }, error: null };
      },
    },
  }),
}));

import * as enter from './enter/route';
import * as leave from './leave/route';

const OWNER = '00000000-0000-4000-8000-00000000000a';
const OTHER = '00000000-0000-4000-8000-0000000000ff';
const KEY = 'cd'.repeat(32);
const EXPECTED = expectedCookie(KEY, new Set([OWNER]));
const CLEARED = `${PRIVATE_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;

function stubGate(on: Partial<Record<'PRIVATE_LAUNCH' | 'PRIVATE_LAUNCH_ALLOW' | 'PRIVATE_LAUNCH_KEY', string>>): void {
  vi.stubEnv('PRIVATE_LAUNCH', on.PRIVATE_LAUNCH ?? '');
  vi.stubEnv('PRIVATE_LAUNCH_ALLOW', on.PRIVATE_LAUNCH_ALLOW ?? '');
  vi.stubEnv('PRIVATE_LAUNCH_KEY', on.PRIVATE_LAUNCH_KEY ?? '');
}
const FULL = { PRIVATE_LAUNCH: '1', PRIVATE_LAUNCH_ALLOW: OWNER, PRIVATE_LAUNCH_KEY: KEY };

beforeEach(() => { state.site = 'hub'; state.user = null; state.throws = false; state.calls = 0; stubGate(FULL); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('GET /auth/private-launch', () => {
  it('an anonymous visitor goes to the sign-in page of the site, which comes back here; no cookie', async () => {
    const res = await enter.GET();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login?returnTo=%2Fauth%2Fprivate-launch');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('no-store');
    state.site = 'anime';
    expect((await enter.GET()).headers.get('location')).toBe('/anime/login?returnTo=%2Fauth%2Fprivate-launch');
  });

  it('the allowed account gets bv_private: HttpOnly, Secure, SameSite=Lax, Path=/, 30 days, and goes to the home', async () => {
    state.user = OWNER;
    const res = await enter.GET();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toBe(`${PRIVATE_COOKIE}=${EXPECTED}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
    // OtakuQuiz sets the same cookie (Path=/ covers bunnyverse.org and /anime) and goes to its own home.
    state.site = 'anime';
    const anime = await enter.GET();
    expect(anime.headers.get('location')).toBe('/anime');
    expect(anime.headers.get('set-cookie')).toBe(cookie);
  });

  it('a signed-in account that is NOT allowed lands on the home (Coming soon): same status, place and body, the cookie cleared', async () => {
    state.user = OWNER;
    const allowed = await enter.GET();
    state.user = OTHER;
    const refused = await enter.GET();
    expect(refused.status).toBe(allowed.status);
    expect(refused.headers.get('location')).toBe(allowed.headers.get('location'));
    expect(await refused.text()).toBe(await allowed.text());
    expect(refused.headers.get('set-cookie')).toBe(CLEARED);
    expect(refused.headers.get('set-cookie')).not.toContain(EXPECTED);
  });

  it('the redirect is a fixed path of the build, never a value of the request (no open redirect)', async () => {
    for (const user of [null, OWNER, OTHER]) {
      state.user = user;
      const loc = (await enter.GET()).headers.get('location')!;
      expect(['/', '/login?returnTo=%2Fauth%2Fprivate-launch']).toContain(loc);
    }
  });

  it('the auth server failing reads as not allowed: home, the cookie cleared', async () => {
    state.throws = true;
    const res = await enter.GET();
    expect(res.headers.get('location')).toBe('/');
    expect(res.headers.get('set-cookie')).toBe(CLEARED);
  });

  it('a gate that fails closed (no KEY, no ALLOW) lets nobody in, the listed account included', async () => {
    state.user = OWNER;
    for (const env of [{ ...FULL, PRIVATE_LAUNCH_KEY: '' }, { ...FULL, PRIVATE_LAUNCH_ALLOW: '' }, { ...FULL, PRIVATE_LAUNCH_KEY: 'short' }]) {
      stubGate(env);
      const res = await enter.GET();
      expect(res.headers.get('location')).toBe('/');
      expect(res.headers.get('set-cookie')).toBe(CLEARED);
    }
  });

  it('404 with the gate off and on the kpop build, before any session read', async () => {
    state.user = OWNER;
    stubGate({ PRIVATE_LAUNCH: '0', PRIVATE_LAUNCH_ALLOW: OWNER, PRIVATE_LAUNCH_KEY: KEY });
    expect((await enter.GET()).status).toBe(404);
    stubGate({ PRIVATE_LAUNCH_ALLOW: OWNER, PRIVATE_LAUNCH_KEY: KEY });
    expect((await enter.GET()).status).toBe(404);
    stubGate(FULL);
    state.site = 'kpop';
    expect((await enter.GET()).status).toBe(404);
    expect(state.calls).toBe(0);
  });
});

describe('GET /auth/private-launch/leave', () => {
  it('clears the cookie and goes home; 404 with the gate off and on kpop', async () => {
    const res = leave.GET();
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
    expect(res.headers.get('set-cookie')).toBe(CLEARED);
    stubGate({});
    expect(leave.GET().status).toBe(404);
    stubGate(FULL);
    state.site = 'kpop';
    expect(leave.GET().status).toBe(404);
  });
});

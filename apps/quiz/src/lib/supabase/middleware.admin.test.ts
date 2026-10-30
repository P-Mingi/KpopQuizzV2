// Run O1 (ADM join): /admin goes through the session branch of the middleware (its session is refreshed there). ADMIN-1 (owner, 2026-10-30):
// it is no longer a protected path: nobody is sent to /login (that redirect told anyone where the admin is). Anyone who is not a listed
// account gets the answer of an unknown URL (a rewrite to the site's 404); a listed account goes on to the page, whose requireAdmin decides
// (lib/admin/guard.ts, admin-lock.refusal.test.ts). /onboarding and /settings keep their redirect to /login.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }) }));

import { SITE_ID } from '@/lib/site/registry';

import { updateSession } from './middleware';

// Bunnyverse (owner, 2026-10-28): the anime build is served under the basePath '/anime', so on that build (a per-site run
// with NEXT_PUBLIC_SITE_ID=anime) its login page is /anime/login; on every other build it is /login, as before.
const LOGIN = SITE_ID === 'anime' ? '/anime/login' : '/login';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  auth.user = null;
});

const open = (path: string): Promise<Response> => updateSession(new NextRequest(`http://anime.localhost:3021${path}`));

describe('/admin on the session check', () => {
  const NOT_FOUND = SITE_ID === 'anime' ? '/anime/page-not-found' : '/page-not-found';
  const PATHS = ['/admin', '/admin?tab=images', '/admin?tab=overview', '/admin/reports', '/admin/k7q2m/code', '/admin/k7q2m/setup'];

  it.each(PATHS)('a signed-out visitor of %s gets the answer of an unknown URL, never /login', async (path) => {
    const res = await open(path);
    expect(res.headers.get('location')).toBeNull();
    expect(new URL(res.headers.get('x-middleware-rewrite') ?? 'http://x/none').pathname).toBe(NOT_FOUND);
  });

  it.each(PATHS)('a signed-in account that is not listed gets the same answer on %s', async (path) => {
    auth.user = { id: 'user-9' };
    const res = await open(path);
    expect(res.headers.get('location')).toBeNull();
    expect(new URL(res.headers.get('x-middleware-rewrite') ?? 'http://x/none').pathname).toBe(NOT_FOUND);
  });

  it('a path that only starts like /admin is not touched', async () => {
    const res = await open('/administrator');
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it.each(['/onboarding', '/settings', '/settings/account'])('still sends a signed-out visitor of %s to /login', async (path) => {
    const res = await open(path);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const to = new URL(res.headers.get('location') ?? '');
    expect(to.pathname).toBe(LOGIN);
    expect(to.searchParams.get('returnTo')).toBe(path);
    expect(await res.text()).toBe('');
  });

  it('lets a listed account through to the page (the page decides, with requireAdmin: verified, listed, aal2)', async () => {
    vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
    auth.user = { id: 'admin-1' };
    const res = await open('/admin');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

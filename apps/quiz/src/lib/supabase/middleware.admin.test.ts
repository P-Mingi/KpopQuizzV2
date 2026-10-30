// Run O1 (ADM join): /admin goes through the session branch of the middleware (its session is refreshed there). ADMIN-1 (owner, 2026-10-30):
// it is no longer a protected path: a signed-out visitor is never sent to /login (that redirect told anyone where the admin is); every request
// passes to the page, which answers the 404 of the site to everyone requireAdmin refuses (lib/admin/guard.ts, admin-lock.test.ts).
// /onboarding and /settings keep their redirect to /login.
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
  it.each(['/admin', '/admin?tab=images', '/admin?tab=overview', '/admin/reports', '/admin/k7q2m/code', '/admin/k7q2m/setup'])('never sends a signed-out visitor of %s to /login: the request goes on to the page (its 404)', async (path) => {
    const res = await open(path);
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
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

  it('lets a signed-in account through to the page (the page decides, with a 404, who is an admin)', async () => {
    auth.user = { id: 'user-9' };
    const res = await open('/admin');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

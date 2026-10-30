// Run O1 (ADM join): /admin is behind the session check of the middleware. A signed-out visitor is sent to /login (a redirect with no body: the
// page, its tabs and its API are not read, nothing about the admin is shown); a signed-in account passes to the page, which answers the 404 of
// the site to every account that is not in ADMIN_USER_IDS (app/sites/[site]/(anime)/admin/admin.site.test.ts).
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
  it.each(['/admin', '/admin?tab=images', '/admin?tab=overview', '/admin/reports'])('sends a signed-out visitor of %s to /login and shows nothing', async (path) => {
    const res = await open(path);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const to = new URL(res.headers.get('location') ?? '');
    expect(to.pathname).toBe(LOGIN);
    expect(to.searchParams.get('returnTo')).toBe(new URL(path, 'http://x').pathname);
    expect(await res.text()).toBe('');
  });

  it('lets a signed-in account through to the page (the page decides, with a 404, who is an admin)', async () => {
    auth.user = { id: 'user-9' };
    const res = await open('/admin');
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

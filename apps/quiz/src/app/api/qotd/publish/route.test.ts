import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The admin page /admin/quiz-bank calls this route from the browser (a session
// cookie, no secret); the cron secret is the other door. A cron header alone is not.

const state = vi.hoisted(() => ({ user: null as { id: string } | null, aal: 'aal2' as 'aal1' | 'aal2', rpcCalls: 0 }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => { state.rpcCalls++; return { data: 'quiz-of-the-day-id', error: null }; },
  }),
}));
// ADMIN-1: the real guard (lib/admin/guard.ts): admin-user is the listed admin, its session at state.aal (aal2 by default).
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user, aal: state.aal })) }),
}));
vi.mock('@/lib/quiz-bank-scheduling', () => ({ qotdRotationFixEnabled: () => false }));
vi.mock('@/lib/ux-v1/p1/qotd-rotation', () => ({ rotateQotd: vi.fn(), supabaseQotdStore: vi.fn() }));

import { GET } from './route';

const call = (headers: Record<string, string> = {}): Promise<Response> =>
  GET(new NextRequest('https://kpopquiz.org/api/qotd/publish?date=2026-10-01', { headers }));

describe('GET /api/qotd/publish authorization', () => {
  beforeEach(() => {
    state.user = null;
    state.aal = 'aal2';
    state.rpcCalls = 0;
    process.env.ADMIN_USER_IDS = 'admin-user';
    process.env.CRON_SECRET = 'unit-test-cron-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'not-a-credential-unit-test-placeholder';
  });

  // ADMIN-1 (owner, 2026-10-30): every refusal is the admin 404, never a 401.
  it('a visitor with no secret and no session gets 404 and nothing runs', async () => {
    const res = await call();
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('the x-vercel-cron header alone gets 404', async () => {
    const res = await call({ 'x-vercel-cron': '1' });
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('a wrong secret gets 404', async () => {
    const res = await call({ authorization: 'Bearer wrong' });
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('a signed-in fan who is not an admin gets 404', async () => {
    state.user = { id: 'some-fan' };
    const res = await call();
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('an admin session at aal1 (no TOTP code yet) gets 404 and nothing runs', async () => {
    state.user = { id: 'admin-user' };
    state.aal = 'aal1';
    const res = await call();
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('the cron secret publishes', async () => {
    const res = await call({ authorization: 'Bearer unit-test-cron-secret' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, quiz_id: 'quiz-of-the-day-id', date: '2026-10-01' });
    expect(state.rpcCalls).toBe(1);
  });

  it('an admin session at aal2 publishes without any secret (the /admin/quiz-bank button)', async () => {
    state.user = { id: 'admin-user' };
    // The button is a same-origin fetch GET: no Origin, and the browser's own Sec-Fetch-Site.
    const res = await call({ 'sec-fetch-site': 'same-origin' });
    expect(res.status).toBe(200);
    expect(state.rpcCalls).toBe(1);
  });

  it('an admin session on a link from another site gets 404 and nothing runs', async () => {
    state.user = { id: 'admin-user' };
    const res = await call({ 'sec-fetch-site': 'cross-site' });
    expect(res.status).toBe(404);
    expect(state.rpcCalls).toBe(0);
  });

  it('with no CRON_SECRET configured the secret door is closed, the admin door still works', async () => {
    delete process.env.CRON_SECRET;
    expect((await call({ authorization: 'Bearer undefined' })).status).toBe(404);
    state.user = { id: 'admin-user' };
    expect((await call({ 'sec-fetch-site': 'same-origin' })).status).toBe(200);
  });
});

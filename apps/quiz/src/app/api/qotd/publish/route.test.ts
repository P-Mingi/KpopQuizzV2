import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The admin page /admin/quiz-bank calls this route from the browser (a session
// cookie, no secret); the cron secret is the other door. A cron header alone is not.

const state = vi.hoisted(() => ({ user: null as { id: string } | null, rpcCalls: 0 }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => { state.rpcCalls++; return { data: 'quiz-of-the-day-id', error: null }; },
  }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock('@/lib/admin', () => ({ isAdmin: (id: string) => id === 'admin-user' }));
vi.mock('@/lib/quiz-bank-scheduling', () => ({ qotdRotationFixEnabled: () => false }));
vi.mock('@/lib/ux-v1/p1/qotd-rotation', () => ({ rotateQotd: vi.fn(), supabaseQotdStore: vi.fn() }));

import { GET } from './route';

const call = (headers: Record<string, string> = {}): Promise<Response> =>
  GET(new NextRequest('https://kpopquiz.org/api/qotd/publish?date=2026-10-01', { headers }));

describe('GET /api/qotd/publish authorization', () => {
  beforeEach(() => {
    state.user = null;
    state.rpcCalls = 0;
    process.env.CRON_SECRET = 'unit-test-cron-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'not-a-credential-unit-test-placeholder';
  });

  it('a visitor with no secret and no session gets 401 and nothing runs', async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toBe(0);
  });

  it('the x-vercel-cron header alone gets 401', async () => {
    const res = await call({ 'x-vercel-cron': '1' });
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toBe(0);
  });

  it('a wrong secret gets 401', async () => {
    const res = await call({ authorization: 'Bearer wrong' });
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toBe(0);
  });

  it('a signed-in fan who is not an admin gets 401', async () => {
    state.user = { id: 'some-fan' };
    const res = await call();
    expect(res.status).toBe(401);
    expect(state.rpcCalls).toBe(0);
  });

  it('the cron secret publishes', async () => {
    const res = await call({ authorization: 'Bearer unit-test-cron-secret' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, quiz_id: 'quiz-of-the-day-id', date: '2026-10-01' });
    expect(state.rpcCalls).toBe(1);
  });

  it('an admin session publishes without any secret (the /admin/quiz-bank button)', async () => {
    state.user = { id: 'admin-user' };
    const res = await call();
    expect(res.status).toBe(200);
    expect(state.rpcCalls).toBe(1);
  });

  it('with no CRON_SECRET configured the secret door is closed, the admin door still works', async () => {
    delete process.env.CRON_SECRET;
    expect((await call({ authorization: 'Bearer undefined' })).status).toBe(401);
    state.user = { id: 'admin-user' };
    expect((await call()).status).toBe(200);
  });
});

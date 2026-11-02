// Run O1, lot (e) part 1 (K1): the manual publish trigger per site: kpop keeps ensure_daily_quiz(p_date); the anime build
// publishes the anime quiz of the day through ensure_daily_quiz_v2 (never the kpop wrapper).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ rpcs: [] as Array<{ fn: string; args: unknown }>, data: 'quiz-of-the-day-id' as string | null }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async (fn: string, args: unknown) => { state.rpcs.push({ fn, args }); return { data: state.data, error: null }; },
  }),
}));
// ADMIN-1: the real guard (lib/admin/guard.ts): admin-user is the listed admin (ADMIN_USER_IDS below), its session at aal2.
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: { id: 'admin-user' } })) }),
}));

async function get(site: string): Promise<Response> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('QOTD_ROTATION_FIX', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'not-a-credential-unit-test-placeholder');
  vi.stubEnv('ADMIN_USER_IDS', 'admin-user');
  const { GET } = await import('./route');
  return GET(new NextRequest('https://example.test/api/qotd/publish?date=2026-10-01', { headers: { 'sec-fetch-site': 'same-origin' } }));
}

beforeEach(() => { state.rpcs = []; state.data = 'quiz-of-the-day-id'; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('GET /api/qotd/publish per site', () => {
  it('kpop build: ensure_daily_quiz with p_date only', async () => {
    const res = await get('');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, quiz_id: 'quiz-of-the-day-id', date: '2026-10-01' });
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-01' } }]);
  });

  it('anime build: ensure_daily_quiz_v2 with p_site anime', async () => {
    const res = await get('anime');
    expect(res.status).toBe(200);
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-01', p_site: 'anime' } }]);
  });

  it('nothing scheduled: 404 on both builds', async () => {
    state.data = null;
    expect((await get('')).status).toBe(404);
    expect((await get('anime')).status).toBe(404);
  });
});

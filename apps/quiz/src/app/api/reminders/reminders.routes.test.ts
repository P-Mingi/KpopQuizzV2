// Audit 01 P2-10 at the routes: an under-15 (box unticked) cannot subscribe, flag off answers 404, and the hourly cron sends nothing
// for a played day. fetch is a spy that must stay unused for those cases: no mail leaves this test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rows: { user_id: string; hour_utc: number; confirmed_at: string; last_sent_on: string | null }[] = [{ user_id: '11111111-1111-1111-1111-111111111111', hour_utc: 18, confirmed_at: '2026-11-01T00:00:00Z', last_sent_on: null }];
let lastDaily: string | null = null;
const updates: unknown[] = [];

vi.mock('@/lib/cron-auth', () => ({ isCronAuthorized: () => true, cronForSite: () => null }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: '11111111-1111-1111-1111-111111111111', email: 'x@example.com' } } }) } }),
  createServiceRoleClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {};
      for (const k of ['select', 'not', 'eq', 'or', 'limit', 'upsert']) q[k] = () => q;
      q.update = (a: unknown) => { updates.push(a); return q; };
      q.maybeSingle = async () => ({ data: table === 'profiles' ? { last_daily_date: lastDaily } : null, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: table === 'daily_reminders' ? rows : null, error: null });
      return q;
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'x@example.com' } } }) } },
  }),
}));

const fetchSpy = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchSpy); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-09T18:05:00Z')); updates.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); fetchSpy.mockReset(); });

const post = (body: unknown) => new NextRequest('https://kpopquiz.org/api/reminders', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/reminders', () => {
  it('flag off: 404 and nothing happens', async () => {
    const { POST } = await import('./route');
    expect((await POST(post({ hour: 18, age15: true }))).status).toBe(404);
  });
  it('flag on, 15 or older box not ticked: 403, no mail', async () => {
    vi.stubEnv('DAILY_REMINDERS', '1');
    const { POST } = await import('./route');
    expect((await POST(post({ hour: 18, age15: false }))).status).toBe(403);
    expect((await POST(post({ hour: 18 }))).status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/daily-reminders', () => {
  it('flag off: skipped', async () => {
    const { GET } = await import('../cron/daily-reminders/route');
    expect(await (await GET(new NextRequest('https://kpopquiz.org/api/cron/daily-reminders'))).json()).toMatchObject({ skipped: 'flag_off' });
  });
  it('a played day sends nothing', async () => {
    vi.stubEnv('DAILY_REMINDERS', '1');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('CRON_SECRET', 'secret');
    lastDaily = '2026-11-09';
    const { GET } = await import('../cron/daily-reminders/route');
    const body = await (await GET(new NextRequest('https://kpopquiz.org/api/cron/daily-reminders'))).json();
    expect(body).toMatchObject({ sent: 0, skipped_played: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('not played: one mail is built for the sender spy (never the network), marked sent first', async () => {
    vi.stubEnv('DAILY_REMINDERS', '1');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('CRON_SECRET', 'secret');
    lastDaily = '2026-11-08';
    fetchSpy.mockResolvedValue({ ok: true });
    const { GET } = await import('../cron/daily-reminders/route');
    const body = await (await GET(new NextRequest('https://kpopquiz.org/api/cron/daily-reminders'))).json();
    expect(body).toMatchObject({ sent: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(updates).toContainEqual({ last_sent_on: '2026-11-09' });
  });
});

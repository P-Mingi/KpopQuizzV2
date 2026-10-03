import { describe, expect, it, vi } from 'vitest';

import { LIVE_OPEN_TTL_MS, liveAnswerSaysClosed, liveOpenChecker } from './open';

// F3 (issues C2-001, C2-002, C2-003): the one "is the live mode open" answer the
// pages use before they show a door to /live or /join. Fail closed, cached briefly,
// no read at all with the v12 flag off.

describe('liveOpenChecker', () => {
  it('flag off: false, and the probe never runs', async () => {
    const probe = vi.fn(async () => true);
    const open = liveOpenChecker({ enabled: () => false, probe });
    expect(await open()).toBe(false);
    expect(await open()).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it('open only when the probe answers true', async () => {
    expect(await liveOpenChecker({ enabled: () => true, probe: async () => true })()).toBe(true);
    expect(await liveOpenChecker({ enabled: () => true, probe: async () => false })()).toBe(false);
  });

  it('fails closed when the probe throws', async () => {
    const open = liveOpenChecker({ enabled: () => true, probe: async () => { throw new Error('network'); } });
    expect(await open()).toBe(false);
  });

  it('keeps the answer for the TTL, then asks again', async () => {
    let t = 1_000;
    let answer = false;
    const probe = vi.fn(async () => answer);
    const open = liveOpenChecker({ enabled: () => true, probe, now: () => t });
    expect(await open()).toBe(false);
    answer = true;
    t += LIVE_OPEN_TTL_MS - 1;
    expect(await open()).toBe(false);
    expect(probe).toHaveBeenCalledTimes(1);
    t += 1;
    expect(await open()).toBe(true);
    expect(probe).toHaveBeenCalledTimes(2);
  });
});

describe('isLiveOpen (lib/live/server)', () => {
  it('uses the GET /api/live probe and is false without any read when the flag is off', async () => {
    vi.resetModules();
    vi.doMock('@/lib/ux-v12', () => ({ isUxV12: () => false }));
    const make = vi.fn(() => { throw new Error('no database client with the flag off'); });
    vi.doMock('@/lib/supabase/server', () => ({ createServiceRoleClient: make }));
    const { isLiveOpen } = await import('./server');
    expect(await isLiveOpen()).toBe(false);
    expect(make).not.toHaveBeenCalled();
    vi.doUnmock('@/lib/ux-v12');
    vi.doUnmock('@/lib/supabase/server');
  });

  it('flag on but no Supabase key: false, no client built', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.doMock('@/lib/ux-v12', () => ({ isUxV12: () => true }));
    const make = vi.fn(() => { throw new Error('never built'); });
    vi.doMock('@/lib/supabase/server', () => ({ createServiceRoleClient: make }));
    const { isLiveOpen } = await import('./server');
    expect(await isLiveOpen()).toBe(false);
    expect(make).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    vi.doUnmock('@/lib/ux-v12');
    vi.doUnmock('@/lib/supabase/server');
  });
});

describe('liveAnswerSaysClosed (the join page, C2-003)', () => {
  it('closed on 503 not_live and on 404, open otherwise', () => {
    expect(liveAnswerSaysClosed({ ok: false, status: 503, error: 'not_live' })).toBe(true);
    expect(liveAnswerSaysClosed({ ok: false, status: 404, error: 'not_found' })).toBe(true);
    expect(liveAnswerSaysClosed({ ok: true, status: 200 })).toBe(false);
    expect(liveAnswerSaysClosed({ ok: false, status: 0, error: 'server_error' })).toBe(false);
    expect(liveAnswerSaysClosed({ ok: false, status: 500, error: 'server_error' })).toBe(false);
  });
});

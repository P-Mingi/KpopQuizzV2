import { afterEach, describe, expect, it, vi } from 'vitest';

// The ranked routes behind the UX flag: with the flag off every GET on /api/ranked/*
// is a 404 like any path that does not exist today (flag off = today's site).

async function load(flag: string): Promise<typeof import('./http')> {
  vi.stubEnv('NEXT_PUBLIC_UX_V1', flag);
  vi.resetModules();
  return import('./http');
}

// The first import of next/server + the Supabase clients is slow on a cold transform.
describe('POST-only routes answer GET', { timeout: 60_000 }, () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('404 with the flag off', async () => {
    const { postOnly } = await load('0');
    const res = postOnly();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('405 with the flag on, Allow: POST', async () => {
    const { postOnly } = await load('1');
    const res = postOnly();
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('every ranked route is 404 with the flag off, before any read', async () => {
    const { rankedRoute } = await load('0');
    let ran = false;
    const res = await rankedRoute('optional', async () => { ran = true; return {}; });
    expect(res.status).toBe(404);
    expect(ran).toBe(false);
  });
});

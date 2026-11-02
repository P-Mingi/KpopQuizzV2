// CR-021: GET /api/site-credits answers { show } for the footer's Credits link: the same for everyone, cached, fail closed.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ show: false, throws: false }));
vi.mock('@/lib/credits/site-credits', () => ({ siteHasCredits: async () => { if (state.throws) throw new Error('boom'); return state.show; } }));

import { GET, revalidate } from './route';

beforeEach(() => { state.show = false; state.throws = false; });

describe('GET /api/site-credits', () => {
  it('answers { show } with a public edge cache, and reads no cookie', async () => {
    state.show = true;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ show: true });
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(revalidate).toBe(21600);
    state.show = false;
    expect(await (await GET()).json()).toEqual({ show: false });
  });
});

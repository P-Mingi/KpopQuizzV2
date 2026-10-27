import { beforeEach, describe, expect, it, vi } from 'vitest';

const cacheCalls = vi.hoisted(() => [] as Array<{ keys: string[]; opts: { revalidate?: number; tags?: string[] } }>);
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown, keys: string[], opts: { revalidate?: number; tags?: string[] }) => { cacheCalls.push({ keys, opts }); return fn; },
}));

import { HUB_TTL, hubCached, resetHubLastGood } from './cache';

beforeEach(() => { resetHubLastGood(); vi.spyOn(console, 'error').mockImplementation(() => undefined); });

describe('hubCached', () => {
  it('caches one hour under a tag of its own', () => {
    hubCached('alpha', async () => 1);
    hubCached('beta', async () => 1, 300);
    expect(HUB_TTL).toBe(3600);
    expect(cacheCalls.find((c) => c.keys.includes('alpha'))?.opts).toEqual({ revalidate: 3600, tags: ['hub:alpha'] });
    expect(cacheCalls.find((c) => c.keys.includes('beta'))?.opts).toEqual({ revalidate: 300, tags: ['hub:beta'] });
  });

  it('returns the value, and null for an empty block', async () => {
    expect(await hubCached('v', async () => ({ a: 1 }))()).toEqual({ a: 1 });
    expect(await hubCached('n', async () => null)()).toBeNull();
  });

  it('never throws: a failing read gives null the first time', async () => {
    const get = hubCached('f1', async () => { throw new Error('db down'); });
    await expect(get()).resolves.toBeNull();
  });

  it('serves the last good value when the database fails afterwards, per argument', async () => {
    let fail = false;
    const get = hubCached('f2', async (n: number) => { if (fail) throw new Error('db down'); return n * 2; });
    expect(await get(2)).toBe(4);
    expect(await get(3)).toBe(6);
    fail = true;
    expect(await get(2)).toBe(4);
    expect(await get(3)).toBe(6);
    expect(await get(9)).toBeNull();
  });

  it('serves the last good value when the read hangs', async () => {
    vi.useFakeTimers();
    try {
      let hang = false;
      const get = hubCached('f3', async () => (hang ? new Promise<number>(() => undefined) : 7));
      expect(await get()).toBe(7);
      hang = true;
      const p = get();
      await vi.advanceTimersByTimeAsync(16_000);
      expect(await p).toBe(7);
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets the Next signals through (dynamic bailout, redirect)', async () => {
    const err = Object.assign(new Error('bail'), { digest: 'DYNAMIC_SERVER_USAGE' });
    const get = hubCached('f4', async () => { throw err; });
    await expect(get()).rejects.toBe(err);
  });
});

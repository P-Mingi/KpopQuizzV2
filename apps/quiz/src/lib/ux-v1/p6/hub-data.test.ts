import { beforeEach, describe, expect, it, vi } from 'vitest';

// C3-009: a failed read must never be cached. `unstable_cache` is replaced by a
// stand-in with Next's contract (a resolved value is kept per key and args, a
// rejected call is not), and the Supabase client by a scripted fake, so the tests
// prove that every hub read throws on a failure instead of returning a value that
// the cache would keep, and that the next call reads again.

const script: { count: number | null; error: { message: string } | null }[] = [];
/** Paged row reads (fetchAllRows): one entry per `.range()` call, in call order. */
const rows: { data: unknown[] | null; error: { message: string } | null }[] = [];
let reads = 0;

vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[]) => {
    const store = new Map<string, R>();
    return async (...args: A): Promise<R> => {
      const key = JSON.stringify([keyParts, args]);
      if (store.has(key)) return store.get(key) as R;
      const value = await fn(...args); // a rejection propagates and stores nothing
      store.set(key, value);
      return value;
    };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    // Every builder method returns the chain; awaiting it answers a head count,
    // `.range()` answers a page of rows.
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'like', 'gte']) chain[m] = () => chain;
    chain.range = () => Promise.resolve(rows.shift() ?? { data: null, error: { message: 'no rows script' } });
    chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      reads++;
      return Promise.resolve(script.shift() ?? { count: null, error: { message: 'no script' } }).then(res, rej);
    };
    return { from: () => chain };
  },
}));

const mod = await import('./hub-data');

beforeEach(() => { script.length = 0; rows.length = 0; reads = 0; });

describe('C3-009: a failed read is never cached', () => {
  it('today players: an error throws, is not stored, and the next call reads again', async () => {
    script.push({ count: null, error: { message: 'timeout' } }, { count: 12, error: null });
    await expect(mod.getTodayPlayers('2026-09-26')).rejects.toThrow('[p6 today players] timeout');
    await expect(mod.getTodayPlayers('2026-09-26')).resolves.toBe(12);
    await expect(mod.getTodayPlayers('2026-09-26')).resolves.toBe(12); // now cached
    expect(reads).toBe(2);
  });

  it('today players: 0 is a real count (early in the UTC day), a missing count throws', async () => {
    script.push({ count: 0, error: null });
    await expect(mod.readTodayPlayers('2026-09-27')).resolves.toBe(0);
    script.push({ count: null, error: null });
    await expect(mod.readTodayPlayers('2026-09-27')).rejects.toThrow('no count');
  });

  it('today players are keyed by the UTC day: a new day never reads yesterday\'s entry', async () => {
    script.push({ count: 5, error: null }, { count: 1, error: null });
    await expect(mod.getTodayPlayers('2026-09-28')).resolves.toBe(5);
    await expect(mod.getTodayPlayers('2026-09-29')).resolves.toBe(1);
    expect(mod.utcDay(new Date('2026-09-26T23:59:59Z'))).toBe('2026-09-26');
  });

  it('song count: an error or 0 songs throws and is not stored', async () => {
    script.push({ count: 0, error: null }, { count: null, error: { message: 'down' } }, { count: 4120, error: null });
    await expect(mod.getSongCount()).rejects.toThrow('empty read');
    await expect(mod.getSongCount()).rejects.toThrow('down');
    await expect(mod.getSongCount()).resolves.toBe(4120);
    await expect(mod.getSongCount()).resolves.toBe(4120);
    expect(reads).toBe(3);
  });

  it('popularity: a PostgREST error or an empty groups read throws and is not stored', async () => {
    // Call order of the three paged reads: blind_test_plays, quizzes, groups.
    rows.push({ data: [], error: null }, { data: [{ group_id: 1, play_count: 9 }], error: null }, { data: null, error: { message: 'groups down' } });
    await expect(mod.getGroupPopularity()).rejects.toThrow('groups down');
    rows.push({ data: [], error: null }, { data: [{ group_id: 1, play_count: 9 }], error: null }, { data: [], error: null });
    await expect(mod.getGroupPopularity()).rejects.toThrow('empty read');
    rows.push({ data: [{ mode_id: 'group-bts' }], error: null }, { data: [{ group_id: 1, play_count: 9 }], error: null }, { data: [{ id: 1, slug: 'bts' }], error: null });
    await expect(mod.getGroupPopularity()).resolves.toEqual({ blindtest: { bts: 1 }, quiz: { bts: 9 } });
  });

  it('settle: a failed or slow read gives the fail-soft value with ok = false; a good one ok = true', async () => {
    await expect(mod.settle(() => Promise.reject(new Error('x')), 0)).resolves.toEqual({ value: 0, ok: false });
    await expect(mod.settle(() => new Promise<number>((r) => setTimeout(() => r(9), 50)), 0, 10)).resolves.toEqual({ value: 0, ok: false });
    await expect(mod.settle(() => Promise.resolve(7), 0)).resolves.toEqual({ value: 7, ok: true });
  });

  it('a production ISR regeneration with a failed read throws (Next keeps the last good copy); build and dev stay fail-soft', () => {
    expect(() => mod.keepLastGoodCopyOnFailure(['today'], { NODE_ENV: 'production', NEXT_PHASE: 'phase-production-server' })).toThrow('keeping the last good ISR copy');
    expect(() => mod.keepLastGoodCopyOnFailure(['today'], { NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).not.toThrow();
    expect(() => mod.keepLastGoodCopyOnFailure(['today'], { NODE_ENV: 'development' })).not.toThrow();
    expect(() => mod.keepLastGoodCopyOnFailure([], { NODE_ENV: 'production', NEXT_PHASE: 'phase-production-server' })).not.toThrow();
  });
});

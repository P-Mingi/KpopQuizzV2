// O1 audit 03 P1-3: a failed quizzes read throws, so the 6 hour cache never stores [] for a real group.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ result: { data: null, error: { message: 'boom' } } as { data: unknown; error: { message: string } | null }, reads: 0 }));

// A faithful unstable_cache: it memoizes what the function RETURNS, and stores nothing when it throws.
vi.mock('next/cache', () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => {
    const memo = new Map<string, R>();
    return async (...a: A): Promise<R> => {
      const k = JSON.stringify(a);
      if (memo.has(k)) return memo.get(k)!;
      const v = await fn(...a);
      memo.set(k, v);
      return v;
    };
  },
  revalidateTag: () => undefined,
}));
vi.mock('@/lib/supabase/server', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order', 'limit']) chain[m] = () => chain;
  chain.then = (res: (v: unknown) => unknown) => { db.reads++; return Promise.resolve(db.result).then(res); };
  const client = { from: () => chain };
  return { createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client };
});

import { getOverriddenFacts } from './facts';
import { hasTriviaPage } from '@/lib/db/queries/trivia';

beforeEach(() => { db.reads = 0; });

describe('getOverriddenFacts on a read error', () => {
  it('throws instead of answering []', async () => {
    db.result = { data: null, error: { message: 'boom' } };
    await expect(getOverriddenFacts(901, 'read-error-group')).rejects.toThrow(/quizzes read failed/);
  });

  it('does not cache the failure: the next call reads again and gets the real facts', async () => {
    db.result = { data: null, error: { message: 'boom' } };
    await expect(getOverriddenFacts(902, 'read-error-group-b')).rejects.toThrow();
    const failedReads = db.reads;
    db.result = { data: [], error: null };
    await expect(getOverriddenFacts(902, 'read-error-group-b')).resolves.toEqual([]);
    expect(db.reads, 'read again after the failure').toBe(failedReads + 1);
    await getOverriddenFacts(902, 'read-error-group-b');
    expect(db.reads, 'a real answer is cached').toBe(failedReads + 1);
  });

  it('a group with no published quiz is a real empty answer, not an error', async () => {
    db.result = { data: [], error: null };
    await expect(getOverriddenFacts(903, 'empty-group')).resolves.toEqual([]);
  });

  it('hasTriviaPage does not fail the hub when the read throws: false for this render', async () => {
    db.result = { data: null, error: { message: 'boom' } };
    await expect(hasTriviaPage(904, 'read-error-group-c')).resolves.toBe(false);
  });
});

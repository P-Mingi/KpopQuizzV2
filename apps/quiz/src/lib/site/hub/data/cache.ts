// Run O1, lot H2b: the cache of every block of the home. One hour (Plan, section 5), one tag per block (`hub:<block>`), computed
// once per hour and never on a visit. A block never throws at its caller: when the database fails, the last good value of this
// server instance is served, else null (the card then disappears). A failure is never cached: the read throws inside
// unstable_cache, so Next keeps no entry, and this wrapper answers from memory.

import { unstable_cache } from 'next/cache';

import { isNextInternalError } from '@/lib/error-handling';

/** One hour, the stats TTL of the app (lib/db/cache-policy.ts). */
export const HUB_TTL = 3600;
/** A block that takes longer than this is treated as failed (a saturated database must not hold the page). */
export const HUB_TIMEOUT_MS = 15_000;

const lastGood = new Map<string, unknown>();

/** Forgets the last good values (tests). */
export function resetHubLastGood(): void {
  lastGood.clear();
}

function withTimeout<T>(p: Promise<T>, ms: number, block: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`hub block ${block} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

/**
 * `read` throws on a database error and returns null for a legitimately empty block. The result is cached `revalidate` seconds
 * under the tag `hub:<block>`; the arguments are part of the cache key (use plain, serializable arguments).
 */
export function hubCached<A extends readonly unknown[], R>(
  block: string,
  read: (...args: A) => Promise<R | null>,
  revalidate: number = HUB_TTL,
): (...args: A) => Promise<R | null> {
  const cached = unstable_cache(read as unknown as (...args: unknown[]) => Promise<R | null>, ['hub-data', block], {
    revalidate,
    tags: [`hub:${block}`],
  });
  return async (...args: A): Promise<R | null> => {
    const key = `${block}:${JSON.stringify(args)}`;
    try {
      const value = await withTimeout(cached(...args), HUB_TIMEOUT_MS, block);
      lastGood.set(key, value);
      return value;
    } catch (err) {
      if (isNextInternalError(err)) throw err;
      console.error(`[hub:${block}]`, err instanceof Error ? err.message : err);
      return lastGood.has(key) ? (lastGood.get(key) as R | null) : null;
    }
  };
}

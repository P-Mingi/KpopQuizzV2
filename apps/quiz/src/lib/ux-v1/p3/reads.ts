// P3 fail-closed reads (C3, fix loop 1: "a failed read must not be written to the
// ISR / data cache"). The v11 groups pages are ISR (revalidate 1 h): a render
// that used a fallback because a read failed or timed out would be cached and
// served for an hour as the truth ("0 groups", a hub with no quizzes, an FAQ
// without its facts, a side column without today's links). So every read of a P3
// page goes through read(): a failure comes back as READ_FAILED instead of an
// empty value, and failClosed() then refuses to let that render be cached:
//   - at request time it throws: Next keeps serving the last good ISR page and
//     tries again on the next request (the same rule as lib/verse/space.ts:
//     "a failed CORE query must FAIL the render, not silently degrade it");
//   - during `next build` it does NOT throw (a DB blip must not fail a deploy):
//     the page renders what it has with a 60 s revalidate, so the degraded
//     prerender is replaced within a minute of traffic instead of an hour.
// Reads of today's lib/db/queries functions that swallow their own errors (they
// return null / [] and cache it) cannot be seen from here; only a throw or a
// timeout can. Those stay as they are today (not P3's files).

import { unstable_cache } from 'next/cache';

import { safeFetch } from '@/lib/error-handling';

export const READ_FAILED: unique symbol = Symbol('p3-read-failed');
export type ReadResult<T> = T | typeof READ_FAILED;

/** safeFetch with a failure marker instead of a fallback value. */
export function read<T>(promise: Promise<T>, label: string, timeoutMs?: number): Promise<ReadResult<T>> {
  return safeFetch<ReadResult<T>>(promise, READ_FAILED, label, timeoutMs);
}

/** Names of the reads that failed, in order. */
export function failedReads(results: Record<string, unknown>): string[] {
  return Object.entries(results).filter(([, v]) => v === READ_FAILED).map(([k]) => k);
}

/** The degraded-build revalidate (seconds). */
export const DEGRADED_BUILD_REVALIDATE = 60;

// Calling an unstable_cache entry with a short revalidate lowers the revalidate
// of the page being prerendered (Next: the route takes the shortest revalidate of
// the caches it read). The value itself is irrelevant.
const shortenPageRevalidate = unstable_cache(async () => 1, ['ux-v1:p3:degraded-build'], { revalidate: DEGRADED_BUILD_REVALIDATE });

export class FailedRenderError extends Error {
  constructor(where: string, failed: string[]) {
    super(`${where}: read(s) failed (${failed.join(', ')}); this render is not cached, the last good page stays`);
    this.name = 'FailedRenderError';
  }
}

/** Refuse to cache a render built on failed reads (see the header). */
export async function failClosed(where: string, failed: string[]): Promise<void> {
  if (failed.length === 0) return;
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn(`[p3] ${where}: read(s) failed at build (${failed.join(', ')}); prerendered with a ${DEGRADED_BUILD_REVALIDATE}s revalidate`);
    await shortenPageRevalidate();
    return;
  }
  throw new FailedRenderError(where, failed);
}

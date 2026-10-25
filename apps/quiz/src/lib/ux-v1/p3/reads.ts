// P3 reads (C3, fix loop 1: "a failed read must not be written to the ISR / data cache";
// owner, 2026-10-25: "never a 500"). The v11 groups pages are ISR (revalidate 1 h) and
// render on first hit (no build-time params), so a render built on a failed read used to
// throw to keep "the last good page": right after a deploy there is no last good page, and
// that throw was a 500 (the bursts of hub 500s after each deploy, when the cold caches send
// every read to the database at once). Now:
//   - every read goes through read(): a failure comes back as READ_FAILED instead of an
//     empty value, so the page knows what it is missing;
//   - readAll() runs a page's reads and tries the failed ones once more after a short pause
//     (the bursts last a few seconds);
//   - failClosed() then never throws: a render that still misses a read is served degraded
//     (the block of that read left out) with a 60 s revalidate instead of 1 h, at request
//     time as at build, so the full page replaces it within a minute of traffic. The price:
//     when the retry fails too, a stale good page is replaced by the degraded one for that
//     minute; never a 500.
// Reads of today's lib/db/queries functions that swallow their own errors (they return
// null / [] and cache it) cannot be seen from here; only a throw or a timeout can. Those
// stay as they are today (not P3's files).

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

/** The pause before a failed read is tried again (milliseconds). */
export const READ_RETRY_DELAY_MS = 750;

/**
 * Runs every read of a page at once, then the failed ones once more after a short pause.
 * Each value is a thunk (it starts the read, through read()), so a retry is a fresh call.
 */
export async function readAll<R extends Record<string, () => Promise<unknown>>>(
  reads: R,
  retryDelayMs: number = READ_RETRY_DELAY_MS,
): Promise<{ [K in keyof R]: Awaited<ReturnType<R[K]>> }> {
  const keys = Object.keys(reads) as Array<keyof R>;
  const out = {} as { [K in keyof R]: Awaited<ReturnType<R[K]>> };
  await Promise.all(keys.map(async (k) => { out[k] = (await reads[k]!()) as Awaited<ReturnType<R[typeof k]>>; }));
  const failed = keys.filter((k) => out[k] === READ_FAILED);
  if (failed.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    await Promise.all(failed.map(async (k) => { out[k] = (await reads[k]!()) as Awaited<ReturnType<R[typeof k]>>; }));
  }
  return out;
}

/** The revalidate of a degraded render (seconds), at build and at request time. */
export const DEGRADED_BUILD_REVALIDATE = 60;

// Calling an unstable_cache entry with a short revalidate lowers the revalidate
// of the page being rendered (Next: the route takes the shortest revalidate of
// the caches it read). The value itself is irrelevant.
const shortenPageRevalidate = unstable_cache(async () => 1, ['ux-v1:p3:degraded-build'], { revalidate: DEGRADED_BUILD_REVALIDATE });

/** A render built on failed reads is served degraded with a 60 s revalidate, never a 500 (see the header). */
export async function failClosed(where: string, failed: string[]): Promise<void> {
  if (failed.length === 0) return;
  const phase = process.env.NEXT_PHASE === 'phase-production-build' ? 'at build' : 'after a retry';
  console.warn(`[p3] ${where}: read(s) failed ${phase} (${failed.join(', ')}); served degraded with a ${DEGRADED_BUILD_REVALIDATE}s revalidate`);
  await shortenPageRevalidate();
}

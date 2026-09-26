// The v11 home must never keep a render that lost a read (C3-003). Every read in
// home-data.ts throws inside unstable_cache, so the DATA cache never keeps a failed
// read; this module covers the PAGE cache. The home is static/ISR: a render whose
// read failed or timed out (safeFetch fallback, the section hides) would otherwise be
// written to the full-route cache and served, with its lost sections and links, for
// the whole revalidate window.
//
// What happens to such a render:
// - runtime regeneration (next start / Vercel): it THROWS. A failed static
//   regeneration keeps the last complete page in the cache and retries within 30 s
//   (next/dist/server/response-cache: handleRevalidate re-sets the previous entry
//   with revalidate <= 30); visitors keep the complete page.
// - build (the page must still build) and dev: it renders, and the render lowers
//   its own revalidate to DEGRADED_REVALIDATE_S, so the first request after that
//   regenerates it (unstable_cache lowers the prerender's revalidate, see
//   next/dist/server/web/spec-extension/unstable-cache.js).
// - a read that keeps failing in one server process for DEGRADED_HOLD_MS: the
//   degraded render is accepted with the short revalidate, so one broken section
//   cannot freeze the whole home (quiz of the day, lists) on an old render forever;
//   it keeps retrying every 30 s for a complete one.

import { unstable_cache } from 'next/cache';

import { safeFetch } from '@/lib/error-handling';

export const DEGRADED_REVALIDATE_S = 30;
export const DEGRADED_HOLD_MS = 15 * 60_000;

export type RenderPhase = 'build' | 'runtime' | 'dev';

export function renderPhase(env: Record<string, string | undefined> = process.env): RenderPhase {
  if (env.NEXT_PHASE === 'phase-production-build') return 'build';
  return env.NODE_ENV === 'production' ? 'runtime' : 'dev';
}

/** Pure: throw (keep the cached page) or render with a short revalidate. */
export function degradedAction(phase: RenderPhase, failingSinceMs: number, nowMs: number): 'throw' | 'short-cache' {
  return phase === 'runtime' && nowMs - failingSinceMs < DEGRADED_HOLD_MS ? 'throw' : 'short-cache';
}

/** Collects the reads of one render that failed or timed out. */
export class RenderHealth {
  readonly failed: string[] = [];

  /** safeFetch (5 s timeout, Next's internal errors re-thrown), remembering a failure. */
  async read<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
    const miss = Symbol('miss');
    const out = await safeFetch<T | typeof miss>(promise, miss, `[ux-home] ${label}`);
    if (out === miss) {
      this.failed.push(label);
      return fallback;
    }
    return out;
  }
}

// Per server process: when the current run of degraded renders started.
let failingSince: number | null = null;

/** Call once all reads of the render are done. Throws at runtime when a read failed. */
export async function settleRender(health: RenderHealth, now: number = Date.now()): Promise<void> {
  if (health.failed.length === 0) {
    failingSince = null;
    return;
  }
  failingSince ??= now;
  const action = degradedAction(renderPhase(), failingSince, now);
  if (action === 'throw') {
    throw new Error(`[ux-home] reads failed (${health.failed.join(', ')}): keeping the cached page, retry soon`);
  }
  console.warn(`[ux-home] reads failed (${health.failed.join(', ')}): rendered without them, revalidate in ${DEGRADED_REVALIDATE_S}s`);
  await unstable_cache(async () => DEGRADED_REVALIDATE_S, ['ux-v1:p1:degraded-render'], { revalidate: DEGRADED_REVALIDATE_S })();
}

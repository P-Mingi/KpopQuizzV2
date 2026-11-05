// ADMIN-2: the calling half of the cross-site revalidation (lib/admin/revalidate.ts holds the closed list). Server code only: it reads the
// shared secret from the environment and the target address from the site registry.
import { revalidateTag } from 'next/cache';

import { REGISTRY, SITE_ID } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import { REVALIDATE_PATH, isRevalidateTag } from './revalidate';

import type { RevalidateTag } from './revalidate';
import type { SiteId } from '@/lib/site/types';

export interface RevalidateResult {
  readonly site: SiteId;
  readonly revalidated: boolean;
  /** Why not: 'no_secret', 'bad_tags', 'refused', 'unreachable'. Absent when revalidated. */
  readonly reason?: 'no_secret' | 'bad_tags' | 'refused' | 'unreachable';
}

const TIMEOUT_MS = 4000;

/** The short word a journal line keeps for a revalidation: 'ok', or why it did not happen. */
export function cacheOutcome(r: RevalidateResult): string {
  return r.revalidated ? 'ok' : (r.reason ?? 'failed');
}

/** The shared secret, or null. The one reader of ADMIN_REVALIDATE_SECRET besides the route that checks it. */
export function revalidateSecret(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const v = (env.ADMIN_REVALIDATE_SECRET ?? '').trim();
  return v.length >= 24 ? v : null;
}

/**
 * Expires `tags` on the deployment that serves `site`. The site of this very build is expired in place; another site gets a POST to its own
 * route. Never throws.
 */
export async function revalidateSite(site: SiteId, tags: readonly RevalidateTag[], fetcher: typeof fetch = fetch): Promise<RevalidateResult> {
  const list = [...new Set(tags)];
  if (list.length === 0 || !list.every(isRevalidateTag)) return { site, revalidated: false, reason: 'bad_tags' };
  if (site === SITE_ID) {
    try {
      for (const tag of list) revalidateTag(tag, { expire: 0 });
      return { site, revalidated: true };
    } catch {
      return { site, revalidated: false, reason: 'unreachable' };
    }
  }
  const secret = revalidateSecret();
  if (secret === null) return { site, revalidated: false, reason: 'no_secret' };
  try {
    const res = await fetcher(`${REGISTRY[site].url}${REVALIDATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ tags: list }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? { site, revalidated: true } : { site, revalidated: false, reason: 'refused' };
  } catch {
    return { site, revalidated: false, reason: 'unreachable' };
  }
}

/** The same tags expired on every site: for a write to data the three sites share (a profile). One word for a journal line: 'ok' or the first reason. */
export async function revalidateEverywhere(tags: readonly RevalidateTag[], fetcher: typeof fetch = fetch): Promise<string> {
  const results = await Promise.all(SITE_IDS.map((site) => revalidateSite(site, tags, fetcher)));
  const bad = results.find((r) => !r.revalidated);
  return bad ? `${bad.site}:${bad.reason ?? 'failed'}` : 'ok';
}

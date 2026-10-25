// Run O1, lot H2b: Surprise me. The pool is the 200 best quizzes of the two sites by quality, 100 each (so both sites are always in it
// and "never twice in a row the same site" can hold); the draw itself is pickSurprise (surprise-pick.ts), played in the browser.
// A signed-in fan's played quiz ids come with the pool, read live and never cached with it, so a quiz just played leaves the draw.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import { loadCatalog, loadTiers, rankByQuality } from './catalog';
import { hubCached } from './cache';
import { resolveOrigins, siteName, toCard } from './util';

import type { Db } from './catalog';
import type { HubOpts, HubOrigins, HubSite, HubSurprise, HubSurpriseCard } from './types';

export const SURPRISE_PER_SITE = 100;
const MAX_PLAYED = 5000;

export async function readSurprisePool(origins: HubOrigins, now: Date, db: Db): Promise<HubSurpriseCard[] | null> {
  const [kpop, anime, tiers] = await Promise.all([loadCatalog(db, 'kpop'), loadCatalog(db, 'anime'), loadTiers(db)]);
  const pool: HubSurpriseCard[] = [];
  for (const [site, rows] of [['kpop', kpop], ['anime', anime]] as Array<[HubSite, typeof kpop]>) {
    for (const q of rankByQuality(rows, tiers).slice(0, SURPRISE_PER_SITE)) {
      const c = toCard(q, origins, now);
      pool.push({ id: c.id, site, siteName: siteName(site), tile: c.tile, title: c.title, group: c.group, href: c.href });
    }
  }
  return pool.length > 0 ? pool : null;
}

/** The quiz ids a signed-in fan played (at most 5000, the newest). A failed read gives none: the draw then simply does not exclude. */
export async function readPlayedIds(userId: string, db: ReturnType<typeof createServiceRoleClient>): Promise<string[]> {
  try {
    const rows = await fetchAllRows<{ quiz_id: string }>(() =>
      db.from('plays').select('quiz_id').eq('player_id', userId).order('created_at', { ascending: false }));
    return [...new Set(rows.map((r) => r.quiz_id))].slice(0, MAX_PLAYED);
  } catch {
    return [];
  }
}

const cachedPool = hubCached('surprise', (origins: HubOrigins) => readSurprisePool(origins, new Date(), createPublicReadClient()));

export interface SurpriseOpts extends HubOpts {
  /** The signed-in fan, checked by the caller. */
  readonly userId?: string | null;
}

/** The pool (cached one hour, tag hub:surprise) and the fan's played ids (live, never cached). */
export async function getSurprise(opts?: SurpriseOpts): Promise<HubSurprise | null> {
  const pool = await cachedPool(resolveOrigins(opts));
  if (!pool) return null;
  const playedIds = opts?.userId ? await readPlayedIds(opts.userId, createServiceRoleClient()) : [];
  const inPool = new Set(pool.map((c) => c.id));
  return { pool, playedIds: playedIds.filter((id) => inPool.has(id)) };
}


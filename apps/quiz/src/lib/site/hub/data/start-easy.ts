// Run O1, lot H2b: Start easy, the friendliest first quiz of each site, for a visitor who is not signed in (Plan.dc.html, section 3.B,
// "Deconnecte"): "le quiz facile le mieux note de chaque site". Easy, published, not reported; the best rated first (smoothed like rate,
// then the series tier on a site with no plays yet, see catalog.ts rankByQuality).

import { createPublicReadClient } from '@/lib/supabase/server';

import { loadCatalog, loadTiers, rankByQuality } from './catalog';
import { hubCached } from './cache';
import { resolveOrigins, toCard } from './util';

import type { Db } from './catalog';
import type { QuizRow } from './util';
import type { HubOpts, HubOrigins, HubStartEasy } from './types';

/** The best rated easy quiz among `rows` (any difficulty in, easy only out), or null. */
export function bestEasy(rows: readonly QuizRow[], tiers: ReadonlyMap<number, string>): QuizRow | null {
  const ranked = rankByQuality(rows, tiers);
  return ranked.find((q) => q.difficulty === 'easy') ?? null;
}

export async function readStartEasy(origins: HubOrigins, now: Date, db: Db): Promise<HubStartEasy | null> {
  const [kpop, anime, tiers] = await Promise.all([loadCatalog(db, 'kpop'), loadCatalog(db, 'anime'), loadTiers(db)]);
  const k = bestEasy(kpop, tiers);
  const a = bestEasy(anime, tiers);
  if (!k && !a) return null;
  return { kpop: k ? toCard(k, origins, now) : null, anime: a ? toCard(a, origins, now) : null };
}

const cached = hubCached('start-easy', (origins: HubOrigins) => readStartEasy(origins, new Date(), createPublicReadClient()));

/** Start easy (signed out), cached one hour (tag hub:start-easy). */
export async function getStartEasy(opts?: HubOpts): Promise<HubStartEasy | null> {
  return cached(resolveOrigins(opts));
}

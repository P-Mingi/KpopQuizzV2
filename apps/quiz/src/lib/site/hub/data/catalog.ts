// Run O1, lot H2b: the published catalog of a site as quiz rows, shared by Start easy, Surprise me, Crossover and For you.
// Reads go through forSite with the site named (the hub build always filters on site_id) and past the 1000 row cap (fetchAllRows).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';

import { ratingFor, QUIZ_SELECT, must, isListable } from './util';

import type { QuizRow } from './util';
import type { HubSite } from './types';

export type Db = ReturnType<typeof createPublicReadClient>;

/** Every published quiz of a site, listable ones only (not reported), by id order. */
export async function loadCatalog(db: Db, site: HubSite): Promise<QuizRow[]> {
  const rows = await fetchAllRows<QuizRow>(() =>
    forSite(db.from('quizzes').select(QUIZ_SELECT), site).eq('status', 'published').order('id'));
  return rows.filter(isListable);
}

const TIER_RANK: Readonly<Record<string, number>> = { A: 0, B: 1, C: 2 };

/** Series tier by group id, A to C (the editorial grade of an anime series). */
export async function loadTiers(db: Db): Promise<Map<number, string>> {
  const rows = must<Array<{ group_id: number; tier: string | null }>>(await db.from('series').select('group_id, tier').eq('published', true), 'series');
  const out = new Map<number, string>();
  for (const r of rows) if (r.tier) out.set(r.group_id, r.tier);
  return out;
}

/**
 * The quizzes of a site, best first: the smoothed like rate, then the series tier (anime: the only editorial grade stored), then the
 * lifetime plays, then the newest, then the id. A total order, so two reads of the same data rank the same.
 */
export function rankByQuality(rows: readonly QuizRow[], tiers: ReadonlyMap<number, string>): QuizRow[] {
  const rate = ratingFor(rows);
  const tier = (q: QuizRow): number => TIER_RANK[tiers.get(q.group_id) ?? ''] ?? 3;
  return [...rows].sort((a, b) =>
    rate(b) - rate(a)
    || tier(a) - tier(b)
    || (b.play_count ?? 0) - (a.play_count ?? 0)
    || Date.parse(b.created_at) - Date.parse(a.created_at)
    || (a.id < b.id ? -1 : 1));
}

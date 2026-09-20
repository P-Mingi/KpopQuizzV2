import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { getBrowseQuizzes, getQuizCardsByIds } from './quizzes';

import type { QuizCardData } from '@/lib/db/types';

// S2 steal #3: the most-played quizzes in a rolling window, from REAL plays,
// honesty-gated. No per-quiz windowed RPC exists, so we aggregate the window's
// plays in JS (paginated, since PostgREST caps a select at 1000 rows) using the
// plays_created_idx (created_at) index. Cheap at current volume and it only runs
// on ISR revalidation; at ~10x daily plays this should become a GROUP BY RPC or
// materialized view. Anon-readable (RLS), so it stays ISR-cacheable.

export type PopularWindow = 'today' | 'week' | 'month';

const WINDOW_MS: Record<PopularWindow, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};
const MIN_PLAYS = 3;           // window plays a quiz needs to qualify
const PARTIAL_MIN_QUIZZES = 3; // >= this many qualifiers -> honest smaller list
const FULL_MIN_QUIZZES = 6;    // >= this many -> the full window list
const DISPLAY_LIMIT = 24;      // max rows rendered
const CANDIDATE_FETCH = 50;    // top-N candidate ids resolved to cards

export interface PopularRow {
  card: QuizCardData;
  windowPlays: number; // 0 in the fallback state (no window claim)
}

export interface PopularResult {
  window: PopularWindow;
  generatedAt: string; // ISO, stamped on the page
  state: 'full' | 'partial' | 'fallback';
  rows: PopularRow[];
  rowsScanned: number; // plays aggregated over the window (query cost)
  qualifyingCount: number; // published quizzes with >= MIN_PLAYS this window
}

/** Paginate the window's plays and count by quiz. Returns rows scanned.
 *  FREE-VIABILITY: this is the single heaviest plays read in the app (it scans
 *  EVERY play row in the window, 1000 at a time), and it ran per render of
 *  /trending, /new and /most-liked - a /rest/v1/plays 503 magnet under nano load.
 *  It is cached below (keyed by the hour-quantized sinceIso) so the whole scan is
 *  one DB pass per hour per window instead of one per render. unstable_cache
 *  serializes the return, so the Map is returned as entries and rebuilt. */
async function aggregateWindowRaw(sinceIso: string): Promise<{ counts: Array<[string, number]>; scanned: number }> {
  const db = createPublicReadClient();
  const counts = new Map<string, number>();
  let from = 0;
  let scanned = 0;
  for (;;) {
    const { data } = await db
      .from('plays')
      .select('quiz_id')
      .gte('created_at', sinceIso)
      .order('id')
      .range(from, from + 999);
    const rows = (data ?? []) as Array<{ quiz_id: string }>;
    for (const r of rows) counts.set(r.quiz_id, (counts.get(r.quiz_id) ?? 0) + 1);
    scanned += rows.length;
    if (rows.length < 1000) break;
    from += 1000;
  }
  return { counts: [...counts.entries()], scanned };
}

const aggregateWindowCached = unstable_cache(
  aggregateWindowRaw,
  ['db:popular:aggregateWindow:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['plays'] },
);

async function aggregateWindow(sinceIso: string): Promise<{ counts: Map<string, number>; scanned: number }> {
  const { counts, scanned } = await aggregateWindowCached(sinceIso);
  return { counts: new Map(counts), scanned };
}

/**
 * States (honesty gates):
 *  - full:     >= FULL_MIN_QUIZZES quizzes cleared MIN_PLAYS -> real window top.
 *  - partial:  3-5 cleared -> the honest smaller list, never padded.
 *  - fallback: < 3 cleared -> labeled all-time favorites (window claim dropped).
 */
export async function getPopularQuizzes(window: PopularWindow, nowMs: number): Promise<PopularResult> {
  // FREE-VIABILITY: quantize the window START to the hour so the cached aggregate
  // key is stable under the crawl wave (a raw per-ms nowMs would make every call a
  // unique key = never a cache hit). A rolling 1/7/30-day window does not care
  // about sub-hour precision on its lower bound. generatedAt stays real-time (it is
  // just a display stamp).
  const hourMs = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const sinceIso = new Date(hourMs - WINDOW_MS[window]).toISOString();
  const generatedAt = new Date(nowMs).toISOString();

  const { counts, scanned } = await aggregateWindow(sinceIso);
  const candidates = [...counts.entries()]
    .filter(([, n]) => n >= MIN_PLAYS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); // deterministic ties

  const topIds = candidates.slice(0, CANDIDATE_FETCH).map(([id]) => id);
  const cards = await getQuizCardsByIds(topIds);
  const byId = new Map(cards.map((c) => [c.id, c]));

  // Published qualifiers, preserving window-plays-desc order.
  const qualified: PopularRow[] = candidates
    .slice(0, CANDIDATE_FETCH)
    .map(([id, n]) => { const card = byId.get(id); return card ? { card, windowPlays: n } : null; })
    .filter((r): r is PopularRow => r !== null);

  const qualifyingCount = qualified.length;

  if (qualifyingCount >= FULL_MIN_QUIZZES) {
    return { window, generatedAt, state: 'full', rows: qualified.slice(0, DISPLAY_LIMIT), rowsScanned: scanned, qualifyingCount };
  }
  if (qualifyingCount >= PARTIAL_MIN_QUIZZES) {
    return { window, generatedAt, state: 'partial', rows: qualified, rowsScanned: scanned, qualifyingCount };
  }
  // Not enough real window data: labeled all-time favorites instead of padding.
  const fallback = await getBrowseQuizzes({ sort: 'most_played', offset: 0, limit: DISPLAY_LIMIT });
  return {
    window,
    generatedAt,
    state: 'fallback',
    rows: fallback.map((card) => ({ card, windowPlays: 0 })),
    rowsScanned: scanned,
    qualifyingCount,
  };
}

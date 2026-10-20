// The one source of every public count on kpopquiz.org (SEO, owner 2026-10-14; rulebook
// docs/strategy/SKILL-kpopquiz-seo.md section 4). Pages, metadata, FAQ, JSON-LD and llms.txt
// read their numbers here and round them only through `atLeast`, so a number is the same
// everywhere on the same day. Before this, the home page said "380+" quizzes while the
// database held 455, /about said "42k+" plays for 73,277, and /bts-quiz said 31 for 27.
//
// Definitions (all real rows, read with the anon key like the pages themselves):
//   quizzes            published quizzes
//   groupsWithQuizzes  groups with at least one published quiz
//   groupsListed       every group in the directory (/groups)
//   songs              songs of the blind test catalogue: the pool generate reads (active,
//                      and curated when SONGS_IS_CURATED is on, as in production)
//   songGroups         groups with at least one of those songs
//   plays              finished quiz plays (rows of `plays`)
//   asOf               when these counts were read (ISO date-time)

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { forSite } from '@/lib/site/scope';

export interface PublicStats {
  quizzes: number;
  groupsWithQuizzes: number;
  groupsListed: number;
  songs: number;
  songGroups: number;
  plays: number;
  asOf: string;
}

/** Read every count. Throws on a failed read: callers decide (never cache a zero as a fact). */
export async function readPublicStats(): Promise<PublicStats> {
  const db = createPublicReadClient();
  const [quizzes, groupsListed, songs, plays, groupsWithQuizzes, songGroups] = await Promise.all([
    forSite(db.from('quizzes').select('id', { count: 'exact', head: true })).eq('status', 'published'),
    forSite(db.from('groups').select('id', { count: 'exact', head: true })),
    curatedOnly()
      ? forSite(db.from('songs').select('id', { count: 'exact', head: true })).eq('status', 'active').eq('is_curated', true)
      : forSite(db.from('songs').select('id', { count: 'exact', head: true })).eq('status', 'active'),
    db.from('plays').select('id', { count: 'exact', head: true }),
    // Distinct group ids from the rows themselves, paginated past the 1000-row cap (a few
    // thousand short rows, read at most once per cache window).
    distinctGroups(db, 'quizzes', 'published'),
    distinctGroups(db, 'songs', 'active'),
  ]);
  for (const r of [quizzes, groupsListed, songs, plays]) {
    if (r.error) throw new Error(`[site-stats] ${r.error.message}`);
  }
  return {
    quizzes: quizzes.count ?? 0,
    groupsWithQuizzes,
    groupsListed: groupsListed.count ?? 0,
    songs: songs.count ?? 0,
    songGroups,
    plays: plays.count ?? 0,
    asOf: new Date().toISOString(),
  };
}

/** The curated-subset switch of the blind test (generate reads only curated songs when on). */
const curatedOnly = (): boolean => process.env.SONGS_IS_CURATED === 'true';

async function distinctGroups(db: ReturnType<typeof createPublicReadClient>, table: 'quizzes' | 'songs', status: string): Promise<number> {
  const ids = new Set<number>();
  for (let from = 0; ; from += 1000) {
    const base = forSite(db.from(table).select('group_id')).eq('status', status).not('group_id', 'is', null);
    const q = table === 'songs' && curatedOnly() ? base.eq('is_curated', true) : base;
    const { data, error } = await q.order('id').range(from, from + 999);
    if (error) throw new Error(`[site-stats] ${table}: ${error.message}`);
    const rows = (data ?? []) as Array<{ group_id: number | null }>;
    for (const r of rows) if (r.group_id != null) ids.add(r.group_id);
    if (rows.length < 1000) break;
  }
  return ids.size;
}

/** Six hours: the same number on every page for most of a day, and a new quiz counted the same day. */
export const STATS_REVALIDATE = 21600;

export const getPublicStats = unstable_cache(readPublicStats, ['stats:public:v1'], { revalidate: STATS_REVALIDATE, tags: ['stats', 'quizzes'] });

/**
 * The shared rounding for public copy: a floor, so "N+" is always true.
 *   under 100        exact ("47")
 *   under 1,000      to the ten ("450+")
 *   under 10,000     to the hundred ("4,200+")
 *   10,000 and more  to the thousand ("73,000+")
 */
export function atLeast(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const v = floorShown(n);
  return v < 100 ? String(v) : `${v.toLocaleString('en-US')}+`;
}

/** The floored value `atLeast` prints, for copy in another language ("mais de 4.200"). */
export function floorShown(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  const v = Math.floor(n);
  if (v < 100) return v;
  const step = v < 1000 ? 10 : v < 10000 ? 100 : 1000;
  return Math.floor(v / step) * step;
}

/** Exact, with thousands separators ("73,425"). */
export function exact(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

/**
 * The counts, or null when they cannot be read within `timeoutMs` (a page then writes a
 * sentence without a number; it never shows a stale or invented one).
 */
export async function getPublicStatsOrNull(timeoutMs = 8000): Promise<PublicStats | null> {
  try {
    return await Promise.race([
      getPublicStats(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

/** Words for a token when the counts cannot be read: vague, and true. */
const TOKEN_FALLBACK: Record<string, string> = {
  quizzes: 'hundreds of', groups: 'dozens of', groupsListed: 'dozens of', songs: 'thousands of', songGroups: 'dozens of', plays: 'tens of thousands of',
};

/**
 * Fill the count tokens of a static text ("{quizzes} quizzes across {groups} groups") with
 * the live counts, rounded by atLeast. For copy kept as data (article FAQ answers and
 * descriptions), which cannot call the stats function itself. Unknown tokens stay as they are.
 */
export function fillStats(text: string, stats: PublicStats | null): string {
  return text.replace(/\{(quizzes|groups|groupsListed|songs|songGroups|plays)\}/g, (_m, key: string) => {
    if (!stats) return TOKEN_FALLBACK[key]!;
    const n = key === 'groups' ? stats.groupsWithQuizzes : (stats as unknown as Record<string, number>)[key]!;
    return atLeast(n);
  });
}

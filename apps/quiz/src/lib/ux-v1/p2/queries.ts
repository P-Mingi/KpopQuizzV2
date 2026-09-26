// Server reads for the v11 /quizzes browse (P2). Public data only (cookie-free
// client, RLS applies), every read cached at the stats TTL like the live page's
// reads (FREE-VIABILITY), and only called when NEXT_PUBLIC_UX_V1 is on.
//
// Parity by construction: a view the live page can show (no Level) is read with
// the live query itself (getBrowseQuizzes, same params, same cache entry), so the
// grid and the ItemList JSON-LD list the same quizzes in the same order as today.
// Only a Level view (new facet) is ordered here, from the facet rows.

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { getBrowseQuizzes, getQuizCardsByIds } from '@/lib/db/queries/quizzes';

import { P2_PAGE_SIZE, p2PageIds, toBrowseSort, typeDb } from './filters';

import type { QuizCardData } from '@/lib/db/types';
import type { P2FacetRow, P2Filters } from './filters';

interface RawFacetRow {
  id: string;
  quiz_type: string;
  difficulty: string;
  language: string | null;
  created_at: string;
  play_count: number | null;
  total_score_sum: number | null;
  total_completions: number | null;
  question_count: number | null;
  groups: { slug: string; name: string } | null;
}

/**
 * One small row per published quiz, with the SAME inner joins as the live card
 * query (groups!inner, profiles!inner), so every count here is a count of quizzes
 * the grid can show. Paginated past the 1000-row PostgREST cap (fetchAllRows), in
 * a stable order.
 */
async function fetchFacetRows(): Promise<P2FacetRow[]> {
  const supabase = createPublicReadClient();
  const rows = await fetchAllRows<RawFacetRow>(() => supabase
    .from('quizzes')
    .select('id, quiz_type, difficulty, language, created_at, play_count, total_score_sum, total_completions, question_count, groups!inner (slug, name), profiles!inner (username)')
    .eq('status', 'published')
    .order('id', { ascending: true }));
  return rows
    .filter((r) => r.groups !== null)
    .map((r) => ({
      id: r.id,
      type: r.quiz_type,
      difficulty: r.difficulty,
      language: r.language ?? '',
      groupSlug: (r.groups as { slug: string }).slug,
      groupName: (r.groups as { name: string }).name,
      created: Date.parse(r.created_at) || 0,
      plays: r.play_count ?? 0,
      scoreSum: r.total_score_sum ?? 0,
      completions: r.total_completions ?? 0,
      questions: r.question_count ?? 0,
    }));
}

/** Facet rows of every published quiz (about 25 KB per 100 quizzes), 1 h cache. */
export const getP2FacetRows = unstable_cache(
  fetchFacetRows,
  ['ux-v1:p2:facet-rows:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/** Card data of a Level page, in the order given (the DB returns them unordered). */
const getP2CardsByIds = unstable_cache(
  async (ids: string[]): Promise<QuizCardData[]> => {
    const cards = await getQuizCardsByIds(ids);
    const at = new Map(ids.map((id, i) => [id, i]));
    return cards.sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0));
  },
  ['ux-v1:p2:cards-by-ids:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/**
 * One page of the browse result. `groupId` is the resolved group's id (the live
 * query filters on group_id). Without Level: the live query, verbatim. With Level:
 * the page's ids from the facet rows, then their cards.
 */
export async function getP2Page(
  f: P2Filters,
  groupId: number | null,
  facetRows: readonly P2FacetRow[],
  now: number,
): Promise<QuizCardData[]> {
  if (f.level === null) {
    return getBrowseQuizzes({
      groupId,
      quizType: f.type ? typeDb(f.type) : null,
      language: f.lang,
      sort: toBrowseSort(f.sort),
      offset: (f.page - 1) * P2_PAGE_SIZE,
      limit: P2_PAGE_SIZE,
    });
  }
  const ids = p2PageIds(facetRows, f, now);
  if (ids.length === 0) return [];
  return getP2CardsByIds(ids);
}

/**
 * Pages 1..`last` of a result, each read exactly as that page alone would be (the
 * same cache entries as ?page=k), in parallel. /quizzes?page=N shows what "Load
 * more quizzes" shows after N-1 clicks: pages 1 to N.
 */
export async function getP2Pages(
  f: P2Filters,
  last: number,
  groupId: number | null,
  facetRows: readonly P2FacetRow[],
  now: number,
): Promise<QuizCardData[][]> {
  const pages = Array.from({ length: Math.max(0, last) }, (_, i) => i + 1);
  return Promise.all(pages.map((page) => getP2Page({ ...f, page }, groupId, facetRows, now)));
}

import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { SITE_ID } from '@/lib/site/registry';

import type { StoredExplanation } from '@/lib/quiz/answers';

// Verified explanations of one quiz (SEO strategy of 2026-10-27, phase 1): public.quiz_explanations,
// docs/pending-migrations/seo-quiz-explanations.sql and its lots. The public read policy returns only
// status 'verified'; the filter is repeated here. The table has no site_id: a row belongs to its quiz,
// which the page already read through forSite. Until the owner applies the SQL the table does not exist:
// that answers [] (the block shows answers and fun facts only). Any other error throws, so it is not
// cached and the page's safeFetch keeps rendering.
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

async function readQuizExplanations(quizId: string): Promise<StoredExplanation[]> {
  const { data, error } = await createPublicReadClient()
    .from('quiz_explanations')
    .select('q_index, question, answer, explanation, source_url')
    .eq('quiz_id', quizId)
    .eq('status', 'verified');
  if (error) {
    if (MISSING_TABLE.has(error.code ?? '')) return [];
    throw new Error(`quiz explanations: ${error.message}`);
  }
  return (data ?? []) as StoredExplanation[];
}

export const getQuizExplanations = unstable_cache(
  readQuizExplanations,
  ['db:quiz-explanations:v1', SITE_ID],
  { revalidate: CACHE_TTL.stats, tags: ['quiz-explanations', 'quizzes'] },
);

/**
 * Newest verified explanation per quiz (quiz id -> epoch ms), for the sitemap lastmod: a new verified
 * explanation is a material change of the quiz page (rulebook 2.6). Paged past the 1000-row cap. Empty
 * while the table does not exist; any other error throws (the sitemap then keeps created_at).
 */
export async function readExplanationDates(db = createPublicReadClient()): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('quiz_explanations')
      .select('quiz_id, created_at')
      .eq('status', 'verified')
      .order('quiz_id', { ascending: true })
      .order('q_index', { ascending: true })
      .range(from, from + 999);
    if (error) {
      if (MISSING_TABLE.has(error.code ?? '')) return out;
      throw new Error(`explanation dates: ${error.message}`);
    }
    const rows = (data ?? []) as Array<{ quiz_id: string; created_at: string }>;
    for (const r of rows) {
      const t = Date.parse(r.created_at);
      if (Number.isFinite(t) && t > (out.get(r.quiz_id) ?? 0)) out.set(r.quiz_id, t);
    }
    if (rows.length < 1000) return out;
  }
}

/** The lastmod of a quiz page: its creation, or its newest verified explanation when later. */
export function quizLastModified(createdAt: string, explainedAt: number | undefined): Date {
  const created = Date.parse(createdAt);
  return new Date(explainedAt !== undefined && explainedAt > created ? explainedAt : created);
}
